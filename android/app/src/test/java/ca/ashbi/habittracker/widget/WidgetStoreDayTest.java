package ca.ashbi.habittracker.widget;

import org.junit.Test;
import java.util.Calendar;
import java.util.GregorianCalendar;
import java.util.TimeZone;
import static org.junit.Assert.*;

public class WidgetStoreDayTest {
    @Test public void preservesOnlyOneAheadAcrossTimeZonesAndDst() {
        TimeZone original = TimeZone.getDefault();
        try {
            for (String zone : new String[]{"America/Toronto", "America/Los_Angeles", "Asia/Tokyo", "Pacific/Auckland"}) {
                TimeZone.setDefault(TimeZone.getTimeZone(zone));
                GregorianCalendar before = new GregorianCalendar(2026, Calendar.MARCH, 7, 2, 30);
                long now = before.getTimeInMillis();
                assertEquals("2026-03-06", WidgetStore.appDay(now));
                assertTrue(WidgetStore.isCurrentDay("2026-03-06", now));
                assertTrue(WidgetStore.isCurrentDay("2026-03-07", now));
                assertFalse(WidgetStore.isCurrentDay("2026-03-08", now));
                assertFalse(WidgetStore.isCurrentDay("2026-03-05", now));
                assertEquals("2026-03-07", WidgetStore.appDay(WidgetStore.nextRollover(now)));
            }
        } finally { TimeZone.setDefault(original); }
    }
}
