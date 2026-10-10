import Foundation
import Capacitor
import WidgetKit

/// Shares today's snapshot with the FaithfulDaysWidget extension and hands the
/// widget's queued check-ins back to the web app. Both live in the App Group's
/// UserDefaults (snapshot) and a process-coordinated queue file.
@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setSnapshot", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "drainQueue", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "peekQueue", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "acknowledgeQueue", returnType: CAPPluginReturnPromise)
    ]

    static let appGroup = "group.ca.ashbi.habittracker"
    static let snapshotKey = "fd.snapshot"
    static let queueKey = "fd.queue"

    /// Serialises read-and-clear of the queue within the app process.
    private let lock = NSLock()

    private var defaults: UserDefaults? {
        return UserDefaults(suiteName: WidgetBridgePlugin.appGroup)
    }

    /// setSnapshot({json}): store the snapshot string and ask WidgetKit to redraw.
    @objc func setSnapshot(_ call: CAPPluginCall) {
        guard let json = call.getString("json") else {
            call.reject("json is required")
            return
        }
        guard let defaults = defaults else {
            call.reject("App Group " + WidgetBridgePlugin.appGroup + " is not available")
            return
        }
        defaults.set(json, forKey: WidgetBridgePlugin.snapshotKey)
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    private func pendingQueue() throws -> WidgetQueue {
        guard let defaults = defaults, let queue = WidgetQueue.shared else {
            throw NSError(domain: "WidgetQueue", code: 1)
        }
        if let raw = defaults.string(forKey: WidgetBridgePlugin.queueKey),
           let data = raw.data(using: .utf8),
           let legacy = try? JSONDecoder().decode([WidgetCheckIn].self, from: data) {
            for item in legacy { try queue.enqueue(item) }
            defaults.removeObject(forKey: WidgetBridgePlugin.queueKey)
        }
        return queue
    }

    @objc func peekQueue(_ call: CAPPluginCall) {
        lock.lock()
        defer { lock.unlock() }
        do {
            let items: [JSObject] = try pendingQueue().read().map {
                ["routine": $0.routine, "day": $0.day]
            }
            call.resolve(["items": items])
        } catch { call.reject("Could not read widget taps") }
    }

    @objc func acknowledgeQueue(_ call: CAPPluginCall) {
        guard let values = call.getArray("items", JSObject.self) else {
            call.reject("Widget acknowledgement items are required")
            return
        }
        let items = values.compactMap { value -> WidgetCheckIn? in
            guard let routine = value["routine"] as? String, let day = value["day"] as? String else { return nil }
            return WidgetCheckIn(routine: routine, day: day)
        }
        guard items.count == values.count else {
            call.reject("Invalid widget acknowledgement")
            return
        }
        lock.lock()
        defer { lock.unlock() }
        do {
            try pendingQueue().acknowledge(items)
            call.resolve()
        } catch { call.reject("Could not acknowledge widget taps") }
    }

    /// drainQueue() -> {items}: return the queued {routine, day} check-ins and clear the queue.
    @objc func drainQueue(_ call: CAPPluginCall) {
        guard let defaults = defaults else {
            call.resolve(["items": [JSObject]()])
            return
        }
        lock.lock()
        defer { lock.unlock() }
        guard let queue = WidgetQueue.shared else {
            call.reject("App Group queue is not available")
            return
        }
        do {
            // Preserve pending legacy taps before retiring the old preference.
            // The updated extension writes only the file queue.
            if let raw = defaults.string(forKey: WidgetBridgePlugin.queueKey),
               let data = raw.data(using: .utf8),
               let legacy = try? JSONDecoder().decode([WidgetCheckIn].self, from: data) {
                for item in legacy { try queue.enqueue(item) }
                defaults.removeObject(forKey: WidgetBridgePlugin.queueKey)
            }
            let items: [JSObject] = try queue.drain().map {
                ["routine": $0.routine, "day": $0.day]
            }
            call.resolve(["items": items])
        } catch {
            call.reject("Could not drain the widget queue")
        }
    }
}
