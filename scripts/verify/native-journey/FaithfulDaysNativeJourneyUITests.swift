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

        // Keep the card visible but expand the normal Today list, yielding a
        // distinct real-app wrap-up frame without any state injection.
        if app.buttons["Show routines"].waitForExistence(timeout: 3) {
            app.buttons["Show routines"].tap()
        }
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
        let field = app.textFields["Evening wrap-up time"]
        XCTAssertTrue(field.waitForExistence(timeout: 15), "Evening wrap-up time control was not exposed")

        field.tap()
        let wheels = app.pickerWheels
        if wheels.count > 0 {
            var adjustedByLabel = false
            for wheel in wheels.allElementsBoundByIndex {
                let label = "\(wheel.label) \(String(describing: wheel.value))".lowercased()
                if label.contains("hour") {
                    wheel.adjust(toPickerWheelValue: "3")
                    adjustedByLabel = true
                } else if label.contains("minute") {
                    wheel.adjust(toPickerWheelValue: "00")
                    adjustedByLabel = true
                } else if label.contains("am") || label.contains("pm") || label.contains("meridiem") {
                    wheel.adjust(toPickerWheelValue: "AM")
                    adjustedByLabel = true
                }
            }
            // WebKit's iOS time picker can expose value-only wheels without
            // the semantic labels. Its stable order is hour, minute, AM/PM.
            // Use that documented UI surface only as a fallback; never touch
            // the app's storage or JavaScript state.
            if !adjustedByLabel && wheels.count >= 3 {
                let ordered = wheels.allElementsBoundByIndex
                ordered[0].adjust(toPickerWheelValue: "3")
                ordered[1].adjust(toPickerWheelValue: "00")
                ordered[2].adjust(toPickerWheelValue: "AM")
            }
            if app.buttons["Done"].exists { app.buttons["Done"].tap() }
        } else {
            // WebKit may expose an HTML time input as a text field rather than
            // picker wheels. Select the existing value through the normal edit
            // menu and type 03:00 (no storage or JS injection). The 03:00
            // boundary is the earliest supported wrap-up time, so the card is
            // visible regardless of the CI wall-clock hour.
            field.press(forDuration: 0.8)
            if app.menuItems["Select All"].waitForExistence(timeout: 2) {
                app.menuItems["Select All"].tap()
                field.typeText("03:00")
            }
        }

        let normalized = String(describing: field.value ?? "")
            .replacingOccurrences(of: " ", with: "")
            .lowercased()
        XCTAssertTrue(
            normalized.contains("03:00") || normalized.contains("3:00am"),
            "Evening wrap-up time did not settle at 03:00 (value: \(normalized))"
        )
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
