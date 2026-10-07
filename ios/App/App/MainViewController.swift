import UIKit
import Capacitor

/// The storyboard's root view controller. Registers the app's own plugins,
/// which Capacitor 8 does not discover automatically.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(WidgetBridgePlugin())
    }
}
