# JW Progress Tracker - Improvement Roadmap

## High Priority

### Testing Infrastructure
- [x] Add Vitest for unit testing (integrates well with Vite)
- [x] Add React Testing Library for component tests
- [x] Write tests for Zustand stores (`progressStore`, `settingsStore`)
- [x] Write tests for utility functions (`jwLibraryLinks`, `notifications`)
- [x] Add test coverage reporting
- [x] Add `npm test` script to package.json

### Code Quality
- [ ] Migrate to TypeScript for better type safety
- [ ] Add strict TypeScript configuration
- [ ] Type all component props and store interfaces
- [ ] Add PropTypes as interim solution if TypeScript migration is delayed

### CI/CD Pipeline
- [x] Add GitHub Actions workflow for:
  - [x] Running lint on PR
  - [x] Running tests on PR
  - [x] Building production bundle
  - [ ] Deploying to hosting (Hostinger)

## Medium Priority

### Accessibility (a11y)
- [x] Add ARIA labels to interactive elements
- [ ] Ensure proper heading hierarchy
- [ ] Test with screen readers
- [ ] Add keyboard navigation support for all features
- [x] Add `aria-live` regions for toast notifications
- [ ] Run Lighthouse accessibility audit and fix issues

### Performance
- [x] Analyze bundle size and code-split large components
- [x] Lazy load pages with React.lazy()
- [x] Add performance monitoring (Web Vitals)
- [ ] Optimize images (consider WebP format)
- [ ] Add preloading for critical assets

### PWA Enhancements
- [ ] Add background sync for offline actions
- [ ] Implement periodic background sync for data updates
- [x] Add app shortcuts for quick actions
- [ ] Improve offline fallback page
- [ ] Add badge API for unread notifications

### Error Handling
- [ ] Add error tracking service (Sentry or similar)
- [ ] Improve ErrorBoundary with error reporting
- [ ] Add graceful degradation for failed API calls
- [ ] Add retry logic for network requests

## Low Priority

### Features
- [x] Add data import functionality (complement existing export)
- [ ] Add yearly/monthly progress views in Stats
- [ ] Add calendar view for historical progress
- [ ] Add weekly goals and achievements
- [ ] Add sharing functionality for progress milestones
- [ ] Add multi-language support (i18n)

### JW.org News Feed (NEW)
- [ ] Create `newsStore.js` Zustand store for feed state
- [ ] Implement data fetching service for JW.org content
- [ ] Set up CORS proxy or serverless function for fetching
- [ ] Create NewsCard component with thumbnail, category, date, title
- [ ] Build NewsFeed page with filter tabs (All/Articles/Magazines/Videos)
- [ ] Add News tab to bottom navigation
- [ ] Create dashboard widget showing latest 3 items
- [ ] Implement JW Library deep links for content
- [ ] Add offline caching for feed items and thumbnails
- [ ] Add pull-to-refresh and "Load More" pagination
- [ ] Implement read/unread tracking with badge count
- [ ] Add background sync for automatic feed refresh
- [ ] Add sharing functionality for news items

### Developer Experience
- [ ] Add Storybook for component documentation
- [ ] Add Husky for pre-commit hooks
- [ ] Add commitlint for conventional commits
- [x] Add Prettier for code formatting
- [ ] Document component API with JSDoc

### Security
- [ ] Add Content Security Policy headers
- [x] Audit dependencies for vulnerabilities (`npm audit`)
- [ ] Add Subresource Integrity for CDN resources
- [ ] Review and minimize localStorage usage

## Technical Debt

### Refactoring
- [ ] Extract common card styles into reusable component
- [ ] Create shared loading/skeleton components
- [ ] Consolidate date utility functions
- [ ] Review and optimize re-renders in components
- [ ] Split large components (Settings.jsx is 317 lines)

### Data Management
- [ ] Consider IndexedDB for larger data storage
- [ ] Add data migration strategy for store updates
- [ ] Add data validation layer for localStorage

---

## Quick Wins (Can be done immediately)

1. ~~**Add Vitest** - Minimal setup with Vite integration~~ ✅
2. ~~**Add GitHub Actions** - Basic lint/build workflow~~ ✅
3. **Add PropTypes** - Quick type checking without TypeScript migration
4. ~~**Run npm audit** - Check for vulnerable dependencies~~ ✅
5. ~~**Add Prettier** - Consistent code formatting~~ ✅

## Estimated Impact

| Category | Effort | Impact | Priority |
|----------|--------|--------|----------|
| Testing | Medium | High | High |
| TypeScript | High | High | High |
| CI/CD | Low | High | High |
| Accessibility | Medium | Medium | Medium |
| Performance | Medium | Medium | Medium |
| Features | Varies | Medium | Low |
