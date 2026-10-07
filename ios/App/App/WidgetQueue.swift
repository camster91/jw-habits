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
