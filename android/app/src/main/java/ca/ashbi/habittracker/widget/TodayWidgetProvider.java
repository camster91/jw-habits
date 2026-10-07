package ca.ashbi.habittracker.widget;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;

import ca.ashbi.habittracker.MainActivity;
import ca.ashbi.habittracker.R;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * The "Today" home-screen widget. Narrow (small): a ring with "done of due".
 * Wide (medium): the ring plus up to four routines, each tappable to check in
 * through CheckInReceiver. Reads only the snapshot the app published; when
 * its day is not the current app day (03:00 rollover) it shows "Open Faithful
 * Days to start today" and never stale ticks.
 */
public class TodayWidgetProvider extends AppWidgetProvider {
    /** Sent by the 03:00 alarm so the widget flips to the "open the app" message on time. */
    static final String ACTION_ROLLOVER = "ca.ashbi.habittracker.widget.ROLLOVER";

    private static final int[] ROW_IDS = {
        R.id.widget_row_0,
        R.id.widget_row_1,
        R.id.widget_row_2,
        R.id.widget_row_3,
    };
    private static final int MAX_ROWS = ROW_IDS.length;
    /** Widths from this many dp get the routine rows (a 3- or 4-cell-wide widget). */
    private static final int MEDIUM_MIN_WIDTH_DP = 180;
    private static final int DEFAULT_ACCENT = Color.rgb(0x4A, 0x6F, 0xA4);

    /** Ask every placed widget to redraw from the stored snapshot. */
    public static void requestUpdate(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, TodayWidgetProvider.class));
        if (ids == null || ids.length == 0) return;
        Intent intent = new Intent(context, TodayWidgetProvider.class);
        intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
        context.sendBroadcast(intent);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        if (ACTION_ROLLOVER.equals(intent.getAction())) {
            requestUpdate(context);
            return;
        }
        super.onReceive(context, intent);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            manager.updateAppWidget(id, build(context, manager, id));
        }
        scheduleRollover(context);
    }

    @Override
    public void onAppWidgetOptionsChanged(
        Context context,
        AppWidgetManager manager,
        int appWidgetId,
        Bundle newOptions
    ) {
        manager.updateAppWidget(appWidgetId, build(context, manager, appWidgetId));
    }

    @Override
    public void onDisabled(Context context) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms != null) alarms.cancel(rolloverIntent(context));
    }

    private static RemoteViews build(Context context, AppWidgetManager manager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_today);
        views.setOnClickPendingIntent(R.id.widget_root, openAppIntent(context));

        JSONObject snapshot = WidgetStore.readSnapshot(context);
        String today = WidgetStore.appDay(System.currentTimeMillis());
        if (snapshot == null || !today.equals(snapshot.optString("day"))) {
            views.setViewVisibility(R.id.widget_content, View.GONE);
            views.setViewVisibility(R.id.widget_stale, View.VISIBLE);
            return views;
        }
        views.setViewVisibility(R.id.widget_stale, View.GONE);
        views.setViewVisibility(R.id.widget_content, View.VISIBLE);

        int done = Math.max(0, snapshot.optInt("doneCount", 0));
        int due = Math.max(0, snapshot.optInt("dueCount", 0));
        int accent = parseColor(snapshot.optString("accent", ""));
        // An empty day reads as a full ring.
        views.setProgressBar(R.id.widget_ring, Math.max(due, 1), due == 0 ? 1 : Math.min(done, due), false);
        views.setTextViewText(R.id.widget_count, context.getString(R.string.widget_count, done, due));
        views.setTextColor(R.id.widget_count, accent);

        boolean medium = isMedium(manager, appWidgetId);
        views.setViewVisibility(R.id.widget_rows, medium ? View.VISIBLE : View.GONE);
        if (!medium) return views;

        JSONArray items = snapshot.optJSONArray("items");
        int count = items == null ? 0 : items.length();
        views.setViewVisibility(R.id.widget_empty, count == 0 ? View.VISIBLE : View.GONE);
        for (int i = 0; i < MAX_ROWS; i++) {
            int rowId = ROW_IDS[i];
            JSONObject item = i < count ? items.optJSONObject(i) : null;
            if (item == null) {
                views.setViewVisibility(rowId, View.GONE);
                continue;
            }
            String routine = item.optString("routine", "");
            String label = item.optString("label", routine);
            boolean isDone = item.optBoolean("done", false);
            views.setViewVisibility(rowId, View.VISIBLE);
            views.setTextViewText(
                rowId,
                context.getString(isDone ? R.string.widget_row_done : R.string.widget_row_todo, label)
            );
            if (!isDone) {
                views.setOnClickPendingIntent(
                    rowId,
                    checkInIntent(context, routine, today, appWidgetId * MAX_ROWS + i)
                );
            }
        }
        return views;
    }

    private static boolean isMedium(AppWidgetManager manager, int appWidgetId) {
        Bundle options = manager.getAppWidgetOptions(appWidgetId);
        int minWidth = options == null ? 0 : options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0);
        return minWidth >= MEDIUM_MIN_WIDTH_DP;
    }

    private static int parseColor(String hex) {
        try {
            return Color.parseColor(hex);
        } catch (RuntimeException e) {
            return DEFAULT_ACCENT;
        }
    }

    private static PendingIntent openAppIntent(Context context) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    /** Unique request code per widget and row, so each row keeps its own extras. */
    private static PendingIntent checkInIntent(Context context, String routine, String day, int requestCode) {
        Intent intent = new Intent(context, CheckInReceiver.class);
        intent.putExtra(CheckInReceiver.EXTRA_ROUTINE, routine);
        intent.putExtra(CheckInReceiver.EXTRA_DAY, day);
        return PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private static PendingIntent rolloverIntent(Context context) {
        Intent intent = new Intent(context, TodayWidgetProvider.class);
        intent.setAction(ACTION_ROLLOVER);
        return PendingIntent.getBroadcast(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    /** An inexact alarm (no exact-alarm permission needed) for the next 03:00. */
    private static void scheduleRollover(Context context) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) return;
        long at = WidgetStore.nextRollover(System.currentTimeMillis()) + 60_000L;
        alarms.set(AlarmManager.RTC, at, rolloverIntent(context));
    }
}
