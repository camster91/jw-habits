package ca.ashbi.habittracker.widget;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Calendar;
import java.util.GregorianCalendar;
import java.util.Locale;

/**
 * The state shared between the app (WidgetBridgePlugin), the widget
 * (TodayWidgetProvider) and its check-in taps (CheckInReceiver): the
 * snapshot the app publishes and the queue of check-ins waiting for the app.
 * All three run in the app's process, so a class lock is enough.
 */
public final class WidgetStore {
    public static final String PREFS = "fd_widget";
    public static final String SNAPSHOT_KEY = "fd.snapshot";
    public static final String QUEUE_KEY = "fd.queue";
    private static final int ROLLOVER_HOUR = 3;
    private static final Object LOCK = new Object();

    private WidgetStore() {}

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public static void writeSnapshot(Context context, String json) {
        synchronized (LOCK) {
            SharedPreferences p = prefs(context);
            try {
                JSONObject snapshot = overlayPending(new JSONObject(json), parseArray(p.getString(QUEUE_KEY, null)));
                p.edit().putString(SNAPSHOT_KEY, snapshot.toString()).commit();
            } catch (JSONException ignored) {
                // An invalid app publish must not replace the last usable snapshot.
            }
        }
    }

    /** The stored snapshot, or null if none or unreadable. */
    public static JSONObject readSnapshot(Context context) {
        synchronized (LOCK) {
            String json = prefs(context).getString(SNAPSHOT_KEY, null);
            if (json == null) return null;
            try {
                return overlayPending(new JSONObject(json), parseArray(prefs(context).getString(QUEUE_KEY, null)));
            } catch (JSONException e) {
                return null;
            }
        }
    }

    /** Return the queued {routine, day} items and clear the queue. */
    public static JSONArray drainQueue(Context context) {
        synchronized (LOCK) {
            SharedPreferences p = prefs(context);
            JSONArray items = parseArray(p.getString(QUEUE_KEY, null));
            p.edit().remove(QUEUE_KEY).commit();
            return items;
        }
    }

    /**
     * Queue a check-in and tick it in the stored snapshot, but only if the
     * snapshot is for `day`, `day` is the current app day and the routine is
     * one of its items. Returns whether anything changed.
     */
    public static boolean checkIn(Context context, String routine, String day) {
        if (routine == null || day == null || !isCurrentDay(day, System.currentTimeMillis())) {
            return false;
        }
        synchronized (LOCK) {
            SharedPreferences p = prefs(context);
            String json = p.getString(SNAPSHOT_KEY, null);
            if (json == null) return false;
            try {
                JSONObject snapshot = new JSONObject(json);
                if (!day.equals(snapshot.optString("day"))) return false;
                JSONArray items = snapshot.optJSONArray("items");
                if (items == null) return false;
                boolean found = false;
                int done = 0;
                for (int i = 0; i < items.length(); i++) {
                    JSONObject item = items.optJSONObject(i);
                    if (item == null) continue;
                    if (routine.equals(item.optString("routine"))) {
                        item.put("done", true);
                        found = true;
                    }
                    if (item.optBoolean("done")) done++;
                }
                if (!found) return false;
                snapshot.put("doneCount", done);

                JSONArray queue = parseArray(p.getString(QUEUE_KEY, null));
                boolean queued = false;
                for (int i = 0; i < queue.length(); i++) {
                    JSONObject q = queue.optJSONObject(i);
                    if (q != null && routine.equals(q.optString("routine")) && day.equals(q.optString("day"))) {
                        queued = true;
                    }
                }
                if (!queued) {
                    JSONObject entry = new JSONObject();
                    entry.put("routine", routine);
                    entry.put("day", day);
                    queue.put(entry);
                }

                p.edit()
                    .putString(SNAPSHOT_KEY, snapshot.toString())
                    .putString(QUEUE_KEY, queue.toString())
                    .commit();
                return true;
            } catch (JSONException e) {
                return false;
            }
        }
    }

    /** Overlay pending ticks on incoming snapshots until the app drains them. */
    private static JSONObject overlayPending(JSONObject snapshot, JSONArray queue) throws JSONException {
        JSONArray items = snapshot.optJSONArray("items");
        if (items == null) return snapshot;
        int done = 0;
        for (int i = 0; i < items.length(); i++) {
            JSONObject item = items.optJSONObject(i);
            if (item == null) continue;
            for (int j = 0; j < queue.length(); j++) {
                JSONObject pending = queue.optJSONObject(j);
                if (pending != null && snapshot.optString("day").equals(pending.optString("day"))
                    && item.optString("routine").equals(pending.optString("routine"))) {
                    item.put("done", true);
                }
            }
            if (item.optBoolean("done")) done++;
        }
        snapshot.put("doneCount", done);
        return snapshot;
    }

    /** Preserve a remembered app day at most one day ahead after westward travel. */
    public static boolean isCurrentDay(String day, long millis) {
        GregorianCalendar tomorrow = new GregorianCalendar();
        tomorrow.setTimeInMillis(millis);
        boolean beforeRollover = tomorrow.get(Calendar.HOUR_OF_DAY) < ROLLOVER_HOUR;
        // Do date arithmetic at noon so a missing 02:30 during DST cannot skip a day.
        tomorrow.set(Calendar.HOUR_OF_DAY, 12);
        if (beforeRollover) tomorrow.add(Calendar.DAY_OF_MONTH, -1);
        tomorrow.add(Calendar.DAY_OF_MONTH, 1);
        return day != null && (day.equals(appDay(millis)) || day.equals(appDay(tomorrow.getTimeInMillis())));
    }

    private static JSONArray parseArray(String json) {
        if (json == null) return new JSONArray();
        try {
            return new JSONArray(json);
        } catch (JSONException e) {
            return new JSONArray();
        }
    }

    /**
     * The app day for an instant: the local Gregorian date as 'YYYY-MM-DD',
     * or the previous date before 03:00 local time. Gregorian and Locale.US
     * explicitly, so a Buddhist/Japanese default calendar or non-ASCII digits
     * can't change the string.
     */
    public static String appDay(long millis) {
        GregorianCalendar cal = new GregorianCalendar();
        cal.setTimeInMillis(millis);
        if (cal.get(Calendar.HOUR_OF_DAY) < ROLLOVER_HOUR) {
            cal.add(Calendar.DAY_OF_MONTH, -1);
        }
        return String.format(
            Locale.US,
            "%04d-%02d-%02d",
            cal.get(Calendar.YEAR),
            cal.get(Calendar.MONTH) + 1,
            cal.get(Calendar.DAY_OF_MONTH)
        );
    }

    /** Milliseconds since the epoch of the next 03:00 local time after `millis`. */
    public static long nextRollover(long millis) {
        GregorianCalendar cal = new GregorianCalendar();
        cal.setTimeInMillis(millis);
        cal.set(Calendar.HOUR_OF_DAY, ROLLOVER_HOUR);
        cal.set(Calendar.MINUTE, 0);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        if (cal.getTimeInMillis() <= millis) {
            cal.add(Calendar.DAY_OF_MONTH, 1);
        }
        return cal.getTimeInMillis();
    }
}
