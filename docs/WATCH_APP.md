# JW Habits — Apple Watch / Wear OS App

## Watch Face Complications

### Complication Types

| Type | Name | Description |
|---|---|---|
| Circular Small | Streak | Current daily text streak count |
| Modular Small | Streak Ring | Streak count with ring progress (color: jw-blue) |
| Utilitarian Small | Daily Text | "Read" or "Not yet" status |
| Graphic Corner | Streak + Level | Current streak + XP level badge |
| Graphic Circular | Prayer Status | Morning/afternoon/evening checkmarks |

### Data Flow

```
jw-habits (iOS/Android) ──→ WatchConnectivity / Data Layer ──→ Watch Complication
     │                              │
  localStorage                TimelineProvider
  (zustand stores)            (every 15 min refresh)
```

### Implementation Notes

**iOS (WatchKit + SwiftUI):**
- `ComplicationController.swift` — provides timeline entries
- `SessionDelegates` — receives data from iOS app via `WCSession`
- Complication data: `{ streak: Int, dailyText: Bool, prayers: Int, level: Int }`

**Android (Wear OS + Kotlin):**
- `WearableDataLayerService.kt` — syncs via `DataClient`
- `ComplicationDataSourceService.kt` — updates complications
- Uses `TileService` for glanceable tile on Wear OS

### Complication Refresh
- Background refresh every 15 minutes
- Push update when user completes a habit (via WatchConnectivity / DataClient)

## Watch App UI

### Main Screen
- Large streak number (center)
- Below: "day streak" label
- Tap: opens full habit status

### Quick Actions
- Force Touch → Mark Daily Text as read
- Crown scroll → View today's habits

### Complications (Home Screen)
- Recommended: Circular Small (streak count)
- Modular Small: Goals progress ring

## Build Configuration

### iOS Watch Target (Xcode)
```
Target: JW Habits Watch App
Bundle ID: com.ashbi.jwnews.watchkitapp
Deployment Target: watchOS 10.0+
Complication Family: All except Graphic Extra Large
```

### Android Wear Module (Gradle)
```
apply plugin: 'com.android.application'
apply plugin: 'kotlin-android'
// ...
minSdkVersion 30  // Wear OS 3+
targetSdkVersion 34
```
