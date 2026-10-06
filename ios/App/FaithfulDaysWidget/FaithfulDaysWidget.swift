import WidgetKit
import SwiftUI
import AppIntents

// MARK: - Shared state (App Group)

/// One routine as the app published it.
struct WidgetItem: Codable, Identifiable, Hashable {
    let routine: String
    let label: String
    var done: Bool

    var id: String { routine }
}

/// The snapshot the app writes to `fd.snapshot`. The widget only reads it
/// (and, in CheckInIntent, flips one item's `done` so the tap shows at once).
struct WidgetSnapshot: Codable, Hashable {
    let day: String
    var doneCount: Int
    let dueCount: Int
    var items: [WidgetItem]
    let accent: String
}

/// A check-in waiting in `fd.queue` for the app to apply on next foreground.
struct QueuedCheckIn: Codable, Hashable {
    let routine: String
    let day: String
}

enum WidgetStore {
    static let appGroup = "group.ca.ashbi.habittracker"
    static let snapshotKey = "fd.snapshot"
    static let queueKey = "fd.queue"
    static let rolloverHour = 3

    static var defaults: UserDefaults? {
        return UserDefaults(suiteName: appGroup)
    }

    static func readSnapshot() -> WidgetSnapshot? {
        guard let json = defaults?.string(forKey: snapshotKey),
              let data = json.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
    }

    static func writeSnapshot(_ snapshot: WidgetSnapshot) {
        guard let data = try? JSONEncoder().encode(snapshot),
              let json = String(data: data, encoding: .utf8) else { return }
        defaults?.set(json, forKey: snapshotKey)
    }

    static func readQueue() -> [QueuedCheckIn] {
        guard let json = defaults?.string(forKey: queueKey),
              let data = json.data(using: .utf8),
              let items = try? JSONDecoder().decode([QueuedCheckIn].self, from: data) else { return [] }
        return items
    }

    static func writeQueue(_ items: [QueuedCheckIn]) {
        guard let data = try? JSONEncoder().encode(items),
              let json = String(data: data, encoding: .utf8) else { return }
        defaults?.set(json, forKey: queueKey)
    }

    /// Gregorian calendar in the device's time zone, whatever calendar the user prefers,
    /// so the day string matches the app's 'YYYY-MM-DD'.
    static var calendar: Calendar {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone.current
        return cal
    }

    /// The app day for an instant: the local date, or the previous one before 03:00.
    static func appDay(_ now: Date) -> String {
        let cal = calendar
        var date = now
        if cal.component(.hour, from: now) < rolloverHour {
            date = cal.date(byAdding: .day, value: -1, to: now) ?? now
        }
        let c = cal.dateComponents([.year, .month, .day], from: date)
        return pad(c.year ?? 0, 4) + "-" + pad(c.month ?? 0, 2) + "-" + pad(c.day ?? 0, 2)
    }

    /// The next 03:00 after `now`, when the app day rolls over.
    static func nextRollover(after now: Date) -> Date {
        let cal = calendar
        var parts = DateComponents()
        parts.hour = rolloverHour
        parts.minute = 0
        parts.second = 0
        return cal.nextDate(after: now, matching: parts, matchingPolicy: .nextTime)
            ?? now.addingTimeInterval(6 * 60 * 60)
    }

    private static func pad(_ n: Int, _ width: Int) -> String {
        let s = String(n)
        return String(repeating: "0", count: max(0, width - s.count)) + s
    }
}

// MARK: - Timeline

struct TodayEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot?

    /// The snapshot only if it belongs to this entry's app day; never stale ticks.
    var current: WidgetSnapshot? {
        guard let snapshot = snapshot, snapshot.day == WidgetStore.appDay(date) else { return nil }
        return snapshot
    }
}

struct TodayProvider: TimelineProvider {
    func placeholder(in context: Context) -> TodayEntry {
        let sample = WidgetSnapshot(
            day: WidgetStore.appDay(Date()),
            doneCount: 1,
            dueCount: 3,
            items: [
                WidgetItem(routine: "dailyText", label: "Daily text", done: true),
                WidgetItem(routine: "bibleReading", label: "Bible reading", done: false),
                WidgetItem(routine: "personalStudy", label: "Personal study", done: false)
            ],
            accent: "#4A6FA4"
        )
        return TodayEntry(date: Date(), snapshot: sample)
    }

    func getSnapshot(in context: Context, completion: @escaping (TodayEntry) -> Void) {
        if context.isPreview {
            completion(placeholder(in: context))
        } else {
            completion(TodayEntry(date: Date(), snapshot: WidgetStore.readSnapshot()))
        }
    }

    /// Two entries: now, and the next 03:00 (which shows the "open the app" message
    /// until the app publishes the new day). The app reloads timelines on every publish.
    func getTimeline(in context: Context, completion: @escaping (Timeline<TodayEntry>) -> Void) {
        let now = Date()
        let rollover = WidgetStore.nextRollover(after: now)
        let snapshot = WidgetStore.readSnapshot()
        let entries = [
            TodayEntry(date: now, snapshot: snapshot),
            TodayEntry(date: rollover, snapshot: snapshot)
        ]
        completion(Timeline(entries: entries, policy: .after(rollover.addingTimeInterval(60))))
    }
}

// MARK: - Views

extension Color {
    /// '#RRGGBB' to a Color; nil for anything else.
    init?(hex: String) {
        var text = hex
        if text.hasPrefix("#") { text.removeFirst() }
        guard text.count == 6, let value = UInt64(text, radix: 16) else { return nil }
        let r = Double((value >> 16) & 0xFF) / 255.0
        let g = Double((value >> 8) & 0xFF) / 255.0
        let b = Double(value & 0xFF) / 255.0
        self.init(red: r, green: g, blue: b)
    }
}

private let defaultAccent = Color(red: 0x4A / 255.0, green: 0x6F / 255.0, blue: 0xA4 / 255.0)

struct ProgressRing: View {
    let done: Int
    let due: Int
    let accent: Color
    let lineWidth: CGFloat

    var body: some View {
        let fraction = due > 0 ? min(1.0, Double(done) / Double(due)) : 1.0
        ZStack {
            Circle()
                .stroke(accent.opacity(0.2), lineWidth: lineWidth)
            Circle()
                .trim(from: 0, to: fraction)
                .stroke(accent, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(-90))
        }
    }
}

struct StaleView: View {
    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: "sun.max")
                .font(.title2)
                .foregroundStyle(defaultAccent)
            Text("Open Faithful Days to start today")
                .font(.footnote)
                .multilineTextAlignment(.center)
        }
    }
}

struct SmallTodayView: View {
    let snapshot: WidgetSnapshot

    var body: some View {
        let accent = Color(hex: snapshot.accent) ?? defaultAccent
        ZStack {
            ProgressRing(done: snapshot.doneCount, due: snapshot.dueCount, accent: accent, lineWidth: 10)
            VStack(spacing: 0) {
                Text(String(snapshot.doneCount))
                    .font(.title.bold())
                Text("of " + String(snapshot.dueCount))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(6)
    }
}

struct MediumTodayView: View {
    let snapshot: WidgetSnapshot

    var body: some View {
        let accent = Color(hex: snapshot.accent) ?? defaultAccent
        HStack(spacing: 14) {
            ZStack {
                ProgressRing(done: snapshot.doneCount, due: snapshot.dueCount, accent: accent, lineWidth: 8)
                Text(String(snapshot.doneCount) + " of " + String(snapshot.dueCount))
                    .font(.caption.bold())
            }
            .frame(width: 72, height: 72)

            VStack(alignment: .leading, spacing: 6) {
                if snapshot.items.isEmpty {
                    Text("Nothing due today")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                ForEach(Array(snapshot.items.prefix(4))) { item in
                    if item.done {
                        RowLabel(label: item.label, done: true, accent: accent)
                    } else {
                        Button(intent: CheckInIntent(routine: item.routine, day: snapshot.day)) {
                            RowLabel(label: item.label, done: false, accent: accent)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            Spacer(minLength: 0)
        }
    }
}

struct RowLabel: View {
    let label: String
    let done: Bool
    let accent: Color

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: done ? "checkmark.circle.fill" : "circle")
                .foregroundStyle(accent)
            Text(label)
                .font(.subheadline)
                .strikethrough(done, color: .secondary)
                .lineLimit(1)
                .foregroundStyle(done ? Color.secondary : Color.primary)
        }
    }
}

struct FaithfulDaysWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: TodayEntry

    var body: some View {
        Group {
            if let snapshot = entry.current {
                if family == .systemSmall {
                    SmallTodayView(snapshot: snapshot)
                } else {
                    MediumTodayView(snapshot: snapshot)
                }
            } else {
                StaleView()
            }
        }
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

// MARK: - Widget

struct FaithfulDaysWidget: Widget {
    let kind = "FaithfulDaysWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TodayProvider()) { entry in
            FaithfulDaysWidgetView(entry: entry)
        }
        .configurationDisplayName("Faithful Days")
        .description("Today's routines at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct FaithfulDaysWidgetBundle: WidgetBundle {
    var body: some Widget {
        FaithfulDaysWidget()
    }
}
