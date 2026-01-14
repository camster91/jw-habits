# JW Progress Tracker

A Progressive Web App for tracking daily spiritual activities with direct links to JW Library.

## Features

- **Daily Text** - Track daily text reading with JW Library links
- **Bible Reading** - Follow the "Read Bible in One Year" schedule
- **Meeting Preparation** - Prepare for midweek and weekend meetings
- **Progress Statistics** - Track streaks and completion rates
- **PWA Notifications** - Get reminders for daily reading
- **Offline Support** - Works without internet connection
- **Install as App** - Add to home screen for native experience

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

Visit: http://localhost:5173

## Project Structure

```
jw-progress-tracker/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── public/
│   ├── pwa-192x192.png
│   ├── pwa-512x512.png
│   └── data/
│       ├── bible-reading.json      # 365-day reading schedule
│       └── meeting-workbooks.json  # Weekly meeting docids
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── components/
    │   ├── DailyTextCard.jsx
    │   ├── BibleReadingCard.jsx
    │   ├── MeetingCard.jsx
    │   ├── StreakCard.jsx
    │   ├── BottomNav.jsx
    │   └── QuickLinks.jsx
    ├── pages/
    │   ├── Home.jsx
    │   ├── Stats.jsx
    │   ├── Settings.jsx
    │   └── Links.jsx
    ├── stores/
    │   ├── progressStore.js
    │   └── settingsStore.js
    └── utils/
        ├── jwLibraryLinks.js
        └── notifications.js
```

## Deployment (Hostinger Static)

```
Build Command: npm run build
Publish Directory: dist
```

No Node.js server needed - just serves the built static files.

## Updating Meeting Workbooks

The meeting workbook links use docids from `public/data/meeting-workbooks.json`. Update this file with new weeks as needed:

```json
{
  "2026-W02": {
    "docid": "2025642",
    "weekOf": "January 5-11, 2026",
    "bibleReading": "Genesis 4-7"
  }
}
```

## Technology Stack

- **React 19** - UI framework
- **Vite 7** - Build tool
- **Tailwind CSS 4** - Styling
- **DaisyUI 5** - Component library
- **Zustand 5** - State management
- **vite-plugin-pwa** - PWA support

## PWA Installation

### Mobile (Chrome/Safari)
1. Open the app in browser
2. Tap "Share" or menu button
3. Select "Add to Home Screen"

### Desktop (Chrome/Edge)
1. Click install icon in address bar
2. Or use browser menu: "Install app"

## Disclaimer

This is an **unofficial** application and is not affiliated with, endorsed by, or connected to Jehovah's Witnesses or the Watch Tower Bible and Tract Society. All content links direct to JW.org and JW Library.

## License

MIT License
