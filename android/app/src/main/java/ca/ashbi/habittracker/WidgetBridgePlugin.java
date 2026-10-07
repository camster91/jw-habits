package ca.ashbi.habittracker;

import ca.ashbi.habittracker.widget.TodayWidgetProvider;
import ca.ashbi.habittracker.widget.WidgetStore;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Shares today's snapshot with the home-screen widget and hands the widget's
 * queued check-ins back to the web app, through SharedPreferences "fd_widget"
 * (keys fd.snapshot and fd.queue). The widget never runs domain logic.
 */
@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    /** setSnapshot({json}): store the snapshot string and redraw every widget. */
    @PluginMethod
    public void setSnapshot(PluginCall call) {
        String json = call.getString("json");
        if (json == null) {
            call.reject("json is required");
            return;
        }
        WidgetStore.writeSnapshot(getContext(), json);
        TodayWidgetProvider.requestUpdate(getContext());
        call.resolve();
    }

    /** drainQueue() -> {items}: the queued {routine, day} check-ins; clears the queue. */
    @PluginMethod
    public void drainQueue(PluginCall call) {
        JSONArray queued = WidgetStore.drainQueue(getContext());
        JSArray items = new JSArray();
        for (int i = 0; i < queued.length(); i++) {
            JSONObject entry = queued.optJSONObject(i);
            if (entry == null) continue;
            String routine = entry.optString("routine", null);
            String day = entry.optString("day", null);
            if (routine == null || day == null) continue;
            JSObject item = new JSObject();
            item.put("routine", routine);
            item.put("day", day);
            items.put(item);
        }
        JSObject result = new JSObject();
        result.put("items", items);
        call.resolve(result);
    }
}
