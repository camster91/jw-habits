import XCTest

final class FaithfulDaysNativeJourneyUITests: XCTestCase {
    private let bundleID = "ca.ashbi.habittracker"
    private var app: XCUIApplication!
    private var outputRoot: URL!
    private var sourceCommit: String { ProcessInfo.processInfo.environment["EXPECTED_COMMIT"] ?? "" }
    private var deviceLabel: String { ProcessInfo.processInfo.environment["JOURNEY_DEVICE_LABEL"] ?? "" }
    private var deviceUdid: String { ProcessInfo.processInfo.environment["JOURNEY_DEVICE_UDID"] ?? "" }

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication(bundleIdentifier: bundleID)
        app.launchArguments = ["-AppleLanguages", "(en)", "-AppleLocale", "en_CA"]
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30), "Faithful Days did not reach foreground")

        let environment = ProcessInfo.processInfo.environment
        for key in ["EXPECTED_COMMIT", "JOURNEY_OUTPUT_ROOT", "JOURNEY_DEVICE_LABEL", "JOURNEY_DEVICE_UDID"] {
            XCTAssertFalse(environment[key, default: ""].isEmpty, "Required journey metadata is missing: \(key)")
        }
        XCTAssertTrue(sourceCommit.range(of: "^[0-9a-f]{40}$", options: .regularExpression) != nil, "Journey source commit is not a full SHA")

        let root = ProcessInfo.processInfo.environment["JOURNEY_OUTPUT_ROOT"] ?? NSTemporaryDirectory()
        outputRoot = URL(fileURLWithPath: root, isDirectory: true)
        try FileManager.default.createDirectory(at: outputRoot, withIntermediateDirectories: true)
    }

    func testCoreJourney() throws {
        let getStarted = app.buttons["Get started"]
        XCTAssertTrue(getStarted.waitForExistence(timeout: 30), "Real onboarding UI did not expose Get started")
        XCTAssertTrue(waitForHeading("Welcome to Faithful Days"), "Onboarding heading did not appear before first capture")
        try capture("onboarding")
        getStarted.tap()
        tapButton("Next") // week
        tapButton("Next") // reading
        tapButton("Next") // rhythm
        setWrapUpBeforeNow()
        tapButton("Next") // look
        tapButton("Start my first day")

        XCTAssertTrue(waitForHeading("Today"), "Today route heading did not appear after completing onboarding")
        try capture("today")

        // Expand the normal Today list, yielding a distinct real-app wrap-up
        // frame without any state injection; the changed label proves the
        // card actually expanded before capture.
        let showRoutines = app.buttons["Show routines"]
        XCTAssertTrue(showRoutines.waitForExistence(timeout: 15), "Wrap-up card did not expose Show routines")
        showRoutines.tap()
        XCTAssertTrue(app.buttons["Hide routines"].waitForExistence(timeout: 5), "Wrap-up routines did not expand")
        XCTAssertTrue(waitForText("Your day in review"), "Wrap-up card did not appear")
        try capture("wrap-up")

        tapTab("Plans")
        XCTAssertTrue(waitForHeading("Plans"), "Plans route heading did not appear")
        assertActiveTab("Plans")
        try capture("plans")

        tapTab("Progress")
        XCTAssertTrue(waitForHeading("Progress"), "Progress route heading did not appear")
        assertActiveTab("Progress")
        XCTAssertTrue(waitForText("Bible books"), "Current Progress Bible map is not visible")
        try capture("progress")
    }

    private func tapTab(_ label: String) {
        let link = app.links[label]
        if link.waitForExistence(timeout: 10) {
            link.tap()
            return
        }
        let button = app.buttons[label]
        XCTAssertTrue(button.waitForExistence(timeout: 5), "Tab (label) was not found")
        button.tap()
    }

    private func tapButton(_ label: String) {
        let button = app.buttons[label]
        XCTAssertTrue(button.waitForExistence(timeout: 15), "Button (label) was not found")
        button.tap()
    }

    private func waitForText(_ text: String) -> Bool {
        let predicate = NSPredicate(format: "label CONTAINS[c] %@", text)
        return app.descendants(matching: .any).matching(predicate).firstMatch.waitForExistence(timeout: 15)
    }

    private func waitForHeading(_ text: String) -> Bool {
        app.staticTexts[text].waitForExistence(timeout: 15)
    }

    private func assertActiveTab(_ label: String) {
        let link = app.links[label]
        XCTAssertTrue(link.waitForExistence(timeout: 5), "Active tab link (\(label)) was not found")
        let value = String(describing: link.value ?? "").lowercased()
        XCTAssertTrue(
            link.isSelected || value.contains("page"),
            "Tab (\(label)) did not expose aria-current=page (value: \(value))"
        )
    }

    private func setWrapUpBeforeNow() {
        let label = "Evening wrap-up time"
        var field: XCUIElement?

        // The label and HTML input are separate WebKit accessibility nodes.
        // Search by the exact label, exclude static text, and use normal
        // native swipes when the Rhythm form is below the first viewport.
        for attempt in 0...3 {
            let controls = labeledControls(label)
            if let hittable = controls.first(where: { $0.isHittable }) {
                field = hittable
                break
            }
            if attempt < 3 { app.swipeUp() }
        }

        if field == nil {
            // If WebKit exposes only the real HTML label, tapping it is still
            // a normal user action. The picker/control must become observable
            // afterwards; a static label is never used as the value source.
            let labels = exactLabelElements(label).filter { $0.elementType == .staticText && $0.isHittable }
            if labels.count == 1 {
                labels[0].tap()
                field = labeledControls(label).first(where: { $0.isHittable })
            }
        }

        guard let target = field else {
            captureFailureEvidence("wrap-up-time-control")
            XCTFail("Evening wrap-up time control was not exposed as a unique non-static control")
            return
        }

        target.tap()
        let picker = app.pickerWheels.firstMatch
        if picker.waitForExistence(timeout: 8) {
            let wheels = app.pickerWheels.allElementsBoundByIndex
            let before = pickerState(wheels)
            var adjustedHour = false
            var adjustedMinute = false
            var adjustedPeriod = false
            for wheel in wheels {
                let labelAndValue = "\(wheel.label) \(String(describing: wheel.value))".lowercased()
                if labelAndValue.contains("hour") {
                    wheel.adjust(toPickerWheelValue: "3")
                    adjustedHour = true
                } else if labelAndValue.contains("minute") {
                    wheel.adjust(toPickerWheelValue: "00")
                    adjustedMinute = true
                } else if labelAndValue.contains("am") || labelAndValue.contains("pm") || labelAndValue.contains("meridiem") {
                    wheel.adjust(toPickerWheelValue: "AM")
                    adjustedPeriod = true
                }
            }
            // WebKit can expose value-only wheels. Do not let recognizing only
            // AM/PM suppress the required hour/minute changes.
            if !(adjustedHour && adjustedMinute && adjustedPeriod) {
                guard wheels.count >= 3 else {
                    captureFailureEvidence("wrap-up-time-picker-shape")
                    XCTFail("Time picker did not expose hour, minute, and period wheels")
                    return
                }
                let ordered = wheels
                if !adjustedHour { ordered[0].adjust(toPickerWheelValue: "3") }
                if !adjustedMinute { ordered[1].adjust(toPickerWheelValue: "00") }
                if !adjustedPeriod { ordered[2].adjust(toPickerWheelValue: "AM") }
            }
            let after = pickerState(wheels)
            writeEvidence("wrap-up-time-picker.txt", text: "before=\(before)\nafter=\(after)\n")
            if app.buttons["Done"].exists { app.buttons["Done"].tap() }
        } else {
            // A WebKit text input may omit native wheels. Use only its normal
            // edit menu; never inject state or JavaScript.
            guard target.elementType == .textField || target.elementType == .other else {
                captureFailureEvidence("wrap-up-time-no-picker")
                XCTFail("Time control exposed no picker and was not editable")
                return
            }
            target.press(forDuration: 0.8)
            guard app.menuItems["Select All"].waitForExistence(timeout: 2) else {
                captureFailureEvidence("wrap-up-time-edit-menu")
                XCTFail("Time control exposed no picker or normal edit menu")
                return
            }
            app.menuItems["Select All"].tap()
            target.typeText("03:00")
        }

        // Keep the postcondition scoped to the exact non-static control that
        // was selected by its real label. A broad WebKit descendant scan can
        // retain stale element indexes immediately after the native picker
        // closes, so it is not safe for value verification.
        let normalized = normalizeTime(String(describing: target.value ?? ""))
        writeEvidence("wrap-up-time-value.txt", text: "elementType=\(target.elementType.rawValue)\nlabel=\(target.label)\nvalue=\(String(describing: target.value))\nnormalized=\(normalized)\n")
        guard normalized.contains("03:00") || normalized.contains("3:00am") else {
            captureFailureEvidence("wrap-up-time-postcondition")
            XCTFail("Evening wrap-up time did not settle at 03:00 (value: \(normalized))")
            return
        }
    }

    private func exactLabelElements(_ label: String) -> [XCUIElement] {
        let predicate = NSPredicate(format: "label == %@", label)
        return app.descendants(matching: .any).matching(predicate).allElementsBoundByIndex
    }

    private func labeledControls(_ label: String) -> [XCUIElement] {
        exactLabelElements(label).filter { $0.elementType != .staticText }
    }

    private func pickerState(_ wheels: [XCUIElement]) -> String {
        wheels.enumerated().map { index, wheel in
            "\(index):label=\(wheel.label),value=\(String(describing: wheel.value))"
        }.joined(separator: "|")
    }

    private func normalizeTime(_ value: String) -> String {
        value.components(separatedBy: .whitespacesAndNewlines).joined()
            .replacingOccurrences(of: ".", with: "")
            .lowercased()
    }

    private func writeEvidence(_ filename: String, text: String) {
        let url = outputRoot.appendingPathComponent(filename)
        try? text.write(to: url, atomically: true, encoding: .utf8)
    }

    private func captureFailureEvidence(_ name: String) {
        let prefix = "failure-\(name)"
        let screenshotURL = outputRoot.appendingPathComponent("\(prefix).png")
        let screenshot = XCUIScreen.main.screenshot()
        try? screenshot.pngRepresentation.write(to: screenshotURL, options: .atomic)
        let axURL = outputRoot.appendingPathComponent("\(prefix)-ax.txt")
        let ax = app.debugDescription
        try? ax.write(to: axURL, atomically: true, encoding: .utf8)
        let wrapURL = outputRoot.appendingPathComponent("\(prefix)-wrap-elements.txt")
        let selectorEvidence = "lookup=\(name)\nexactLabel=Evening wrap-up time\n"
        try? selectorEvidence.write(to: wrapURL, atomically: true, encoding: .utf8)
        attach(screenshotURL, name: prefix)
        attach(axURL, name: "\(prefix)-ax")
        attach(wrapURL, name: "\(prefix)-wrap-elements")
    }

    private func attach(_ url: URL, name: String) {
        guard FileManager.default.fileExists(atPath: url.path) else { return }
        let attachment = XCTAttachment(contentsOfFile: url)
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    private func capture(_ name: String) throws {
        let screenshot = XCUIScreen.main.screenshot()
        let imageURL = outputRoot.appendingPathComponent("journey-\(name).png")
        try screenshot.pngRepresentation.write(to: imageURL, options: .atomic)
        let attachment = XCTAttachment(contentsOfFile: imageURL)
        attachment.name = "journey-\(name)"
        attachment.lifetime = .keepAlways
        add(attachment)

        let metadata: [String: Any] = [
            "screen": name,
            "bundleId": bundleID,
            "sourceCommit": sourceCommit,
            "appVersion": "5.3.0",
            "appBuild": "533",
            "captureMethod": "XCTest XCUIApplication normal user journey",
            "deviceLabel": deviceLabel,
            "deviceUdid": deviceUdid,
        ]
        let data = try JSONSerialization.data(withJSONObject: metadata, options: [.sortedKeys])
        try data.write(to: outputRoot.appendingPathComponent("journey-\(name).json"), options: .atomic)
    }
}
