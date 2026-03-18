# JW-News

A news platform for publishing and aggregating content with modern web technologies.

## Features

- **News Publishing** - Create and publish news articles with rich content
- **Content Aggregation** - Aggregate news from multiple sources
- **Article Management** - Organize and categorize news content
- **Responsive Design** - Mobile-first design for all devices
- **SEO Optimized** - Built-in SEO features for better discoverability
- **Fast Performance** - Optimized for speed with Next.js

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

Visit: http://localhost:3000

## Development Scripts

The project includes scripts to make it easy to start and stop the development servers on different platforms.

### PowerShell (Windows)

```powershell
# Run from project root
.\scripts\start-dev.ps1
.\scripts\stop-dev.ps1

# Run in background (with logging)
.\scripts\start-dev.ps1 -Background

# Force kill processes using dev ports
.\scripts\stop-dev.ps1 -KillPorts
```

### Bash (Linux/macOS/WSL/Git Bash)

```bash
# Make scripts executable (first time only)
chmod +x scripts/*.sh

# Start servers
./scripts/start-dev.sh

# Start in background
./scripts/start-dev.sh --background

# Stop servers
./scripts/stop-dev.sh

# Kill processes on dev ports
./scripts/stop-dev.sh --kill-ports
```

### Cross-Platform

For all platforms, you can always use:

```bash
npm run dev        # Start development server (foreground)
npm run build      # Build for production
npm start          # Start production server
```

The development server runs on port 3000 by default.

## Project Structure

```
jw-news/
├── package.json
├── next.config.js
├── tailwind.config.js
├── public/
│   ├── images/
│   └── favicon.ico
├── src/
│   ├── app/
│   │   ├── layout.jsx
│   │   ├── page.jsx
│   │   ├── globals.css
│   │   └── api/
│   │       └── news/
│   ├── components/
│   │   ├── NewsCard.jsx
│   │   ├── NewsGrid.jsx
│   │   ├── Header.jsx
│   │   ├── Footer.jsx
│   │   └── Navigation.jsx
│   ├── lib/
│   │   ├── newsAPI.js
│   │   └── aggregator.js
│   └── utils/
│       ├── formatDate.js
│       └── helpers.js
└── .env.local
```

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Other Platforms

```
Build Command: npm run build
Output Directory: .next
Install Command: npm install
```

## Environment Variables

Create a `.env.local` file in the root directory:

```env
# API Configuration
API_URL=http://localhost:3000/api
NEWS_API_KEY=your_api_key_here

# Database (if using)
DATABASE_URL=your_database_url

# Other settings
NODE_ENV=development
```

## Technology Stack

- **Next.js 15** - React framework with App Router
- **React 19** - UI framework
- **Tailwind CSS 4** - Styling
- **DaisyUI 5** - Component library (optional)
- **TypeScript** - Type safety (if enabled)

## Features in Detail

### Publishing
- Rich text editor for creating articles
- Image upload and management
- Category and tag organization
- Draft and publish workflow

### Aggregation
- Fetch news from multiple sources
- Automatic content parsing
- Scheduled updates
- Duplicate detection

## API Routes

### News API
- `GET /api/news` - Get all news articles
- `GET /api/news/:id` - Get specific article
- `POST /api/news` - Create new article
- `PUT /api/news/:id` - Update article
- `DELETE /api/news/:id` - Delete article

### Aggregation API
- `GET /api/aggregate` - Get aggregated news
- `POST /api/aggregate/refresh` - Refresh news sources

## License

**Private** - This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

## Development

Built with ❤️ using Next.js
