# JW News PWA - Feature Specifications

## 🎯 Vision
A Progressive Web App that helps Jehovah's Witnesses stay up-to-date with daily spiritual activities, track their progress, and catch up on missed content from JW.org.

---

## 📱 Core Features

### 1. **Daily Text Tracker**
**Goal:** Help users read and track the daily text from "Examining the Scriptures Daily"

**Features:**
- [ ] Display today's daily text with scripture and comments
- [ ] Mark daily text as "read" for today
- [ ] Show reading streak (consecutive days read)
- [ ] Calendar view showing which days were completed
- [ ] Highlight missed days in the past week/month
- [ ] Quick navigation to previous/next day's text
- [ ] Share daily text to social media or messaging apps
- [ ] Bookmark favorite daily texts
- [ ] Search past daily texts by date or keyword

**UI Components:**
- Card with today's date and scripture reference
- Expandable text content
- "Mark as Read" checkbox/button
- Streak counter badge
- Mini calendar with completion indicators

---

### 2. **Bible Reading Tracker**
**Goal:** Follow the "Read the Bible in One Year" schedule and track progress

**Features:**
- [ ] Display today's Bible reading assignment
- [ ] Show chapter/book references with direct WOL links
- [ ] Mark reading as complete for the day
- [ ] Progress bar showing yearly completion percentage
- [ ] List of missed reading assignments
- [ ] "Catch-up mode" - shows all missed readings
- [ ] Ability to mark multiple days at once
- [ ] Reading statistics (total chapters read, books completed)
- [ ] Estimated time to complete each reading
- [ ] Notes section for each day's reading
- [ ] Highlight feature for important verses

**UI Components:**
- Daily assignment card with book/chapter info
- Completion checkbox
- Progress visualization (circular or linear)
- Missed assignments list (sortable)
- Statistics dashboard

---

### 3. **Weekly Meeting Tracker**
**Goal:** Help users prepare for and track weekly congregation meetings (Life and Ministry Meeting & Watchtower Study)

**Features:**
- [ ] **Current Week Display:**
  - Show this week's meeting schedule from WOL
  - Life and Ministry Meeting parts and assignments
  - Watchtower Study article and paragraphs
  - Weekly Bible reading assignment
  - Song numbers for the week

- [ ] **Preparation Tracking:**
  - Mark "Prepared for Midweek Meeting" ✓
  - Mark "Prepared for Weekend Meeting" ✓
  - Track which parts you've studied
  - Notes for each meeting part
  - Personal study time tracker

- [ ] **Meeting Material Display:**
  - Full text of Watchtower study article
  - Treasures from God's Word section
  - Apply Yourself to Field Ministry section
  - Living as Christians section
  - Direct links to videos/demonstrations
  - Print-friendly version

- [ ] **Multi-Week View:**
  - Navigate to past weeks (review what was covered)
  - See upcoming weeks (prepare ahead)
  - Week picker/calendar navigation
  - Search past meeting topics

- [ ] **Meeting Reminders:**
  - Notification 2 days before midweek meeting
  - Notification 2 days before weekend meeting
  - Custom reminder times
  - "Meeting tonight!" day-of reminder

- [ ] **Progress Statistics:**
  - Preparation streak tracking
  - Percentage of meetings prepared for
  - Average study time per week
  - Most studied sections

- [ ] **Integration Features:**
  - Auto-detect current week from date
  - Link Bible reading to weekly assignment
  - Highlight scriptures to look up
  - Download for offline use

- [ ] **Study Tools:**
  - Highlight/annotate paragraphs
  - Personal comments and answers
  - Scripture cross-references
  - Research additional material
  - Share study notes with family

**UI Components:**
- Week selector showing current week dates
- Two main cards: Midweek Meeting & Weekend Meeting
- Checklist for each meeting part
- Expandable sections for each program part
- "Mark Prepared" prominent button
- Time remaining to prepare indicator
- Quick links to WOL full schedule

**Data Structure:**
```javascript
{
  weekOf: '2026-01-05', // Week starting date
  midweekMeeting: {
    date: '2026-01-07',
    theme: 'Appreciating God\'s Mercy',
    bibleReading: 'Genesis 17-18',
    parts: [
      {
        title: 'Opening Comments',
        time: '1 min',
        studied: false
      },
      {
        title: 'Treasures: God Shows Mercy',
        time: '10 min',
        video: 'https://...',
        studied: true,
        notes: 'Focus on Abraham and Lot'
      },
      // ... more parts
    ],
    songs: [1, 25, 103],
    prepared: true,
    studyTime: 45 // minutes
  },
  weekendMeeting: {
    date: '2026-01-11',
    publicTalkTitle: 'Why We Can Trust the Bible',
    watchtowerArticle: {
      title: 'Love Bears All Things',
      paragraphs: 20,
      studied: false,
      highlights: [3, 7, 15],
      notes: {}
    },
    songs: [45, 72, 133],
    prepared: false
  }
}
```

**Scraping Source:**
- URL: `https://wol.jw.org/en/wol/meetings/r1/lp-e/{year}/{week}`
- Example: `https://wol.jw.org/en/wol/meetings/r1/lp-e/2026/2`
- Parse HTML for meeting schedule
- Extract parts, times, titles, links
- Cache weekly for offline access

**Priority Level:** HIGH - This is a killer feature that makes the app essential for meeting preparation!

---

### 4. **JW.org Content Feed**
**Goal:** Stay updated with latest videos, publications, and news from JW.org

**Features:**
- [ ] **Latest Videos** - New videos from JW Broadcasting
  - Thumbnail, title, duration
  - Mark as watched
  - Save for later
  - Filter by category (morning worship, reports, dramas, etc.)

- [ ] **New Publications** - Books, magazines, brochures
  - Cover image, title, publication date
  - Mark as read/downloaded
  - Reading progress tracker for books
  - Filter by type (book, magazine, brochure)

- [ ] **News Articles** - Latest from "What's New"
  - Title, summary, featured image
  - Mark as read
  - Category tags
  - Search functionality

- [ ] **Unified Activity Feed**
  - Combined view of all new content
  - Sort by date, type, or unread status
  - Filter by content type
  - Infinite scroll or pagination

**UI Components:**
- Card-based grid layout
- Category filter chips
- Search bar with autocomplete
- "Unread" badge indicators
- Quick action buttons (mark read, save, share)

---

### 5. **Catch-Up Dashboard**
**Goal:** Help users identify and complete missed spiritual activities

**Features:**
- [ ] Overview of all missed activities:
  - Daily texts not read (last 7/30 days)
  - Bible reading assignments not completed
  - Meetings not prepared for (current/upcoming week)
  - Unwatched videos
  - Unread publications

- [ ] Priority suggestions:
  - "Most important to catch up on"
  - Time-based priority (older = higher priority)

- [ ] Bulk actions:
  - Mark multiple items as complete
  - Skip items you don't want to track

- [ ] Catch-up plan generator:
  - "Catch up in 7 days" - distributes missed content
  - Daily suggested catch-up tasks

- [ ] Progress visualization:
  - How much behind vs. up-to-date
  - Trend graph (getting better/worse)

**UI Components:**
- Summary cards showing counts of missed items
- Priority list with checkboxes
- Progress charts (doughnut, bar graphs)
- "Quick catch-up" action buttons
- Timeline view of missed content

---

### 6. **Progress Tracking & Statistics**
**Goal:** Motivate users with visual progress and achievements

**Features:**
- [ ] **Streak Tracking:**
  - Current streak for daily text
  - Current streak for Bible reading
  - Longest streak ever
  - Streak recovery (don't break on one miss)

- [ ] **Completion Statistics:**
  - Daily text completion rate (%)
  - Bible reading completion rate (%)
  - Total chapters/books read this year
  - Content watched/read from JW.org

- [ ] **Visual Progress:**
  - Annual Bible reading progress circle
  - Monthly heatmap calendar (GitHub-style)
  - Week-at-a-glance completion grid

- [ ] **Achievements/Badges:**
  - "7-day streak" badge
  - "30-day streak" badge
  - "Completed a Bible book" badge
  - "Read 100 chapters" badge
  - "Caught up on everything" badge

- [ ] **History & Analytics:**
  - Activity history timeline
  - Best day of week for completing activities
  - Reading patterns over time

**UI Components:**
- Stats dashboard with cards
- Progress circles and bars
- Achievement badge gallery
- Interactive graphs (Chart.js or similar)
- Shareable stats cards for social media

---

### 7. **Notifications & Reminders**
**Goal:** Keep users engaged with timely notifications

**Features:**
- [ ] **Daily Reminders:**
  - Morning reminder for daily text (user-set time)
  - Evening reminder for Bible reading
  - Reminder if today's activities incomplete (8 PM?)

- [ ] **New Content Alerts:**
  - Notification when new video posted
  - Alert for new publication release
  - News article notifications

- [ ] **Meeting Preparation Reminders:**
  - "Midweek meeting in 2 days - time to prepare!" (Monday)
  - "Weekend meeting in 2 days - prepare Watchtower" (Friday)
  - "Meeting tonight!" reminder on meeting day
  - Custom preparation reminder times

- [ ] **Catch-up Nudges:**
  - Weekly summary of missed activities
  - "You have 3 unread daily texts" reminder
  - Motivational messages

- [ ] **Customization:**
  - Enable/disable each notification type
  - Set custom times for reminders
  - Choose notification sound/vibration
  - Quiet hours (no notifications during meetings)

**Notification Types:**
- Push notifications (when app not open)
- In-app notifications/banners
- Badge counts on app icon

---

### 8. **Personalization & Settings**
**Goal:** Customize the experience for each user

**Features:**
- [ ] **Preferences:**
  - Start day of week (for tracking)
  - Language preference (sync with JW.org languages)
  - Theme (light/dark mode, custom colors)
  - Default Bible translation
  - Content types to track

- [ ] **Notification Settings:**
  - Granular control over each notification type
  - Custom reminder times
  - Frequency settings

- [ ] **Data Management:**
  - Export progress data (JSON/CSV)
  - Import from backup
  - Reset all progress (with confirmation)
  - Clear cache/offline data

- [ ] **Privacy:**
  - All data stored locally (no account required)
  - Optional cloud sync (future feature)
  - Data encryption options

---

### 9. **Offline Support**
**Goal:** Work perfectly without internet connection

**Features:**
- [ ] Cache last 7 days of content
- [ ] Offline reading of cached daily texts
- [ ] Offline Bible reading assignments
- [ ] Queue actions when offline (mark as read, etc.)
- [ ] Sync when back online
- [ ] Offline indicator in UI
- [ ] Download specific content for offline use

---

### 10. **Social & Sharing**
**Goal:** Share spiritual content with others

**Features:**
- [ ] Share daily text to:
  - WhatsApp, Telegram, Signal
  - Email, SMS
  - Social media (Facebook, Twitter, Instagram stories)

- [ ] Share progress:
  - "I completed my 30-day streak!" with image
  - Share yearly reading progress

- [ ] Group features (future):
  - Family/congregation progress tracking
  - Shared reading goals
  - Leaderboards (optional, friendly competition)

---

## 🎨 UI/UX Design Principles

### Design Goals:
1. **Simple & Clean** - Not overwhelming, easy to navigate
2. **Mobile-First** - Optimized for phones, works great on tablets/desktop
3. **Fast** - Instant loading, smooth animations
4. **Accessible** - WCAG 2.1 AA compliant, screen reader support
5. **Beautiful** - Modern design, pleasant to use daily

### Color Scheme Ideas:
- **Option 1: JW.org Inspired**
  - Primary: #4A6FA4 (JW blue)
  - Accent: #71BC37 (green for completed items)
  - Background: #F8F8F8 (light gray)

- **Option 2: Warm & Welcoming**
  - Primary: #5B7C99 (soft blue)
  - Accent: #E8A735 (warm gold)
  - Background: #FAFAF9 (warm white)

### Layout Structure:
```
┌─────────────────────────┐
│   Header / App Bar      │
├─────────────────────────┤
│                         │
│   Main Content Area     │
│   (Dashboard/Feed)      │
│                         │
│                         │
├─────────────────────────┤
│  Bottom Navigation      │
│  [Home][Feed][Stats][⚙] │
└─────────────────────────┘
```

### Navigation:
- **Bottom Tab Bar** (Mobile):
  - Home (Today's activities)
  - Feed (JW.org content)
  - Progress (Stats & catch-up)
  - Settings

- **Side Navigation** (Tablet/Desktop):
  - Collapsible sidebar
  - Same sections as mobile tabs

---

## 🛠 Technical Architecture

### Frontend Stack:
**Recommended: React + Vite**
- Fast build times
- Hot module replacement
- Great PWA support with plugins

**Alternative: Vue 3 + Vite** or **Svelte Kit**

### Key Libraries:
- **UI Framework:**
  - Tailwind CSS + DaisyUI/Shadcn
  - Or Material UI (MUI)

- **State Management:**
  - React Context + useReducer
  - Or Zustand (lightweight)

- **Data Storage:**
  - IndexedDB (via Dexie.js) for progress tracking
  - LocalStorage for settings

- **PWA Tools:**
  - Workbox (service worker)
  - vite-plugin-pwa

- **Notifications:**
  - Web Push API
  - OneSignal or Firebase Cloud Messaging (optional backend)

- **Charts/Graphs:**
  - Chart.js or Recharts
  - React Calendar Heatmap

- **Date Handling:**
  - date-fns (lightweight alternative to moment.js)

### Backend Stack:
**Node.js + Express API**
- Serves cached content from JW.org
- Handles web scraping (Puppeteer)
- Manages push notification subscriptions
- Rate limiting to protect JW.org servers

**Database:**
- PostgreSQL or MongoDB for content cache
- Redis for rate limiting
- Or SQLite for simplicity

**API Endpoints:**
```
GET  /api/daily-text/:date
GET  /api/bible-reading/:dayOfYear
GET  /api/videos?limit=20&offset=0
GET  /api/publications?type=book&limit=20
GET  /api/news?limit=20
POST /api/subscribe (push notifications)
```

### Deployment:
- **Frontend:** Vercel, Netlify, or Cloudflare Pages
- **Backend:** Railway, Render, or Fly.io
- **Database:** Railway, Supabase, or PlanetScale

---

## 📊 Data Models

### User Progress (IndexedDB)
```javascript
{
  dailyTexts: [
    { date: '2026-01-09', read: true, bookmarked: false },
    { date: '2026-01-08', read: false, bookmarked: false }
  ],
  bibleReadings: [
    { dayOfYear: 9, read: true, notes: 'Great chapter!', timeSpent: 15 },
    { dayOfYear: 8, read: true, notes: '', timeSpent: 10 }
  ],
  contentProgress: [
    { type: 'video', id: 'video-123', watched: true, savedForLater: false },
    { type: 'publication', id: 'book-456', progress: 45, completed: false }
  ],
  streaks: {
    dailyText: { current: 7, longest: 30, lastRead: '2026-01-09' },
    bibleReading: { current: 5, longest: 45, lastRead: '2026-01-09' }
  },
  achievements: ['streak-7', 'streak-30', 'book-completed', 'chapter-100']
}
```

### Settings
```javascript
{
  notifications: {
    dailyTextReminder: { enabled: true, time: '08:00' },
    bibleReadingReminder: { enabled: true, time: '19:00' },
    newContentAlerts: { enabled: true },
    catchupReminders: { enabled: true, frequency: 'weekly' }
  },
  appearance: {
    theme: 'auto', // 'light', 'dark', 'auto'
    language: 'en',
    accentColor: '#4A6FA4'
  },
  tracking: {
    enableDailyText: true,
    enableBibleReading: true,
    enableVideos: true,
    enablePublications: true,
    enableNews: true
  }
}
```

---

## 🚀 Development Phases

### Phase 1: MVP (Minimum Viable Product)
**Goal:** Basic working PWA with core features
- [ ] PWA setup (manifest, service worker)
- [ ] Daily text display and tracking
- [ ] Bible reading tracker (basic)
- [ ] Local storage for progress
- [ ] Simple notifications
- [ ] Basic UI with bottom navigation

**Timeline:** 2-3 weeks

### Phase 2: Content Feed
**Goal:** Add JW.org content integration
- [ ] Backend API for scraping
- [ ] Videos feed with tracking
- [ ] Publications feed
- [ ] News articles feed
- [ ] Mark as read/watched functionality

**Timeline:** 2-3 weeks

### Phase 3: Advanced Tracking
**Goal:** Rich progress tracking and statistics
- [ ] Catch-up dashboard
- [ ] Detailed statistics
- [ ] Streak tracking
- [ ] Achievement system
- [ ] Calendar heatmap
- [ ] Progress charts

**Timeline:** 2 weeks

### Phase 4: Polish & Features
**Goal:** Production-ready with nice-to-haves
- [ ] Advanced notifications
- [ ] Offline support (robust)
- [ ] Sharing functionality
- [ ] Search and filters
- [ ] Accessibility improvements
- [ ] Performance optimization

**Timeline:** 2 weeks

### Phase 5: Optional Enhancements
**Goal:** Future features
- [ ] Cloud sync (optional accounts)
- [ ] Family/group features
- [ ] Multi-language support
- [ ] Advanced Bible study tools
- [ ] Integration with JW Library app (if possible)

---

## 🎯 Success Metrics

### User Engagement:
- Daily active users
- Retention rate (7-day, 30-day)
- Average session duration
- Features most used

### Completion Rates:
- % of users who complete daily text each day
- % of users on track with Bible reading
- % of users who use catch-up features

### Technical Metrics:
- Page load time (< 2 seconds)
- Time to interactive (< 3 seconds)
- Offline functionality works 100%
- Lighthouse PWA score: 90+

---

## 💡 Future Ideas

### Advanced Features:
- [ ] Bible study notes with cloud sync
- [ ] Audio playback of daily text
- [ ] Voice reminders (Alexa/Google Home integration)
- [ ] Apple Watch / Wear OS complications
- [ ] Desktop app (Electron wrapper)
- [ ] Browser extension for quick access

### Community Features:
- [ ] Congregation leaderboards (optional)
- [ ] Family progress sharing
- [ ] Reading groups/challenges
- [ ] Discuss daily text with others

### Gamification:
- [ ] XP points for completing activities
- [ ] Level system
- [ ] Unlockable themes/avatars
- [ ] Friendly competition modes

---

## 📝 Notes

**Important Considerations:**
1. **Respect JW.org:** Don't overload servers, cache responsibly
2. **No official affiliation:** Make it clear this is unofficial
3. **Privacy first:** All data local by default
4. **Accessibility:** Must work for all users, including elderly
5. **Offline-first:** Many users have limited internet access

**Inspiration:**
- Duolingo (streaks, gamification)
- Habitica (habit tracking)
- Notion (clean UI, flexibility)
- Apple Health (progress rings)
- GitHub (contribution heatmap)

---

## 🤝 Contributing Ideas Welcome!

This is a living document. Feature suggestions and improvements are welcome as we build this PWA!
