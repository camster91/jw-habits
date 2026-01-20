# Feature Plan v2.1 - Progress Tracking Enhancements

## Overview

This document outlines new features to improve the JW Progress Tracker app with:
1. **Partial Progress Tracking** - Track completion percentage for reading/study activities
2. **Detailed Midweek Meeting Breakdown** - Individual parts of the Life and Ministry Meeting

---

## Feature 1: Partial Progress Tracking

### Current Behavior
- Binary tracking: Done / Not Done
- No way to save partial progress

### Proposed Changes

#### 1.1 Bible Reading Progress
- Add a progress slider or percentage input (0-100%)
- Show visual progress bar for each day's reading
- Options: "Not Started", "In Progress", "Completed"
- Track which chapters are done in multi-chapter readings

#### 1.2 Daily Text Progress
- Add checkboxes for:
  - [ ] Read scripture
  - [ ] Read comments
  - [ ] Personal meditation

#### 1.3 Meeting Preparation Progress
- Track preparation progress as percentage
- Show overall % complete for each meeting

### Data Model Changes

```javascript
// progressStore.js - Enhanced structure

// Bible Reading - partial progress
bibleReadings: {
  [dayOfYear]: {
    progress: 75,           // 0-100 percentage
    chaptersRead: [1, 2],   // which chapters completed
    totalChapters: 3,
    status: 'in_progress',  // 'not_started' | 'in_progress' | 'completed'
    timestamp: '...'
  }
}

// Daily Text - checklist style
dailyTexts: {
  [date]: {
    readScripture: true,
    readComments: true,
    meditated: false,
    progress: 66,           // calculated from checkboxes
    timestamp: '...'
  }
}

// Meeting - detailed parts tracking
meetings: {
  [weekOf-meetingType]: {
    parts: { ... },         // individual part completion
    progress: 80,           // overall percentage
    studyTime: 45,
    timestamp: '...'
  }
}
```

---

## Feature 2: Detailed Midweek Meeting Breakdown

### Life and Ministry Meeting Structure

Based on official JW.org guidelines, the meeting has these sections:

#### Opening (1 min)
- Song and Prayer
- Chairman's opening comments

#### Treasures From God's Word (23 min total)
| Part | Duration | Trackable |
|------|----------|-----------|
| Talk | 10 min | Yes |
| Spiritual Gems | 10 min | Yes |
| Bible Reading | 4 min | Yes |

#### Apply Yourself to the Field Ministry (15 min)
| Part | Duration | Trackable |
|------|----------|-----------|
| Assignment 1 (varies) | ~4 min | Yes |
| Assignment 2 (varies) | ~4 min | Yes |
| Assignment 3 (varies) | ~4 min | Yes |

*Assignment types: Starting a Conversation, Following Up, Making Disciples, Explaining Beliefs, Talk*

#### Living as Christians (15 min + 30 min)
| Part | Duration | Trackable |
|------|----------|-----------|
| Part 1 (Song) | - | No |
| Part 2 (varies) | 15 min | Yes |
| Congregation Bible Study | 30 min | Yes |

#### Closing (3 min)
- Concluding comments
- Song and Prayer

### Proposed UI Changes

#### 2.1 Enhanced MeetingCard Component

```
┌─────────────────────────────────────────┐
│ Midweek Meeting - January 22           │
│ Overall Progress: ████████░░ 80%        │
├─────────────────────────────────────────┤
│ ▼ Treasures From God's Word            │
│   [✓] Talk (10 min)                    │
│   [✓] Spiritual Gems (10 min)          │
│   [ ] Bible Reading (4 min)            │
├─────────────────────────────────────────┤
│ ▼ Apply Yourself to the Ministry       │
│   [✓] Starting a Conversation          │
│   [✓] Following Up                     │
│   [ ] Making Disciples                 │
├─────────────────────────────────────────┤
│ ▼ Living as Christians                 │
│   [✓] Talk/Discussion (15 min)         │
│   [ ] Congregation Bible Study         │
└─────────────────────────────────────────┘
```

#### 2.2 Collapsible Sections
- Each main section expandable/collapsible
- Shows section completion (e.g., "2/3 complete")
- Color coding: Red (0%), Yellow (partial), Green (100%)

#### 2.3 Individual Part Links
- Each part links to JW Library for that specific content
- Bible Reading links to the assigned chapters
- CBS links to the current study publication

### Data Model for Midweek Meeting

```javascript
// Meeting workbook data structure enhancement
{
  weekOf: "January 19-25, 2026",
  docid: 1102026201,
  bibleReading: "Genesis 1-3",

  // NEW: Detailed parts breakdown
  parts: {
    treasures: {
      talk: {
        title: "Jehovah—A God Who Communicates",
        duration: 10,
        completed: false
      },
      spiritualGems: {
        questions: [
          "What does Genesis 1:26 teach about God?",
          "What spiritual gem did you find?"
        ],
        duration: 10,
        completed: false
      },
      bibleReading: {
        scripture: "Genesis 1:1-25",
        duration: 4,
        completed: false
      }
    },
    ministry: {
      assignment1: {
        type: "Starting a Conversation",
        theme: "Why study the Bible?",
        duration: 4,
        completed: false
      },
      assignment2: {
        type: "Following Up",
        theme: "What is God's purpose?",
        duration: 4,
        completed: false
      },
      assignment3: {
        type: "Making Disciples",
        theme: "Prayer",
        duration: 4,
        completed: false
      }
    },
    living: {
      part1: {
        title: "Local Needs",
        duration: 15,
        completed: false
      },
      congregationBibleStudy: {
        publication: "Enjoy Life Forever",
        lesson: 5,
        duration: 30,
        completed: false
      }
    }
  }
}
```

---

## Feature 3: Weekend Meeting Breakdown

### Current State
- Simple tracking: Public Talk + Watchtower Study
- Binary completion

### Proposed Enhancement

```
┌─────────────────────────────────────────┐
│ Weekend Meeting - January 25            │
│ Overall Progress: ████░░░░░░ 40%        │
├─────────────────────────────────────────┤
│ [✓] Public Talk (30 min)               │
│     Theme: "What Is God's Kingdom?"     │
├─────────────────────────────────────────┤
│ Watchtower Study                        │
│   Progress: ██████░░░░ 60%              │
│   Paragraphs: 12/20 completed           │
│   [ ] Paragraph 1-5                     │
│   [ ] Paragraph 6-10                    │
│   [✓] Paragraph 11-15                   │
│   [ ] Paragraph 16-20                   │
│   [Open Study Article]                  │
└─────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Data Model Updates
- [ ] Update `progressStore.js` with new data structures
- [ ] Add migration for existing user data
- [ ] Add partial progress calculation helpers

### Phase 2: Midweek Meeting UI
- [ ] Create collapsible section component
- [ ] Build detailed meeting parts checklist
- [ ] Add progress bars and percentages
- [ ] Update meeting workbook JSON structure

### Phase 3: Bible Reading & Daily Text
- [ ] Add progress slider to BibleReadingCard
- [ ] Add checklist to DailyTextCard
- [ ] Update stats calculations for partial progress

### Phase 4: Weekend Meeting
- [ ] Add Watchtower paragraph tracking
- [ ] Link to current study article

### Phase 5: Polish & UX
- [ ] Animations for progress updates
- [ ] Haptic feedback on mobile
- [ ] Celebration animations for 100% completion
- [ ] Progress history/trends visualization

---

## Technical Considerations

### Backwards Compatibility
- Existing boolean `read: true` should map to `progress: 100`
- Migration function needed on app load

### Performance
- Progress calculations should be memoized
- Avoid re-renders on every checkbox toggle

### Data Size
- Meeting parts data is more detailed
- Consider lazy loading workbook details

---

## Sources

- [Instructions for Our Christian Life and Ministry Meeting](https://www.jw.org/en/library/guidelines/Instructions-for-Our-Christian-Life-and-Ministry-Meeting/Instructions-for-Our-Christian-Life-and-Ministry-Meeting/)
- [Life and Ministry Meeting Workbook](https://www.jw.org/en/library/jw-meeting-workbook/)
- [January 19-25, 2026 Schedule](https://www.jw.org/en/library/jw-meeting-workbook/january-february-2026-mwb/Life-and-Ministry-Meeting-Schedule-for-January-19-25-2026/)
