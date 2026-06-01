# JW Daily Habits Tracker

**A spiritual habits tracking app for building consistent daily routines.**

JW Daily Habits Tracker is a mobile-first progressive web application designed to help users build and maintain daily spiritual habits. Built with React 19 and Capacitor, it offers a native app experience across iOS, Android, and web platforms.

## Tech Stack

### Core
- **React 19** - UI framework
- **Vite 7** - Build tool and dev server
- **TypeScript** - Type safety

### Mobile
- **Capacitor 8** - Native runtime bridge
- **@capacitor/ios** - iOS native features
- **@capacitor/android** - Android native features

### Styling
- **Tailwind CSS 3** - Utility-first styling
- **DaisyUI 4** - Component library

### State Management
- **Zustand** - Lightweight global state

### Navigation
- **React Router DOM 7** - Client-side routing

### Mobile Features
- **@capacitor/local-notifications** - Local push notifications
- **@capacitor/push-notifications** - Remote push notifications
- **@capacitor/preferences** - Persistent storage
- **@capacitor/haptics** - Haptic feedback

## Key Features

### Habit Tracking
- Daily text reading tracking
- Bible reading progress
- Meeting preparation reminders
- Ministry activity logging

### Progress Visualization
- Streak tracking
- Weekly/monthly statistics
- Visual progress charts
- Achievement badges

### Notifications
- Custom reminder times
- Daily habit reminders
- Meeting prep notifications
- Streak milestone alerts

### Data Management
- Local-first storage
- Cloud sync capability
- Export/import data
- Privacy-focused design

## Installation

### Prerequisites
- Node.js 18+
- npm or yarn

### Web Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/camster91/jw-daily-habits-tracker.git
   cd jw-daily-habits-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

Visit `http://localhost:5173` for the web version.

### Mobile Setup (iOS/Android)

```bash
# Build web assets
npm run build

# Add platforms (first time)
npm run mobile:add:ios      # iOS
npm run mobile:add:android  # Android

# Sync and open native IDE
npm run mobile:ios          # Opens Xcode
npm run mobile:android      # Opens Android Studio
```

## Usage

### Development Commands

```bash
npm run dev           # Start Vite dev server
npm run build         # Build for production
npm run preview       # Preview production build
npm run lint          # Run ESLint
npm run format        # Format with Prettier
npm run test          # Run Vitest tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

### Mobile Commands

```bash
npm run mobile:build      # Build and sync for mobile
npm run mobile:ios        # Build and open Xcode
npm run mobile:android    # Build and open Android Studio
npm run cap:sync          # Sync web assets to native
npm run cap:open:ios      # Open iOS project
npm run cap:open:android  # Open Android project
```

### Android Build Commands

```bash
npm run android:build:debug    # Debug APK
npm run android:build:release   # Release APK
npm run android:bundle          # Play Store bundle
```

## Project Structure

```
jw-daily-habits-tracker/
├── src/
│   ├── components/        # Reusable UI components
│   ├── pages/             # Route components
│   ├── hooks/             # Custom React hooks
│   ├── stores/            # Zustand stores
│   ├── utils/             # Utility functions
│   ├── assets/            # Static assets
│   ├── App.jsx            # Root component
│   ├── main.jsx           # Entry point
│   └── index.css          # Global styles
├── android/               # Android native project
├── ios/                   # iOS native project
├── capacitor.config.json  # Capacitor configuration
├── vite.config.ts         # Vite configuration
└── package.json
```

## Core Modules

### Daily Text
- Today's scripture and commentary
- Reading progress tracking
- Notes and highlights

### Bible Reading
- Weekly reading schedule
- Progress visualization
- Completion streaks

### Meeting Preparation
- Weekly meeting schedule
- Preparation reminders
- Note-taking

### Ministry Tracker
- Activity logging
- Time tracking
- Return visit management

## Configuration

### Capacitor Config

```json
{
  "appId": "com.jwnews.habits",
  "appName": "JW Daily Habits",
  "webDir": "dist",
  "server": {
    "androidScheme": "https"
  },
  "plugins": {
    "LocalNotifications": {
      "smallIcon": "ic_stat_notification"
    }
  }
}
```

### Environment Variables

```env
VITE_API_URL=your_api_url
VITE_NOTIFICATION_KEY=your_notification_key
```

## Deployment

### Web (PWA)

```bash
npm run build
# Deploy dist/ folder to static hosting
```

### iOS App Store

1. Build and open Xcode: `npm run mobile:ios`
2. Configure signing in Xcode
3. Archive and submit to App Store Connect

### Android Play Store

```bash
npm run android:bundle
# Upload .aab to Play Console
```

## Background Services

The app includes a simple API server for optional backend features:

```bash
npm run dev:server    # Start API server only
npm run dev:full      # Start both Vite and API server
```

## Roadmap

- [ ] Add cloud sync for cross-device data
- [ ] Implement sharing features
- [ ] Add widget support
- [ ] Apple Watch companion app
- [ ] Enhanced analytics dashboard

## Testing

```bash
npm run test          # Run unit tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## Documentation

- `MOBILE_BUILD_GUIDE.md` - Detailed mobile build instructions
- `APP_STORE_SUBMISSION.md` - App store submission guide
- `PRIVACY_POLICY.md` - Privacy policy

## License

Private - This project is proprietary and confidential.

## Author

Developed by Cameron Ashley.
