# CLAUDE.md — JW Habits

## What This Is
A Capacitor (React + Vite) mobile app for Jehovah's Witnesses to track daily spiritual habits. Published as "JW Habits" on Android/iOS. Bundle ID: `com.jwprogress.app`

## Stack
- React + Vite (frontend)
- Capacitor 8 (iOS + Android wrapper)
- Zustand stores (state management)
- DaisyUI + Tailwind (styling)
- PWA enabled

## Key Files
- `src/stores/` — all state (progressStore, settingsStore, gamificationStore, memoriesStore, newsStore)
- `src/pages/` — Home, Meeting, Stats, Goals, Links, Memories, News, Settings
- `src/components/` — reusable components
- `src/hooks/useDrawer.js` — drawer context (import from HERE, not SideDrawer.tsx)
- `capacitor.config.json` — app config
- `android/app/jw-habits-release.keystore` — release signing key
- `APP_STORE_SUBMISSION.md` — store submission guide

## Known Issues Fixed
- `useDrawer` was imported from `components/SideDrawer` — correct import is `hooks/useDrawer`
- `READING_PACE_OPTIONS` was missing from `settingsStore.ts` exports — now added

## Build
```bash
npm run build        # Build web
npx cap sync android # Sync to Android
npx cap open android # Open Android Studio → Generate Signed Bundle
```

## DO NOT
- Do not remove the `READING_PACE_OPTIONS` export from settingsStore.ts
- Do not change the import path of `useDrawer` back to SideDrawer
- Keystore password: JWHabits2026! — never commit this to git

## Next Steps
- Get screenshots for Google Play listing
- Register Google Play Developer account ($25)
- Write/host privacy policy at ashbi.ca/privacy/jw-habits
