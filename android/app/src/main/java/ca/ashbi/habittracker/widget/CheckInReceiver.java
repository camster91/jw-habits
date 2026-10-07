package ca.ashbi.habittracker.widget;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Receives a widget row tap (explicit, not exported). Queues {routine, day}
 * for the app to apply on its next foreground and ticks the routine in the
 * stored snapshot so the widget shows it at once. Ministry is never offered
 * by the widget and is ignored here too. No domain logic.
 */
public class CheckInReceiver extends BroadcastReceiver {
    public static final String EXTRA_ROUTINE = "routine";
    public static final String EXTRA_DAY = "day";

    @Override
    public void onReceive(Context context, Intent intent) {
        String routine = intent.getStringExtra(EXTRA_ROUTINE);
        String day = intent.getStringExtra(EXTRA_DAY);
        if (routine != null && day != null && !"ministry".equals(routine)) {
            WidgetStore.checkIn(context, routine, day);
        }
        // Redraw either way: a tap on a widget that missed the 03:00 rollover shows the new-day message.
        TodayWidgetProvider.requestUpdate(context);
    }
}
