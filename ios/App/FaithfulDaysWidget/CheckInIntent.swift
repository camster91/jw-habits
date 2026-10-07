import AppIntents
import WidgetKit

/// Runs in the widget extension when a medium-widget row is tapped (iOS 17
/// interactive widgets). Marks the routine done in the stored snapshot so the
/// tick shows at once, and queues `{routine, day}` for the app to apply on its
/// next foreground. No domain logic: the app decides what the check-in means.
struct CheckInIntent: AppIntent {
    static let title: LocalizedStringResource = "Check in"
    static let isDiscoverable: Bool = false

    @Parameter(title: "Routine")
    var routine: String

    @Parameter(title: "Day")
    var day: String

    init() {}

    init(routine: String, day: String) {
        self.routine = routine
        self.day = day
    }

    func perform() async throws -> some IntentResult {
        // Only today's snapshot can be ticked; a tap on a stale widget does nothing.
        guard day == WidgetStore.appDay(Date()),
              var snapshot = WidgetStore.readSnapshot(),
              snapshot.day == day,
              let index = snapshot.items.firstIndex(where: { $0.routine == routine })
        else {
            return .result()
        }

        if !snapshot.items[index].done {
            snapshot.items[index].done = true
            snapshot.doneCount = snapshot.items.filter { $0.done }.count
            WidgetStore.writeSnapshot(snapshot)
        }

        var queue = WidgetStore.readQueue()
        let item = QueuedCheckIn(routine: routine, day: day)
        if !queue.contains(item) {
            queue.append(item)
            WidgetStore.writeQueue(queue)
        }

        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}
