# JW News PWA - Technical Stack & Implementation Plan

## 🏗 Recommended Architecture

### **Full Stack PWA Architecture**

```
┌─────────────────────────────────────────────────────┐
│                   PWA Frontend                       │
│  (React + Vite + Tailwind + Workbox)                │
│                                                      │
│  - Daily Text Tracker                               │
│  - Bible Reading Progress                           │
│  - Content Feed Viewer                              │
│  - Offline Support (Service Worker)                 │
│  - IndexedDB (User Progress)                        │
│  - Push Notifications                               │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ REST API / GraphQL
                   │
┌──────────────────▼──────────────────────────────────┐
│              Backend API Server                      │
│         (Node.js + Express)                         │
│                                                      │
│  - Content Scraper (Puppeteer)                      │
│  - Cache Management                                 │
│  - Push Notification Service                        │
│  - Rate Limiting                                    │
└──────────────────┬──────────────────────────────────┘
                   │
                   │
┌──────────────────▼──────────────────────────────────┐
│              Data Storage                            │
│                                                      │
│  - PostgreSQL (Content Cache)                       │
│  - Redis (Rate Limiting, Sessions)                  │
│  - S3/CDN (Images, Static Assets)                   │
└─────────────────────────────────────────────────────┘
```

---

## 📦 Frontend Stack

### **Framework: React 18 + Vite**

**Why React?**
- ✅ Large ecosystem, great PWA support
- ✅ Strong community, lots of resources
- ✅ Excellent mobile performance with lazy loading
- ✅ Easy to learn and maintain

**Why Vite?**
- ✅ Lightning-fast dev server
- ✅ Built-in PWA plugin
- ✅ Optimized production builds
- ✅ Hot Module Replacement (HMR)

**Initial Setup:**
```bash
npm create vite@latest jw-news-pwa -- --template react
cd jw-news-pwa
npm install
```

### **Styling: Tailwind CSS + DaisyUI**

**Tailwind CSS:**
- Utility-first CSS framework
- Highly customizable
- Small bundle size (purges unused styles)
- Responsive design made easy

**DaisyUI:**
- Component library for Tailwind
- Pre-built components (cards, buttons, modals)
- Multiple theme support out of the box
- Accessibility built-in

```bash
npm install -D tailwindcss postcss autoprefixer daisyui
npm install @headlessui/react @heroicons/react
npx tailwindcss init -p
```

**Alternative:** shadcn/ui (more customizable, no runtime)

### **State Management: Zustand**

**Why Zustand?**
- ✅ Lightweight (1KB)
- ✅ Simple API, no boilerplate
- ✅ No Context Provider hell
- ✅ Great TypeScript support
- ✅ Built-in devtools

```bash
npm install zustand
```

**Store Example:**
```javascript
// stores/progressStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useProgressStore = create(
  persist(
    (set, get) => ({
      dailyTexts: {},
      bibleReadings: {},
      streaks: { dailyText: 0, bibleReading: 0 },

      markDailyTextRead: (date) => set((state) => ({
        dailyTexts: { ...state.dailyTexts, [date]: { read: true } }
      })),

      markBibleReadingComplete: (day) => set((state) => ({
        bibleReadings: { ...state.bibleReadings, [day]: { read: true } }
      }))
    }),
    { name: 'jw-progress-storage' }
  )
);
```

### **Data Storage: Dexie.js (IndexedDB)**

**Why IndexedDB?**
- ✅ Store large amounts of data offline
- ✅ Much larger storage than localStorage (50MB+)
- ✅ Indexed queries for fast search
- ✅ Async operations

**Dexie.js:**
- Simplified IndexedDB API
- Promise-based, async/await support
- Powerful queries

```bash
npm install dexie dexie-react-hooks
```

**Database Schema:**
```javascript
// db/database.js
import Dexie from 'dexie';

export const db = new Dexie('JWNewsDB');

db.version(1).stores({
  dailyTexts: 'date, read, bookmarked, content',
  bibleReadings: 'dayOfYear, read, notes, chapters',
  videos: 'id, watched, savedForLater, title, date',
  publications: 'id, progress, completed, title, date',
  news: 'id, read, title, date',
  settings: 'key, value'
});
```

### **PWA Tools: vite-plugin-pwa**

**Workbox Integration:**
```bash
npm install -D vite-plugin-pwa
```

**vite.config.js:**
```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'JW News & Progress Tracker',
        short_name: 'JW News',
        description: 'Track daily text, Bible reading, and JW.org updates',
        theme_color: '#4A6FA4',
        background_color: '#FFFFFF',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.jwnews\.app\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          }
        ]
      }
    })
  ]
});
```

### **Notifications: Web Push API + React**

```bash
npm install web-push
```

**Frontend Component:**
```javascript
// hooks/useNotifications.js
import { useState, useEffect } from 'react';

export function useNotifications() {
  const [permission, setPermission] = useState(Notification.permission);

  const requestPermission = async () => {
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  };

  const sendNotification = (title, options) => {
    if (permission === 'granted') {
      new Notification(title, options);
    }
  };

  return { permission, requestPermission, sendNotification };
}
```

### **Date Handling: date-fns**

**Why date-fns?**
- ✅ Modular (import only what you need)
- ✅ Immutable, pure functions
- ✅ Great TypeScript support
- ✅ 2KB vs Moment.js 67KB

```bash
npm install date-fns
```

### **Charts: Recharts**

**Why Recharts?**
- ✅ React components
- ✅ Responsive charts
- ✅ Beautiful defaults
- ✅ Composable API

```bash
npm install recharts
npm install react-calendar-heatmap
```

### **Routing: React Router v6**

```bash
npm install react-router-dom
```

### **Icons: Heroicons + Lucide React**

```bash
npm install @heroicons/react lucide-react
```

---

## 🔧 Backend Stack

### **Framework: Express.js**

```bash
npm install express cors helmet compression morgan
npm install -D nodemon
```

### **Web Scraping: Puppeteer**

Already in your stack! Reuse existing scraping logic.

```bash
npm install puppeteer
```

### **Database: PostgreSQL + Prisma ORM**

**Prisma:**
- Type-safe database client
- Automatic migrations
- Great DX with VS Code

```bash
npm install @prisma/client
npm install -D prisma

npx prisma init
```

**Schema Example:**
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model DailyText {
  id        String   @id @default(cuid())
  date      DateTime @unique
  scripture String
  title     String
  content   String   @db.Text
  createdAt DateTime @default(now())
}

model Video {
  id          String   @id @default(cuid())
  jwOrgId     String   @unique
  title       String
  description String?  @db.Text
  thumbnail   String
  url         String
  duration    Int?
  category    String?
  publishedAt DateTime
  createdAt   DateTime @default(now())
}

model Publication {
  id          String   @id @default(cuid())
  jwOrgId     String   @unique
  title       String
  type        String
  coverImage  String?
  url         String
  publishedAt DateTime
  createdAt   DateTime @default(now())
}
```

**Alternative:** MongoDB with Mongoose (simpler for this use case)

### **Caching: Redis**

```bash
npm install redis ioredis
```

**Usage:**
```javascript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cache daily text for 24 hours
await redis.setex(`daily-text:${date}`, 86400, JSON.stringify(data));

// Get cached data
const cached = await redis.get(`daily-text:${date}`);
```

### **Push Notifications: web-push**

```bash
npm install web-push
```

**Setup:**
```javascript
const webpush = require('web-push');

const vapidKeys = webpush.generateVAPIDKeys();

webpush.setVapidDetails(
  'mailto:jworgnewsfeed@gmail.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Send notification
await webpush.sendNotification(subscription, JSON.stringify({
  title: 'Daily Text Available!',
  body: 'Check out today\'s scripture',
  icon: '/icon.png'
}));
```

### **Rate Limiting: express-rate-limit**

```bash
npm install express-rate-limit
```

**Protect JW.org from abuse:**
```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### **API Documentation: Swagger/OpenAPI**

```bash
npm install swagger-ui-express swagger-jsdoc
```

---

## 📁 Project Structure

```
jw-news-pwa/
├── frontend/                    # React PWA
│   ├── public/
│   │   ├── manifest.json
│   │   ├── icons/
│   │   └── sw.js
│   ├── src/
│   │   ├── components/
│   │   │   ├── DailyText/
│   │   │   │   ├── DailyTextCard.jsx
│   │   │   │   └── DailyTextCalendar.jsx
│   │   │   ├── BibleReading/
│   │   │   │   ├── ReadingTracker.jsx
│   │   │   │   └── ProgressCircle.jsx
│   │   │   ├── Feed/
│   │   │   │   ├── VideoCard.jsx
│   │   │   │   ├── PublicationCard.jsx
│   │   │   │   └── NewsCard.jsx
│   │   │   ├── Progress/
│   │   │   │   ├── StatsCard.jsx
│   │   │   │   ├── StreakDisplay.jsx
│   │   │   │   └── CatchUpList.jsx
│   │   │   └── Layout/
│   │   │       ├── BottomNav.jsx
│   │   │       ├── Header.jsx
│   │   │       └── Sidebar.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Feed.jsx
│   │   │   ├── Progress.jsx
│   │   │   └── Settings.jsx
│   │   ├── hooks/
│   │   │   ├── useNotifications.js
│   │   │   ├── useOfflineSync.js
│   │   │   └── useProgress.js
│   │   ├── stores/
│   │   │   ├── progressStore.js
│   │   │   ├── settingsStore.js
│   │   │   └── contentStore.js
│   │   ├── db/
│   │   │   └── database.js
│   │   ├── api/
│   │   │   └── client.js
│   │   ├── utils/
│   │   │   ├── dateHelpers.js
│   │   │   ├── streakCalculator.js
│   │   │   └── notifications.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── backend/                     # Express API
│   ├── src/
│   │   ├── routes/
│   │   │   ├── dailyText.js
│   │   │   ├── bibleReading.js
│   │   │   ├── videos.js
│   │   │   ├── publications.js
│   │   │   └── notifications.js
│   │   ├── scrapers/
│   │   │   ├── dailyTextScraper.js
│   │   │   ├── videoScraper.js
│   │   │   └── publicationScraper.js
│   │   ├── services/
│   │   │   ├── cacheService.js
│   │   │   ├── notificationService.js
│   │   │   └── scrapingScheduler.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   ├── rateLimiter.js
│   │   │   └── errorHandler.js
│   │   ├── db/
│   │   │   └── prisma.js
│   │   ├── utils/
│   │   │   └── logger.js
│   │   └── index.js
│   ├── prisma/
│   │   └── schema.prisma
│   ├── package.json
│   └── .env
│
├── shared/                      # Shared types/utils
│   └── types.ts
│
├── docs/
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── CONTRIBUTING.md
│
├── .github/
│   └── workflows/
│       ├── frontend-deploy.yml
│       └── backend-deploy.yml
│
└── README.md
```

---

## 🚀 Development Workflow

### **1. Setup Development Environment**

```bash
# Clone repository
git clone <repo-url>
cd JW-News

# Setup frontend
cd frontend
npm install
npm run dev  # http://localhost:5173

# Setup backend (in new terminal)
cd backend
npm install
npx prisma migrate dev
npm run dev  # http://localhost:3001
```

### **2. Environment Variables**

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:3001/api
VITE_VAPID_PUBLIC_KEY=your-public-key
```

**Backend (.env):**
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/jwnews
REDIS_URL=redis://localhost:6379
VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key
VAPID_SUBJECT=mailto:jworgnewsfeed@gmail.com
NODE_ENV=development
PORT=3001
```

### **3. Database Setup**

```bash
# Start PostgreSQL (Docker)
docker run --name jwnews-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=jwnews \
  -p 5432:5432 \
  -d postgres:15

# Start Redis
docker run --name jwnews-redis -p 6379:6379 -d redis:7

# Run migrations
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

---

## 🎯 MVP Implementation Order

### **Week 1: Setup + Daily Text**
1. ✅ Initialize React + Vite project
2. ✅ Setup Tailwind CSS + DaisyUI
3. ✅ Create basic PWA manifest
4. ✅ Setup routing (React Router)
5. ✅ Create daily text component
6. ✅ Implement IndexedDB with Dexie
7. ✅ Add "mark as read" functionality
8. ✅ Create backend endpoint for daily text

### **Week 2: Bible Reading Tracker**
1. ✅ Create Bible reading tracker UI
2. ✅ Implement progress calculation
3. ✅ Add calendar view
4. ✅ Build backend endpoint for readings
5. ✅ Add streak tracking logic
6. ✅ Create progress visualization

### **Week 3: PWA Features + Offline**
1. ✅ Implement service worker (Workbox)
2. ✅ Add offline detection
3. ✅ Cache strategies for content
4. ✅ Implement offline sync queue
5. ✅ Add install prompt
6. ✅ Test offline functionality

### **Week 4: Content Feed**
1. ✅ Build video feed UI
2. ✅ Create publication feed
3. ✅ Add news articles feed
4. ✅ Implement filtering/sorting
5. ✅ Backend scrapers for each content type
6. ✅ Add mark as watched/read

### **Week 5: Notifications + Polish**
1. ✅ Implement push notifications
2. ✅ Create notification settings
3. ✅ Add daily reminders
4. ✅ Build catch-up dashboard
5. ✅ Create statistics page
6. ✅ UI polish and accessibility

---

## 🌐 Deployment

### **Frontend: Vercel** (Recommended)

**Why Vercel?**
- Free tier with generous limits
- Automatic deployments from Git
- Global CDN
- Perfect for React/Vite

```bash
npm install -g vercel
cd frontend
vercel
```

**Alternative:** Netlify, Cloudflare Pages

### **Backend: Railway** (Recommended)

**Why Railway?**
- Free tier: $5 credit/month
- Includes PostgreSQL + Redis
- Easy environment variables
- Auto-deploy from Git

```bash
npm install -g @railway/cli
cd backend
railway login
railway init
railway up
```

**Alternative:** Render, Fly.io, Heroku

### **Database: Railway PostgreSQL** (Included)

**Alternative:** Supabase (free tier with 500MB)

### **Redis: Upstash** (Serverless Redis)

Free tier: 10,000 commands/day

---

## 📊 Performance Targets

### **Lighthouse Scores:**
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 90+
- PWA: 100

### **Load Times:**
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Largest Contentful Paint: < 2.5s

### **Bundle Size:**
- Initial JS: < 150KB gzipped
- CSS: < 20KB gzipped
- Total page weight: < 500KB

---

## 🔒 Security Considerations

1. **Content Security Policy (CSP)**
2. **HTTPS only** (no mixed content)
3. **Input sanitization** on user notes
4. **Rate limiting** on API
5. **CORS** properly configured
6. **No sensitive data** in localStorage
7. **Regular dependency updates** (`npm audit`)

---

## 📈 Monitoring & Analytics

### **Error Tracking: Sentry**

```bash
npm install @sentry/react
```

### **Analytics: Privacy-friendly options**

- Plausible Analytics (privacy-first)
- Fathom Analytics
- Simple Analytics

**Avoid:** Google Analytics (privacy concerns)

### **Uptime Monitoring:**

- UptimeRobot (free)
- Better Stack (formerly Oh Dear)

---

## ✅ Ready to Start?

Would you like me to:
1. **Initialize the React PWA** with all the dependencies?
2. **Create the basic project structure**?
3. **Build the MVP daily text tracker** first?
4. **Set up the backend API**?

Let me know where you'd like to start!
