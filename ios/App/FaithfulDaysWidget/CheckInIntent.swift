import AppIntents
import WidgetKit

/// Runs in the widget extension when a medium-widget row is tapped (iOS 17
/// interactive widgets). Overlays the pending queue so the
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
        guard WidgetStore.isCurrentDay(day, at: Date()),
              let snapshot = WidgetStore.readSnapshot(),
              snapshot.day == day,
              snapshot.items.contains(where: { $0.routine == routine }),
              let queue = WidgetQueue.shared
        else { return .result() }

        // The app is the only snapshot writer. Rendering overlays the pending
        // queue, keeping ticks visible even during a simultaneous app publish.
        try queue.enqueue(WidgetCheckIn(routine: routine, day: day))

        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}
