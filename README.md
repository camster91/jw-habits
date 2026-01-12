# JW News PWA 📱

A Progressive Web App for tracking daily spiritual activities from JW.org.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- 📖 **Daily Text Tracker** - Read and track Examining the Scriptures Daily
- 📚 **Bible Reading Schedule** - Follow the "Read Bible in One Year" program
- 🎤 **Weekly Meetings** - Prepare for midweek and weekend meetings
- 📊 **Progress Statistics** - Track streaks, completion rates, and achievements
- 🔔 **Smart Reminders** - Get notified for daily reading and meeting preparation
- 📴 **Offline Support** - Works without internet connection
- 📱 **Install as App** - Add to home screen for native-like experience

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/camster91/JW-News.git
cd JW-News

# Install all dependencies (frontend + backend)
npm install

# Start development servers
npm run dev:backend  # Terminal 1
npm run dev:frontend # Terminal 2
```

Visit:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## 📁 Project Structure

```
JW-News/
├── frontend/          # React PWA application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── stores/       # Zustand state management
│   │   ├── api/          # API client
│   │   └── utils/        # Helper functions
│   ├── public/           # Static assets
│   └── package.json
│
├── backend/           # Express API server
│   ├── src/
│   │   ├── routes/       # API endpoints
│   │   ├── scrapers/     # WOL web scrapers
│   │   ├── services/     # Business logic
│   │   └── server.js     # Main server file
│   └── package.json
│
├── docs/              # Documentation
│   ├── PWA-FEATURES.md
│   ├── TECH-STACK.md
│   ├── TESTING-GUIDE.md
│   └── PROGRESS-SUMMARY.md
│
├── Data files
│   ├── bible.txt         # 365-day Bible reading schedule
│   └── days.txt          # Daily scriptures
│
└── package.json       # Root monorepo config
```

## 🛠 Development

### Available Scripts

**Root level:**
```bash
npm install            # Install all dependencies (runs postinstall automatically)
npm run dev:backend    # Start backend server (port 3001)
npm run dev:frontend   # Start frontend dev server (port 5173)
npm run build          # Build frontend for production
npm start              # Start backend in production mode
```

**Frontend (cd frontend):**
```bash
npm run dev            # Start Vite dev server
npm run build          # Build for production
npm run preview        # Preview production build
```

**Backend (cd backend):**
```bash
npm run dev            # Start with auto-reload
npm start              # Start server
```

## 🌐 Deployment

### Option 1: Hostinger (Recommended)

See [HOSTINGER-DEPLOY.md](./HOSTINGER-DEPLOY.md) for detailed step-by-step instructions.

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Initial deployment"
   git push origin main
   ```

2. **Connect to Hostinger:**
   - Go to Hostinger control panel
   - Create new Node.js application
   - Connect GitHub repository: `camster91/JW-News`
   - Set Node.js version: **18.x or higher**
   - Build command: `npm run build`
   - Start command: `npm start`
   - Port: `3001`

3. **Set Environment Variables:**
   ```env
   NODE_ENV=production
   PORT=3001
   FRONTEND_URL=https://your-domain.com
   ```

### Option 2: Separate Deployments

**Frontend (Vercel/Netlify):**
- Deploy from `frontend/` directory
- Build command: `npm run build`
- Output directory: `dist`

**Backend (Railway/Render):**
- Deploy from `backend/` directory
- Start command: `npm start`
- Set `FRONTEND_URL` environment variable

## 📊 API Endpoints

Base URL: `http://localhost:3001/api`

### Daily Text
- `GET /daily-text/today` - Get today's daily text
- `GET /daily-text/:date` - Get specific date (YYYY-MM-DD)

### Bible Reading
- `GET /bible-reading/today` - Get today's reading
- `GET /bible-reading/day/:dayOfYear` - Get specific day (1-366)
- `GET /bible-reading/progress` - Get yearly progress

### Meetings
- `GET /meetings/current` - Get current week's meetings
- `GET /meetings/week/:year/:week` - Get specific week

### System
- `GET /health` - Server health check

## 🔧 Configuration

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001/api
```

### Backend (.env)
```env
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173
```

## 📱 PWA Installation

### Mobile (Chrome/Safari)
1. Open the app in browser
2. Tap "Share" or "Menu"
3. Select "Add to Home Screen"
4. Enjoy native-like experience!

### Desktop (Chrome/Edge)
1. Click install icon in address bar
2. Or use browser menu: "Install app"

## 🧪 Testing

See [docs/TESTING-GUIDE.md](./docs/TESTING-GUIDE.md) for comprehensive testing instructions.

```bash
# Quick test checklist:
✅ Backend starts: npm run dev:backend
✅ Frontend starts: npm run dev:frontend
✅ Health check: curl http://localhost:3001/health
✅ Daily text loads in browser
✅ Bible reading loads
✅ Meetings load
✅ Progress persists after refresh
```

## 🏗 Technology Stack

### Frontend
- **React 18** - UI framework
- **Vite 5** - Build tool
- **Tailwind CSS** - Styling
- **DaisyUI** - Component library
- **Zustand** - State management
- **React Router** - Navigation
- **date-fns** - Date utilities

### Backend
- **Node.js 18+** - Runtime
- **Express 4** - Web framework
- **Puppeteer** - Web scraping
- **node-cache** - In-memory caching
- **Helmet** - Security
- **CORS** - Cross-origin support

## 📖 Documentation

- [PWA Features](./docs/PWA-FEATURES.md) - Complete feature specifications
- [Technical Stack](./docs/TECH-STACK.md) - Architecture details
- [Testing Guide](./docs/TESTING-GUIDE.md) - How to test the application
- [Deployment Guide](./HOSTINGER-DEPLOY.md) - Hostinger deployment instructions
- [Progress Summary](./docs/PROGRESS-SUMMARY.md) - Development journey

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This is an **unofficial** application and is not affiliated with, endorsed by, or connected to the Watch Tower Bible and Tract Society of Pennsylvania or any of its affiliates. All content from JW.org is property of its respective owners.

## 🙏 Acknowledgments

- Data source: [JW.org](https://wol.jw.org/)
- Icons: [Lucide Icons](https://lucide.dev/)
- UI Components: [DaisyUI](https://daisyui.com/)

## 📧 Support

For questions or issues:
- Email: jworgnewsfeed@gmail.com
- GitHub Issues: [Report a bug](https://github.com/camster91/JW-News/issues)

---

**Made with ❤️ for the worldwide brotherhood**
