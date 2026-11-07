#!/usr/bin/env bash
set -euo pipefail

# Run a normal XCTest user journey against the frozen Faithful Days source.
# This is a CI-only harness: it copies the Xcode project into RUN_ROOT, adds
# an ephemeral UI-test target, and never changes the app checkout or storage.

EXPECTED_COMMIT="${EXPECTED_COMMIT:-ff02bed994d0707ef9533fd75e1b487c62faf696}"
BUNDLE_ID="ca.ashbi.habittracker"
APP_VERSION="5.3.0"
APP_BUILD="533"
SOURCE_ROOT="${SOURCE_ROOT:-$PWD}"
HARNESS_ROOT="${HARNESS_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
OUTPUT_ROOT="${OUTPUT_ROOT:-${GITHUB_WORKSPACE:-$PWD}/artifacts/ios-native-core-journey}"
RUN_ROOT="${RUNNER_TEMP:-${TMPDIR:-/tmp}}/faithful-days-native-core-journey"
VERIFY_BIN="$RUN_ROOT/verify-native-screenshot"
DERIVED_DATA="$RUN_ROOT/DerivedData"

mkdir -p "$OUTPUT_ROOT" "$RUN_ROOT"

actual_commit="$(git -C "$SOURCE_ROOT" rev-parse HEAD)"
if [[ "$actual_commit" != "$EXPECTED_COMMIT" ]]; then
  echo "Expected source $EXPECTED_COMMIT but checked out $actual_commit" >&2
  exit 1
fi

if [[ ! -d "$SOURCE_ROOT/ios/App/App.xcodeproj" || ! -d "$SOURCE_ROOT/ios/App/App/public" ]]; then
  echo "Prepared iOS project/assets are missing" >&2
  exit 1
fi

wrapup_source="$(git -C "$SOURCE_ROOT" show "$EXPECTED_COMMIT:src/domain/wrapup.js")"
if ! printf '%s\n' "$wrapup_source" | rg -Fq 'const ROLLOVER_MINUTES = 3 * 60;'; then
  echo "Expected 03:00 rollover source proof is missing" >&2
  exit 1
fi
if ! printf '%s\n' "$wrapup_source" | rg -Fq 'if (at >= ROLLOVER_MINUTES) return local >= at || local < ROLLOVER_MINUTES;'; then
  echo "Expected pre-03:00/post-03:00 wrap-up source proof is missing" >&2
  exit 1
fi
cat >"$OUTPUT_ROOT/wrap-up-boundary-proof.txt" <<EOF
sourceCommit=$EXPECTED_COMMIT
sourcePath=src/domain/wrapup.js
configuredWrapUpTime=03:00
proof=source isWrapUpTime treats 03:00 as the rollover boundary and accepts local time at or after 03:00 OR before 03:00.
EOF

swiftc "$HARNESS_ROOT/scripts/verify/verify-native-screenshot.swift" \
  -o "$VERIFY_BIN" \
  -framework AppKit \
  -framework Vision

runtime_id="$(xcrun simctl list runtimes --json | python3 -c '
import json, sys
runtimes = [r for r in json.load(sys.stdin).get("runtimes", [])
            if r.get("isAvailable") and r.get("identifier", "").startswith("com.apple.CoreSimulator.SimRuntime.iOS-")]
runtimes.sort(key=lambda r: tuple(int(x) for x in r.get("version", "0").split(".")))
print(runtimes[-1]["identifier"] if runtimes else "")
')"
if [[ -z "$runtime_id" ]]; then
  echo "No available iOS Simulator runtime found" >&2
  exit 1
fi

device_type_id() {
  xcrun simctl list devicetypes --json | python3 -c '
import json, sys
wanted = set(sys.argv[1:])
for device in json.load(sys.stdin).get("devicetypes", []):
    if device.get("name") in wanted:
        print(device["identifier"])
        break
' "$@"
}

iphone_type="$(device_type_id 'iPhone 16 Pro Max')"
ipad_type="$(device_type_id 'iPad Pro 13-inch (M4)' 'iPad Pro (13-inch) (M4)')"
if [[ -z "$iphone_type" || -z "$ipad_type" ]]; then
  echo "Required simulator device types are unavailable" >&2
  exit 1
fi

created_devices=()
cleanup() {
  for udid in "${created_devices[@]}"; do
    xcrun simctl shutdown "$udid" >/dev/null 2>&1 || true
    xcrun simctl delete "$udid" >/dev/null 2>&1 || true
  done
}
trap cleanup EXIT

CREATED_UDID=""
create_device() {
  local name="$1" type_id="$2"
  CREATED_UDID="$(xcrun simctl create "$name" "$type_id" "$runtime_id")"
  created_devices+=("$CREATED_UDID")
  xcrun simctl boot "$CREATED_UDID" >/dev/null
  xcrun simctl bootstatus "$CREATED_UDID" -b >&2
}

run_journey() {
  local label="$1" expected_width="$2" expected_height="$3" type_id="$4"
  local udid output_dir project_root test_status verification_status app_identity_status screen token
  local app_path app_bundle_id app_version app_build
  output_dir="$OUTPUT_ROOT/$label"
  mkdir -p "$output_dir"
  create_device "Faithful Core Journey $label" "$type_id"
  udid="$CREATED_UDID"
  project_root="$RUN_ROOT/project-$label"
  # Keep the product checkout immutable. Each device gets a disposable copy so
  # its scheme can carry concrete, verifiable XCTest metadata.
  mkdir -p "$project_root/ios"
  cp -R "$SOURCE_ROOT/ios/App" "$project_root/ios/App"
  cp "$SOURCE_ROOT/ios/debug.xcconfig" "$project_root/ios/debug.xcconfig"
  ln -s "$SOURCE_ROOT/node_modules" "$project_root/node_modules"
  mkdir -p "$project_root/ios/App/NativeJourney"
  cp "$HARNESS_ROOT/scripts/verify/native-journey/FaithfulDaysNativeJourneyUITests.swift" \
    "$project_root/ios/App/NativeJourney/FaithfulDaysNativeJourneyUITests.swift"
  python3 "$HARNESS_ROOT/scripts/verify/native-journey/prepare-native-journey-project.py" \
    --project "$project_root/ios/App/App.xcodeproj/project.pbxproj" \
    --scheme "$project_root/ios/App/App.xcodeproj/xcshareddata/xcschemes/FaithfulJourney.xcscheme" \
    --source-commit "$EXPECTED_COMMIT" \
    --output-root "$output_dir" \
    --device-label "$label" \
    --device-udid "$udid"
  echo "Running normal onboarding/navigation journey on $label ($udid)"

  set +e
  xcodebuild \
    -project "$project_root/ios/App/App.xcodeproj" \
    -scheme FaithfulJourney \
    -configuration Debug \
    -destination "platform=iOS Simulator,id=$udid" \
    -derivedDataPath "$DERIVED_DATA" \
    -parallel-testing-enabled NO \
    -only-testing:FaithfulDaysNativeJourneyUITests \
    -resultBundlePath "$output_dir/FaithfulJourney.xcresult" \
    CODE_SIGNING_ALLOWED=NO \
    CODE_SIGNING_REQUIRED=NO \
    test >"$output_dir/xcodebuild.log" 2>&1
  test_status=$?
  set -e

  app_identity_status=0
  app_path="$DERIVED_DATA/Build/Products/Debug-iphonesimulator/App.app"
  app_bundle_id="missing"
  app_version="missing"
  app_build="missing"
  if [[ -d "$app_path" && -f "$app_path/Info.plist" ]]; then
    app_bundle_id="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$app_path/Info.plist" 2>/dev/null || true)"
    app_version="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$app_path/Info.plist" 2>/dev/null || true)"
    app_build="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$app_path/Info.plist" 2>/dev/null || true)"
  fi
  if [[ "$app_bundle_id" != "$BUNDLE_ID" || "$app_version" != "$APP_VERSION" || "$app_build" != "$APP_BUILD" ]]; then
    app_identity_status=1
  fi
  printf 'bundleId=%s\nappVersion=%s\nappBuild=%s\nexpectedBundleId=%s\nexpectedAppVersion=%s\nexpectedAppBuild=%s\nidentityExit=%s\n' \
    "$app_bundle_id" "$app_version" "$app_build" "$BUNDLE_ID" "$APP_VERSION" "$APP_BUILD" "$app_identity_status" \
    >"$output_dir/app-identity.txt"

  if (( test_status != 0 )); then
    printf 'sourceCommit=%s\nbundleId=%s\nappVersion=%s\nappBuild=%s\ndeviceLabel=%s\ndeviceUdid=%s\nxcodebuildExit=%s\nappIdentityExit=%s\n' \
      "$actual_commit" "$app_bundle_id" "$app_version" "$app_build" "$label" "$udid" "$test_status" "$app_identity_status" >"$output_dir/failure.txt"
  fi

  verification_status=0
  for screen in onboarding today wrap-up plans progress; do
    case "$screen" in
      onboarding) token='welcome to faithful days,get started,your routines stay' ;;
      today) token='today,your day in review' ;;
      wrap-up) token='your day in review,show routines' ;;
      plans) token='plans,personal study' ;;
      progress) token='progress,bible books' ;;
    esac
    if [[ ! -f "$output_dir/journey-$screen.png" ]]; then
      verification_status=1
      continue
    fi
    if ! "$VERIFY_BIN" "$output_dir/journey-$screen.png" "$expected_width" "$expected_height" "$token" \
      >"$output_dir/journey-$screen-verification.json" 2>"$output_dir/journey-$screen-verification-error.txt"; then
      verification_status=1
    fi
  done
  if (( app_identity_status != 0 )); then
    verification_status=1
  fi

  printf 'sourceCommit=%s\nbundleId=%s\nappVersion=%s\nappBuild=%s\ndeviceLabel=%s\ndeviceUdid=%s\nxcodebuildExit=%s\nappIdentityExit=%s\nverificationExit=%s\n' \
    "$actual_commit" "$app_bundle_id" "$app_version" "$app_build" "$label" "$udid" "$test_status" "$app_identity_status" "$verification_status" >"$output_dir/provenance.txt"
  xcrun simctl shutdown "$udid" >/dev/null 2>&1 || true
  xcrun simctl delete "$udid" >/dev/null 2>&1 || true

  if (( test_status != 0 || verification_status != 0 )); then
    return 1
  fi
}

overall_status=0
run_journey iphone-69 1320 2868 "$iphone_type" || overall_status=1
run_journey ipad-13 2064 2752 "$ipad_type" || overall_status=1

python3 - "$OUTPUT_ROOT/manifest.json" "$actual_commit" "$runtime_id" "$overall_status" <<'PY'
import json, pathlib, sys
path = pathlib.Path(sys.argv[1])
path.write_text(json.dumps({
    "app": "Faithful Days",
    "bundleId": "ca.ashbi.habittracker",
    "version": "5.3.0",
    "build": "533",
    "status": "passed" if sys.argv[4] == "0" else "failed",
    "sourceCommit": sys.argv[2],
    "runtimeId": sys.argv[3],
    "captureMethod": "XCTest XCUIApplication normal onboarding/navigation journey",
    "builtAppIdentityValidation": "each device provenance reads App.app/Info.plist and requires ca.ashbi.habittracker 5.3.0 (533)",
    "wrapUpBoundaryProof": "src/domain/wrapup.js at sourceCommit proves configured 03:00 covers local time before and at/after the 03:00 rollover",
    "screens": ["onboarding", "today", "wrap-up", "plans", "progress"],
    "devices": {
        "iphone-69": {"width": 1320, "height": 2868},
        "ipad-13": {"width": 2064, "height": 2752}
    },
    "statePolicy": "fresh simulator; state changed only by visible onboarding and tab controls",
    "widgetCoverage": "not captured by this journey; remains a separate native/widget gate"
}, indent=2) + "\n")
PY

find "$OUTPUT_ROOT" -type f \
  \( -name '*.png' -o -name '*.json' -o -name '*.txt' -o -name '*.log' \) \
  -exec shasum -a 256 {} + >"$OUTPUT_ROOT/SHA256SUMS"

exit "$overall_status"
