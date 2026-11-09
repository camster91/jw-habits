#!/usr/bin/env bash
set -euo pipefail

# This helper deliberately captures the simulator's native framebuffer. It
# never resizes browser renders or uses the screenshots committed for other
# device classes.

EXPECTED_COMMIT="${EXPECTED_COMMIT:-655f4c6c1ec0fe957e404532e5804d34d3844596}"
BUNDLE_ID="ca.ashbi.habittracker"
SOURCE_ROOT="${SOURCE_ROOT:-$PWD}"
HARNESS_ROOT="${HARNESS_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
OUTPUT_ROOT="${OUTPUT_ROOT:-${GITHUB_WORKSPACE:-$PWD}/artifacts/ios-native-screenshots}"
RUN_ROOT="${RUNNER_TEMP:-${TMPDIR:-/tmp}}/faithful-days-native-screenshots"
DERIVED_DATA="$RUN_ROOT/DerivedData"
VERIFY_BIN="$RUN_ROOT/verify-native-screenshot"

mkdir -p "$OUTPUT_ROOT" "$RUN_ROOT"

actual_commit="$(git -C "$SOURCE_ROOT" rev-parse HEAD)"
if [[ "$actual_commit" != "$EXPECTED_COMMIT" ]]; then
  echo "Expected source $EXPECTED_COMMIT but checked out $actual_commit" >&2
  exit 1
fi

if [[ ! -d "$SOURCE_ROOT/ios/App/App.xcodeproj" || ! -d "$SOURCE_ROOT/ios/App/App/public" ]]; then
  echo "Prepared iOS project/assets are missing; run npm run mobile:prepare first" >&2
  exit 1
fi

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
  xcrun simctl list devicetypes --json >&2
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

destroy_device() {
  local udid="$1"
  xcrun simctl shutdown "$udid" >/dev/null 2>&1 || true
  xcrun simctl delete "$udid" >/dev/null 2>&1 || true
}

build_app() {
  rm -rf "$DERIVED_DATA"
  xcodebuild \
    -project "$SOURCE_ROOT/ios/App/App.xcodeproj" \
    -scheme App \
    -configuration Debug \
    -sdk iphonesimulator \
    -destination 'generic/platform=iOS Simulator' \
    -derivedDataPath "$DERIVED_DATA" \
    CODE_SIGNING_ALLOWED=NO \
    CODE_SIGNING_REQUIRED=NO \
    build
}

build_app
app_path="$DERIVED_DATA/Build/Products/Debug-iphonesimulator/App.app"
if [[ ! -d "$app_path" ]]; then
  echo "Simulator app was not produced at $app_path" >&2
  exit 1
fi

capture_device() {
  local label="$1" expected_width="$2" expected_height="$3" type_id="$4"
  local udid screenshot verification sha256 launch_output pid attempt deadline verify_error
  create_device "Faithful Screenshot $label" "$type_id"
  udid="$CREATED_UDID"
  screenshot="$OUTPUT_ROOT/$label.png"
  xcrun simctl install "$udid" "$app_path"
  launch_output="$(xcrun simctl launch "$udid" "$BUNDLE_ID" 2>&1)"
  printf '%s\n' "$launch_output"
  pid="$(printf '%s\n' "$launch_output" | sed -nE 's/.*: ([0-9]+)$/\1/p' | tail -1)"
  if [[ ! "$pid" =~ ^[0-9]+$ ]] || ! kill -0 "$pid" 2>/dev/null; then
    echo "simctl did not return a live native app PID ($label): $launch_output" >&2
    exit 1
  fi

  # A live UIKit PID can precede a usable WebView framebuffer on a fresh
  # simulator. Keep OCR strict, but poll the real native screenshot for up to
  # 90 seconds instead of accepting a launch screen/status bar as evidence.
  attempt=1
  deadline=$((SECONDS + 90))
  verify_error="$OUTPUT_ROOT/$label-verification-error.txt"
  : >"$verify_error"
  while (( SECONDS < deadline )); do
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "Native app PID exited before screenshot ($label): $pid" >&2
      printf 'launchOutput=%s\npid=%s\nattempt=%s\n' "$launch_output" "$pid" "$attempt" >"$OUTPUT_ROOT/$label-failure.txt"
      exit 1
    fi

    xcrun simctl io "$udid" screenshot "$screenshot"
    if verification="$($VERIFY_BIN "$screenshot" "$expected_width" "$expected_height" 'welcome to faithful days,get started,your routines stay' 2>"$verify_error")"; then
      break
    fi
    echo "Native content not ready for $label (attempt $attempt, ${SECONDS}s elapsed): $(tr '\n' ' ' <"$verify_error")" >&2
    attempt=$((attempt + 1))
    sleep 5
  done
  if [[ -z "${verification:-}" ]]; then
    {
      printf 'launchOutput=%s\npid=%s\nattempts=%s\nelapsedSeconds=%s\n' "$launch_output" "$pid" "$attempt" "$SECONDS"
      printf 'lastVerificationError='
      tr '\n' ' ' <"$verify_error"
      printf '\n'
    } >"$OUTPUT_ROOT/$label-failure.txt"
    echo "Native app content was not detected after ${SECONDS}s ($label); see $OUTPUT_ROOT/$label-failure.txt" >&2
    exit 1
  fi
  sha256="$(shasum -a 256 "$screenshot" | awk '{print $1}')"
  VERIFY_JSON="$verification" SHA256="$sha256" DEVICE_UDID="$udid" SOURCE_COMMIT="$actual_commit" LABEL="$label" APP_VERSION="$app_version" APP_BUILD="$app_build" LAUNCH_OUTPUT="$launch_output" python3 -c '
import json, os
d = json.loads(os.environ["VERIFY_JSON"])
d.update({
    "sha256": os.environ["SHA256"],
    "deviceUdid": os.environ["DEVICE_UDID"],
    "label": os.environ["LABEL"],
    "sourceCommit": os.environ["SOURCE_COMMIT"],
    "bundleId": "ca.ashbi.habittracker",
    "appVersion": os.environ["APP_VERSION"],
    "appBuild": os.environ["APP_BUILD"],
    "launchOutput": os.environ["LAUNCH_OUTPUT"],
})
print(json.dumps(d, sort_keys=True))
' >"$OUTPUT_ROOT/$label.json"
  printf '%s %s %s\n' "$label" "$udid" "$sha256"
  destroy_device "$udid"
}

info_plist="$app_path/Info.plist"
app_bundle_id="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$info_plist")"
app_version="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$info_plist")"
app_build="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$info_plist")"
xcode_version="$(xcodebuild -version | tr '\n' ' ')"
if [[ "$app_bundle_id" != "$BUNDLE_ID" || "$app_version" != "5.3.0" || "$app_build" != "534" ]]; then
  echo "Unexpected built app identity: $app_bundle_id $app_version ($app_build); expected $BUNDLE_ID 5.3.0 (534)" >&2
  exit 1
fi

capture_device iphone-69 1320 2868 "$iphone_type"
capture_device ipad-13 2064 2752 "$ipad_type"

cat >"$OUTPUT_ROOT/manifest.json" <<EOF
{
  "app": "Faithful Days",
  "bundleId": "$BUNDLE_ID",
  "version": "$app_version",
  "build": "$app_build",
  "xcodeVersion": "$xcode_version",
  "sourceCommit": "$actual_commit",
  "runtimeId": "$runtime_id",
  "captureMethod": "xcrun simctl io screenshot after native simulator launch",
  "devices": ["iphone-69", "ipad-13"],
  "dataMode": "empty first-run (no user data)",
  "nativeContentVerification": "Vision OCR required source-owned app navigation/content text; SpringBoard-only screenshots fail"
}
EOF
