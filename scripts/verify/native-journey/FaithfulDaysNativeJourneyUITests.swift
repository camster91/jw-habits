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

    override func tearDown() {
        // XCTest's automatic failure diagnostics do not reliably preserve a
        // raw app screenshot or the WebKit accessibility tree for every
        // assertion. Keep both artifacts for every test outcome so a failed
        // native journey is reviewable without rerunning it just to collect
        // state. This is evidence-only; it does not assert or alter app state.
        captureFinalStateEvidence()
        super.tearDown()
    }

    func testCoreJourney() throws {
        let getStarted = app.buttons["Get started"]
        XCTAssertTrue(getStarted.waitForExistence(timeout: 30), "Real onboarding UI did not expose Get started")
        XCTAssertTrue(waitForHeading("Welcome to Faithful Days"), "Onboarding heading did not appear before first capture")
        try capture("onboarding")
        guard advanceFromWelcome() else { return }
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
        assertRoute(
            tabLabel: "Plans",
            heading: "Plans",
            marker: "Prepare for meetings and assignments",
            markerRole: .link,
            evidenceName: "plans"
        )
        try capture("plans")

        tapTab("Notes")
        assertRoute(
            tabLabel: "Notes",
            heading: "Notes",
            marker: "New note",
            markerRole: .button,
            evidenceName: "notes"
        )
        try capture("notes")

        tapTab("Progress")
        assertRoute(
            tabLabel: "Progress",
            heading: "Progress",
            marker: "Your garden",
            markerRole: .other,
            evidenceName: "progress"
        )
        try capture("progress")
    }

    private func advanceFromWelcome() -> Bool {
        // Re-query after the onboarding capture so the tap cannot use the
        // pre-capture WebKit element if its remote process refreshed.
        let getStarted = app.buttons["Get started"]
        guard getStarted.waitForExistence(timeout: 8), getStarted.isHittable else {
            captureFailureEvidence("onboarding-start-control")
            XCTFail("Get started was not available and hittable after onboarding capture")
            return false
        }

        getStarted.tap()
        if waitForStepTwo(timeout: 8) { return true }

        // A single ordinary retry is allowed only when the strict Step 1
        // state remains visible and Step 2 is still absent. Never retry from
        // an unknown screen or by injecting state.
        let stepOneVisible = app.staticTexts["Welcome to Faithful Days"].exists
            && app.buttons["Get started"].exists
        let stepTwoAbsent = !app.staticTexts["Your routines"].exists
            && !app.buttons["Next"].exists
        guard stepOneVisible && stepTwoAbsent else {
            captureFailureEvidence("onboarding-step-transition")
            XCTFail("Onboarding did not expose Step 2 and was not still on strict Step 1")
            return false
        }

        writeEvidence("onboarding-retry-required.txt", text: "retry-required=true\nreason=step-1-remained-after-first-tap\n")
        captureStateEvidence(
            "onboarding-retry-before",
            details: "retry-required=true\nstate=step-1\n"
        )

        let retry = app.buttons["Get started"]
        guard retry.waitForExistence(timeout: 5), retry.isHittable else {
            captureStateEvidence(
                "onboarding-retry-after",
                details: "retry-required=true\nretry-attempted=false\nretry-failure=control-not-hittable\n"
            )
            writeEvidence("onboarding-retry-required.txt", text: "retry-required=true\nretry-attempted=false\nretry-succeeded=false\n")
            XCTFail("Get started was not available and hittable for the one permitted retry")
            return false
        }

        retry.tap()
        let succeeded = waitForStepTwo(timeout: 8)
        captureStateEvidence(
            "onboarding-retry-after",
            details: "retry-required=true\nretry-attempted=true\nretry-succeeded=\(succeeded)\n"
        )
        writeEvidence(
            "onboarding-retry-required.txt",
            text: "retry-required=true\nretry-attempted=true\nretry-succeeded=\(succeeded)\n"
        )
        guard succeeded else {
            XCTFail("The one permitted Get started retry did not expose Step 2 and Next")
            return false
        }
        return true
    }

    private func waitForStepTwo(timeout: TimeInterval) -> Bool {
        let heading = app.staticTexts["Your routines"]
        let headingAppeared = heading.waitForExistence(timeout: timeout)
        let nextAppeared = app.buttons["Next"].waitForExistence(timeout: headingAppeared ? 5 : 1)
        return headingAppeared && nextAppeared
    }

    private func tapTab(_ label: String) {
        let link = app.links[label]
        if link.waitForExistence(timeout: 10) {
            XCTAssertTrue(link.isHittable, "Bottom navigation link (\(label)) was not hittable")
            link.tap()
            return
        }
        let button = app.buttons[label]
        XCTAssertTrue(button.waitForExistence(timeout: 5), "Bottom navigation control (\(label)) was not found")
        XCTAssertTrue(button.isHittable, "Bottom navigation control (\(label)) was not hittable")
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

    private enum RouteMarkerRole {
        case link
        case button
        case other
    }

    private func waitForRouteHeading(_ text: String) -> Bool {
        // In the preserved AX tree, the actual h1 is represented by one
        // `Other` node with the exact label and value 1, with a StaticText
        // child. This excludes the bottom-navigation StaticText duplicate.
        let predicate = NSPredicate(format: "label == %@", text)
        let query = app.otherElements.matching(predicate)
        guard query.firstMatch.waitForExistence(timeout: 15) else { return false }
        let headings = query.allElementsBoundByIndex.filter {
            String(describing: $0.value ?? "") == "1"
        }
        return headings.count == 1 && headings[0].isHittable
    }

    private func waitForRouteMarker(_ marker: String, role: RouteMarkerRole) -> Bool {
        let element: XCUIElement
        switch role {
        case .link:
            element = app.links[marker]
        case .button:
            element = app.buttons[marker]
        case .other:
            element = app.otherElements[marker]
        }
        return element.waitForExistence(timeout: 15)
    }

    private func assertRoute(
        tabLabel: String,
        heading: String,
        marker: String,
        markerRole: RouteMarkerRole,
        evidenceName: String
    ) {
        XCTAssertTrue(waitForRouteHeading(heading), "\(heading) route h1/native heading did not appear uniquely")
        XCTAssertTrue(
            waitForRouteMarker(marker, role: markerRole),
            "\(heading) route marker/control did not appear: \(marker)"
        )

        // The source NavLink semantics are verified separately by browser and
        // source tests. iOS WebKit AX may omit aria-current even when the
        // real link is on the requested route, so missing native state is
        // recorded as unavailable rather than misreported as a product pass.
        let link = app.links[tabLabel]
        XCTAssertTrue(link.waitForExistence(timeout: 5), "Bottom navigation link (\(tabLabel)) was not found")
        XCTAssertTrue(link.isHittable, "Bottom navigation link (\(tabLabel)) was not hittable")

        let rawValue = String(describing: link.value ?? "")
        let value = rawValue.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        // A non-empty AX value can be a URL/visited value and is not proof of
        // current state. Only XCUI's selected flag or the known exact
        // aria-current mapping is classified as a current-state observation;
        // this remains observational evidence, not VoiceOver acceptance.
        let nativeCurrentExposed = link.isSelected || value == "page"
        let nativeCurrentState = nativeCurrentExposed ? "exposed" : "unavailable"
        writeEvidence(
            "route-\(evidenceName)-native-current.txt",
            text: "tab=\(tabLabel)\nheading=\(heading)\nmarker=\(marker)\nmarkerRole=\(String(describing: markerRole))\n"
                + "headingObservation=unique nativeAX Other node with exact label and value=1, excluding StaticText/navigation duplicates.\n"
                + "nativeCurrentState=\(nativeCurrentState)\n"
                + "nativeSelected=\(link.isSelected)\n"
                + "nativeValue=\(rawValue)\n"
                + "nativeValueInterpretation=only selected=true or exact value=page is classified as current-state observation; other values remain unavailable. This is not VoiceOver acceptance.\n"
                + "sourceSemantics=DOM NavLink tests cover Today, Plans, and Progress; Notes uses the same NavLink source pattern but has no direct existing active-Notes assertion.\n"
        )
    }

    private func setWrapUpBeforeNow() {
        let label = "Evening wrap-up time"
        var field: XCUIElement?

        // The label and HTML input are separate WebKit accessibility nodes.
        // Search by the exact label, exclude static text, and use normal
        // native swipes when the Rhythm form is below the first viewport.
        for attempt in 0...3 {
            let controls = timeValueControls(label)
            if controls.count > 1 {
                captureFailureEvidence("wrap-up-time-control-ambiguous")
                XCTFail("Evening wrap-up time exposed multiple value-bearing controls (count: \(controls.count))")
                return
            }
            if let control = controls.first, control.isHittable {
                field = control
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
                let controls = timeValueControls(label)
                guard controls.count == 1 else {
                    captureFailureEvidence("wrap-up-time-control-after-label")
                    XCTFail("Evening wrap-up time did not expose one value-bearing control after label tap (count: \(controls.count))")
                    return
                }
                if controls[0].isHittable { field = controls[0] }
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

        // The label has a separate parent/container node with an empty value.
        // Re-select the unique exact-label control whose value is time-shaped;
        // do not use a broad WebKit descendant scan that can retain stale
        // indexes after the native picker closes.
        let verifiedControls = timeValueControls(label)
        guard verifiedControls.count == 1, let verified = verifiedControls.first else {
            captureFailureEvidence("wrap-up-time-postcondition")
            XCTFail("Evening wrap-up time did not expose one value-bearing control (count: \(verifiedControls.count))")
            return
        }
        let normalized = normalizeTime(String(describing: verified.value ?? ""))
        writeEvidence("wrap-up-time-value.txt", text: "elementType=\(verified.elementType.rawValue)\nlabel=\(verified.label)\nvalue=\(String(describing: verified.value))\nnormalized=\(normalized)\n")
        guard isAcceptedWrapUpTime(normalized) else {
            captureFailureEvidence("wrap-up-time-postcondition")
            XCTFail("Evening wrap-up time did not settle at 03:00 (value: \(normalized))")
            return
        }
    }

    private func exactLabelElements(_ label: String) -> [XCUIElement] {
        let predicate = NSPredicate(format: "label == %@", label)
        return app.descendants(matching: .any).matching(predicate).allElementsBoundByIndex
    }

    private func timeValueControls(_ label: String) -> [XCUIElement] {
        exactLabelElements(label).filter { element in
            guard element.elementType != .staticText else { return false }
            let value = normalizeTime(String(describing: element.value ?? ""))
            return value.range(of: #"\d{1,2}:\d{2}"#, options: .regularExpression) != nil
        }
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

    private func isAcceptedWrapUpTime(_ normalized: String) -> Bool {
        guard !normalized.contains("pm") else { return false }
        return normalized.range(
            of: #"^(?:03:00|3:00)(?:am(?:,focused)?)?$"#,
            options: .regularExpression
        ) != nil
    }

    private func writeEvidence(_ filename: String, text: String) {
        let url = outputRoot.appendingPathComponent(filename)
        try? text.write(to: url, atomically: true, encoding: .utf8)
    }

    private func captureFailureEvidence(_ name: String) {
        let labelDetail = name.contains("wrap-up-time") ? "exactLabel=Evening wrap-up time\n" : ""
        captureStateEvidence("failure-\(name)", details: "lookup=\(name)\n\(labelDetail)")
    }

    private func captureStateEvidence(_ prefix: String, details: String) {
        let screenshotURL = outputRoot.appendingPathComponent("\(prefix).png")
        let screenshot = XCUIScreen.main.screenshot()
        try? screenshot.pngRepresentation.write(to: screenshotURL, options: .atomic)
        let axURL = outputRoot.appendingPathComponent("\(prefix)-ax.txt")
        let ax = app.debugDescription
        try? ax.write(to: axURL, atomically: true, encoding: .utf8)
        let wrapURL = outputRoot.appendingPathComponent("\(prefix)-wrap-elements.txt")
        try? details.write(to: wrapURL, atomically: true, encoding: .utf8)
        attach(screenshotURL, name: prefix)
        attach(axURL, name: "\(prefix)-ax")
        attach(wrapURL, name: "\(prefix)-wrap-elements")
    }

    private func captureFinalStateEvidence() {
        guard app != nil else { return }
        let screenshot = XCUIScreen.main.screenshot()
        let ax = app.debugDescription

        let screenshotAttachment = XCTAttachment(screenshot: screenshot)
        screenshotAttachment.name = "final-app-state"
        screenshotAttachment.lifetime = .keepAlways
        add(screenshotAttachment)

        let axAttachment = XCTAttachment(string: ax)
        axAttachment.name = "final-app-state-ax"
        axAttachment.lifetime = .keepAlways
        add(axAttachment)

        guard let outputRoot else { return }
        try? screenshot.pngRepresentation.write(
            to: outputRoot.appendingPathComponent("final-app-state.png"),
            options: .atomic
        )
        try? ax.write(
            to: outputRoot.appendingPathComponent("final-app-state-ax.txt"),
            atomically: true,
            encoding: .utf8
        )
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
            "appBuild": "534",
            "captureMethod": "XCTest XCUIApplication normal user journey",
            "deviceLabel": deviceLabel,
            "deviceUdid": deviceUdid,
        ]
        let data = try JSONSerialization.data(withJSONObject: metadata, options: [.sortedKeys])
        try data.write(to: outputRoot.appendingPathComponent("journey-\(name).json"), options: .atomic)
    }
}
