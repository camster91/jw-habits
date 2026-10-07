import Foundation
import Darwin

@main
struct QueueTest {
    static func main() throws {
        if CommandLine.arguments.count > 1 {
            let root = URL(fileURLWithPath: CommandLine.arguments[1])
            let worker = CommandLine.arguments[2]
            let queue = WidgetQueue(root: root)
            for index in 0..<50 {
                try queue.enqueue(WidgetCheckIn(routine: "\(worker)-\(index)", day: "2026-10-07"))
            }
            return
        }
        for zone in ["America/Toronto", "America/Los_Angeles", "Asia/Tokyo", "Pacific/Auckland"] {
            var calendar = Calendar(identifier: .gregorian)
            calendar.timeZone = TimeZone(identifier: zone)!
            let before = calendar.date(from: DateComponents(year: 2026, month: 3, day: 7, hour: 2, minute: 30))!
            precondition(WidgetDay.appDay(before, calendar: calendar) == "2026-03-06")
            precondition(WidgetDay.isCurrentDay("2026-03-07", at: before, calendar: calendar))
            precondition(!WidgetDay.isCurrentDay("2026-03-08", at: before, calendar: calendar))
            precondition(!WidgetDay.isCurrentDay("2026-03-05", at: before, calendar: calendar))
            let rollover = WidgetDay.nextRollover(after: before, calendar: calendar)
            precondition(calendar.component(.hour, from: rollover) == 3)
            precondition(WidgetDay.appDay(rollover, calendar: calendar) == "2026-03-07")
        }
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let queue = WidgetQueue(root: root)
        let item = WidgetCheckIn(routine: "dailyText", day: "2026-10-07")
        try queue.enqueue(item)
        try queue.enqueue(item)
        let duplicateResult = try queue.read()
        precondition(duplicateResult == [item], "Repeated pending taps must deduplicate")
        let firstDrain = try queue.drain()
        precondition(firstDrain == [item])

        // Separate OS processes, not threads sharing a process-local lock.
        let workers = try (0..<8).map { number -> Process in
            let worker = Process()
            worker.executableURL = URL(fileURLWithPath: CommandLine.arguments[0])
            worker.arguments = [root.path, String(number)]
            try worker.run()
            return worker
        }
        var received = Set<WidgetCheckIn>()
        while workers.contains(where: { $0.isRunning }) {
            received.formUnion(try queue.drain())
            usleep(1_000)
        }
        for worker in workers {
            worker.waitUntilExit()
            precondition(worker.terminationStatus == 0)
        }
        received.formUnion(try queue.drain())
        precondition(received.count == 400, "A concurrent enqueue/drain lost a tap")
        let remaining = try queue.read()
        precondition(remaining.isEmpty)

        let corrupt = Data("corrupt queue".utf8)
        let file = root.appendingPathComponent("queue.json")
        try corrupt.write(to: file)
        let corruptDrain = try queue.drain()
        precondition(corruptDrain.isEmpty)
        let recoveries = try FileManager.default.contentsOfDirectory(at: root, includingPropertiesForKeys: nil)
            .filter { $0.lastPathComponent.hasPrefix("queue-corrupt-") }
        precondition(recoveries.count == 1)
        let preserved = try Data(contentsOf: recoveries[0])
        precondition(preserved == corrupt)
        try queue.enqueue(item)
        let recovered = try queue.drain()
        precondition(recovered == [item], "Corrupt transport must not block future taps")
        print("Widget day/timezone checks and queue: duplicate taps, 400 cross-process concurrent taps/drains and corrupt-byte preservation passed")
    }
}
