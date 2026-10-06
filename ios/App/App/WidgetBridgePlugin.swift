import Foundation
import Capacitor
import WidgetKit

/// Shares today's snapshot with the FaithfulDaysWidget extension and hands the
/// widget's queued check-ins back to the web app. Both live in the App Group's
/// UserDefaults; the widget never runs domain logic.
@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setSnapshot", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "drainQueue", returnType: CAPPluginReturnPromise)
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

    /// drainQueue() -> {items}: return the queued {routine, day} check-ins and clear the queue.
    @objc func drainQueue(_ call: CAPPluginCall) {
        guard let defaults = defaults else {
            call.resolve(["items": [JSObject]()])
            return
        }
        lock.lock()
        let raw = defaults.string(forKey: WidgetBridgePlugin.queueKey)
        defaults.removeObject(forKey: WidgetBridgePlugin.queueKey)
        lock.unlock()

        var items: [JSObject] = []
        if let data = raw?.data(using: .utf8),
           let parsed = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
            for entry in parsed {
                if let routine = entry["routine"] as? String, let day = entry["day"] as? String {
                    items.append(["routine": routine, "day": day])
                }
            }
        }
        call.resolve(["items": items])
    }
}
