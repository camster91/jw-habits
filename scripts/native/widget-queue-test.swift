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
        do {
            _ = try queue.drain()
            fatalError("Corrupt queue must not be silently erased")
        } catch {}
        let preserved = try Data(contentsOf: file)
        precondition(preserved == corrupt)
        print("Widget queue: duplicate taps, 400 cross-process concurrent taps/drains and corrupt-byte preservation passed")
    }
}
