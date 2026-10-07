import Foundation
import Darwin

struct WidgetCheckIn: Codable, Hashable {
    let routine: String
    let day: String
}

/// A queue file guarded by a POSIX lock shared by the app and widget process.
/// Atomic replacement preserves the previous queue if a write fails.
final class WidgetQueue {
    let root: URL
    init(root: URL) { self.root = root }

    static var shared: WidgetQueue? {
        guard let root = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: "group.ca.ashbi.habittracker"
        ) else { return nil }
        return WidgetQueue(root: root.appendingPathComponent("fd-widget-queue", isDirectory: true))
    }

    private func locked<T>(_ operation: (URL) throws -> T) throws -> T {
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        let descriptor = open(root.appendingPathComponent("queue.lock").path, O_CREAT | O_RDWR, 0o600)
        guard descriptor >= 0 else { throw POSIXError(.EIO) }
        defer { close(descriptor) }
        guard flock(descriptor, LOCK_EX) == 0 else { throw POSIXError(.EIO) }
        defer { flock(descriptor, LOCK_UN) }
        return try operation(root.appendingPathComponent("queue.json"))
    }

    private func load(_ file: URL) throws -> [WidgetCheckIn] {
        do { return try JSONDecoder().decode([WidgetCheckIn].self, from: Data(contentsOf: file)) }
        catch let error as CocoaError where error.code == .fileReadNoSuchFile { return [] }
    }

    func read() throws -> [WidgetCheckIn] { try locked { try load($0) } }

    func enqueue(_ item: WidgetCheckIn) throws {
        try locked { file in
            var items = try load(file)
            if !items.contains(item) {
                items.append(item)
                try JSONEncoder().encode(items).write(to: file, options: .atomic)
            }
        }
    }

    func drain() throws -> [WidgetCheckIn] {
        try locked { file in
            let items = try load(file)
            try JSONEncoder().encode([WidgetCheckIn]()).write(to: file, options: .atomic)
            return items
        }
    }
}

/// Native app-day arithmetic shared with the widget and standalone CI tests.
enum WidgetDay {
    static let rolloverHour = 3
    /// Mirrors currentDay: preserve an app's day one day ahead after westward travel.
    static func isCurrentDay(_ day: String, at now: Date, calendar: Calendar = calendar) -> Bool {
        let clockDay = appDay(now, calendar: calendar)
        let parts = clockDay.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3,
              let noon = calendar.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2], hour: 12)),
              let tomorrow = calendar.date(byAdding: .day, value: 1, to: noon)
        else { return day == clockDay }
        return day == clockDay || day == appDay(tomorrow, calendar: calendar)
    }

    /// Gregorian calendar in the device's time zone, whatever calendar the user prefers,
    /// so the day string matches the app's 'YYYY-MM-DD'.
    static var calendar: Calendar {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone.current
        return cal
    }

    /// The app day for an instant: the local date, or the previous one before 03:00.
    static func appDay(_ now: Date, calendar: Calendar = calendar) -> String {
        let cal = calendar
        var date = now
        if cal.component(.hour, from: now) < rolloverHour {
            date = cal.date(byAdding: .day, value: -1, to: now) ?? now
        }
        let c = cal.dateComponents([.year, .month, .day], from: date)
        return pad(c.year ?? 0, 4) + "-" + pad(c.month ?? 0, 2) + "-" + pad(c.day ?? 0, 2)
    }

    /// The next 03:00 after `now`, when the app day rolls over.
    static func nextRollover(after now: Date, calendar: Calendar = calendar) -> Date {
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
