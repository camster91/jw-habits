import { useState } from 'react';
import { getDayOfYear } from 'date-fns';
import { GraduationCap, Book, ExternalLink, Video, FileText, Globe, Headphones, Search, ChevronRight, Sparkles, Clock, CheckCircle2, Check } from 'lucide-react';
import { haptics } from '../utils/native';
import useProgressStore from '../stores/progressStore';
import useGamificationStore from '../stores/gamificationStore';
import { getBibleReading, getChaptersList, getBibleChapterLink } from '../utils/bibleReadingSchedule';
import FamilyWorshipCard from './FamilyWorshipCard';

// Deeper study categories
const STUDY_CATEGORIES = [
  {
    id: 'bible-study',
    title: 'Bible Study Tools',
    icon: Book,
    color: 'from-blue-500 to-indigo-600',
    items: [
      {
        title: 'Insight on the Scriptures',
        description: 'Comprehensive Bible encyclopedia with articles on people, places, and teachings',
        url: 'https://www.jw.org/en/library/books/Insight-on-the-Scriptures/',
        icon: '📚',
      },
      {
        title: 'Study Bible',
        description: 'Bible with study notes, cross-references, and multimedia',
        url: 'https://www.jw.org/en/library/bible/study-bible/books/',
        icon: '📖',
      },
      {
        title: '"All Scripture" Book',
        description: 'Background information on each Bible book',
        url: 'https://www.jw.org/en/library/books/all-scripture-inspired-of-god/',
        icon: '📜',
      },
      {
        title: 'Bible Character Index',
        description: 'Alphabetical index of Bible personalities',
        url: 'https://www.jw.org/en/library/books/bible-glossary/',
        icon: '👤',
      },
    ],
  },
  {
    id: 'prophecy',
    title: 'Prophecy & History',
    icon: Search,
    color: 'from-purple-500 to-pink-600',
    items: [
      {
        title: 'Pure Worship Restored',
        description: 'Deep verse-by-verse study of Ezekiel',
        url: 'https://www.jw.org/en/library/books/pure-worship/',
        icon: '🏛️',
      },
      {
        title: 'God\'s Kingdom Rules!',
        description: 'History of Jehovah\'s Witnesses and Kingdom fulfillment',
        url: 'https://www.jw.org/en/library/books/gods-kingdom-rules/',
        icon: '👑',
      },
      {
        title: 'Revelation—Grand Climax',
        description: 'Detailed commentary on Revelation',
        url: 'https://www.jw.org/en/library/books/revelation-grand-climax/',
        icon: '📕',
      },
      {
        title: 'Pay Attention to Daniel\'s Prophecy',
        description: 'Study of Daniel\'s visions and their fulfillment',
        url: 'https://www.jw.org/en/library/books/pay-attention-daniel-prophecy/',
        icon: '🦁',
      },
    ],
  },
  {
    id: 'doctrine',
    title: 'Doctrinal Study',
    icon: FileText,
    color: 'from-emerald-500 to-teal-600',
    items: [
      {
        title: 'What Does the Bible Really Teach?',
        description: 'Core Bible teachings explained simply',
        url: 'https://www.jw.org/en/library/books/bible-teach/',
        icon: '❓',
      },
      {
        title: 'Enjoy Life Forever!',
        description: 'Interactive Bible study course',
        url: 'https://www.jw.org/en/bible-teachings/guided-bible-study-course/',
        icon: '🌟',
      },
      {
        title: 'Keep Yourselves in God\'s Love',
        description: 'Practical application of Bible principles',
        url: 'https://www.jw.org/en/library/books/gods-love/',
        icon: '❤️',
      },
      {
        title: 'Organized to Do Jehovah\'s Will',
        description: 'Organization and congregation procedures',
        url: 'https://www.jw.org/en/library/books/organized-to-do-jehovahs-will/',
        icon: '📋',
      },
    ],
  },
  {
    id: 'research',
    title: 'Research Tools',
    icon: Search,
    color: 'from-amber-500 to-orange-600',
    items: [
      {
        title: 'Watchtower ONLINE LIBRARY',
        description: 'Search all publications',
        url: 'https://wol.jw.org/',
        icon: '🔍',
      },
      {
        title: 'JW Library App',
        description: 'Offline library with study features',
        url: 'https://www.jw.org/en/online-help/jw-library/',
        icon: '📱',
      },
      {
        title: 'Index to Publications',
        description: 'Subject index for in-depth research',
        url: 'https://www.jw.org/en/library/books/Watch-Tower-Publications-Index/',
        icon: '📑',
      },
    ],
  },
  {
    id: 'multimedia',
    title: 'Audio & Video',
    icon: Video,
    color: 'from-red-500 to-rose-600',
    items: [
      {
        title: 'JW Broadcasting',
        description: 'Monthly programs and original content',
        url: 'https://www.jw.org/en/library/videos/#en/mediaitems/StudioMonthlyPrograms',
        icon: '📺',
      },
      {
        title: 'Bible Dramatizations',
        description: 'Video dramatizations of Bible accounts',
        url: 'https://www.jw.org/en/library/videos/#en/categories/VODBibleDramatizations',
        icon: '🎬',
      },
      {
        title: 'Audio Bible',
        description: 'Listen to the Bible being read',
        url: 'https://www.jw.org/en/library/bible/study-bible/books/',
        icon: '🎧',
      },
      {
        title: 'Kingdom Songs',
        description: 'Sing along with instrumental and vocal versions',
        url: 'https://www.jw.org/en/library/music/',
        icon: '🎵',
      },
    ],
  },
  {
    id: 'languages',
    title: 'Language Learning',
    icon: Globe,
    color: 'from-cyan-500 to-blue-600',
    items: [
      {
        title: 'JW Language App',
        description: 'Learn phrases for the ministry in 100+ languages',
        url: 'https://www.jw.org/en/online-help/jw-language/',
        icon: '🗣️',
      },
      {
        title: 'Sign Language Videos',
        description: 'Publications in sign language',
        url: 'https://www.jw.org/en/library/videos/#en/categories/SignLanguage',
        icon: '🤟',
      },
      {
        title: 'Publications in Other Languages',
        description: 'Browse content in 1000+ languages',
        url: 'https://www.jw.org/en/languages/',
        icon: '🌍',
      },
    ],
  },
];

// Quick study ideas for inspiration
const STUDY_IDEAS = [
  'Research a Bible character in depth using Insight volumes',
  'Study the historical context of a Bible book',
  'Trace a theme through the entire Bible (e.g., God\'s name, Kingdom)',
  'Compare parallel Gospel accounts',
  'Study the meaning of original Hebrew/Greek words',
  'Research the geography of a Bible account',
  'Create a timeline of Bible events',
  'Study the symbolism in Revelation',
  'Research archaeological findings that support the Bible',
  'Study the types and antitypes in the Hebrew Scriptures',
];

function StudyTab() {
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [showIdeas, setShowIdeas] = useState(false);
  const dayOfYear = getDayOfYear(new Date());

  // Bible Reading state
  const {
    getBibleChapterProgress,
    toggleBibleChapter,
    isBibleReadingComplete,
  } = useProgressStore();

  const { recordBibleReading } = useGamificationStore();

  const todayReading = getBibleReading(dayOfYear);
  const chapters = getChaptersList(todayReading.chapters);
  const chapterProgress = getBibleChapterProgress(dayOfYear);
  const completedChapters = chapters.filter((_, i) => chapterProgress[i]);
  const bibleProgress = Math.round((completedChapters.length / chapters.length) * 100);
  const isBibleComplete = isBibleReadingComplete(dayOfYear);

  const toggleCategory = (id) => {
    haptics.light();
    setExpandedCategory(expandedCategory === id ? null : id);
  };

  const handleLinkClick = () => {
    haptics.light();
  };

  const handleChapterToggle = (index) => {
    haptics.light();
    toggleBibleChapter(dayOfYear, index);

    // Check if all chapters are now complete
    const newProgress = { ...chapterProgress, [index]: !chapterProgress[index] };
    const allComplete = chapters.every((_, i) => newProgress[i]);
    if (allComplete) {
      setTimeout(() => {
        haptics.success();
        recordBibleReading();
      }, 100);
    }
  };

  return (
    <div className="space-y-4">
      {/* Family Worship Card */}
      <FamilyWorshipCard />

      {/* Daily Bible Reading Card */}
      <article className="card bg-base-100 shadow-sm rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${isBibleComplete ? 'bg-success/10' : 'bg-secondary/10'}`}>
              <Book className={`w-6 h-6 ${isBibleComplete ? 'text-success' : 'text-secondary'}`} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold">Daily Bible Reading</h3>
              <p className="text-sm text-base-content/50">Day {dayOfYear}</p>
            </div>
            {isBibleComplete ? (
              <CheckCircle2 className="w-6 h-6 text-success" />
            ) : (
              <span className="text-lg font-bold text-secondary">{bibleProgress}%</span>
            )}
          </div>

          {/* Reading Info */}
          <div className="mt-3 p-3 bg-base-200/50 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-lg text-secondary">{todayReading.book} {todayReading.chapters}</p>
                <div className="flex items-center gap-1 text-sm text-base-content/50 mt-1">
                  <Clock className="w-4 h-4" />
                  <span>~{todayReading.time} minutes</span>
                </div>
              </div>
              <a
                href={getBibleChapterLink(todayReading.book, parseInt(todayReading.chapters.split('-')[0]) || 1)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm gap-1"
                onClick={() => haptics.light()}
              >
                <ExternalLink className="w-4 h-4" />
                Open in JW Library
              </a>
            </div>
          </div>
        </div>

        {/* Chapter Progress */}
        <div className="px-4 pb-4">
          <p className="text-xs text-base-content/50 mb-2 font-medium">Mark chapters as complete</p>
          <div className="grid grid-cols-4 gap-2">
            {chapters.map((chapter, index) => {
              const isComplete = chapterProgress[index];
              return (
                <button
                  key={index}
                  onClick={() => handleChapterToggle(index)}
                  className={`py-3 px-2 rounded-xl font-medium text-sm transition-all active:scale-95 flex items-center justify-center gap-1 ${
                    isComplete
                      ? 'bg-success text-white'
                      : 'bg-base-200 text-base-content/60'
                  }`}
                >
                  {isComplete && <Check className="w-3 h-3" />}
                  {chapter}
                </button>
              );
            })}
          </div>

          {/* Visual progress bar */}
          <div className="mt-3 h-2 bg-base-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${isBibleComplete ? 'bg-success' : 'bg-secondary'}`}
              style={{ width: `${bibleProgress}%` }}
            />
          </div>

          {isBibleComplete && (
            <div className="mt-3 flex items-center justify-center gap-2 text-success text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Today&apos;s reading complete!
            </div>
          )}
        </div>
      </article>

      {/* Deeper Study Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold">Deeper Study</h3>
            <p className="text-xs text-base-content/50">Research & learning tools</p>
          </div>
        </div>
        <button
          onClick={() => {
            haptics.light();
            setShowIdeas(!showIdeas);
          }}
          className="btn btn-ghost btn-sm gap-1"
        >
          <Sparkles className="w-4 h-4" />
          Ideas
        </button>
      </div>

      {/* Study Ideas Panel */}
      {showIdeas && (
        <div className="card bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200">
          <div className="card-body p-4">
            <h4 className="font-semibold text-emerald-800 flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4" />
              Study Project Ideas
            </h4>
            <ul className="space-y-2">
              {STUDY_IDEAS.map((idea, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-emerald-600 font-bold">{index + 1}.</span>
                  <span className="text-emerald-900">{idea}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Study Categories */}
      <div className="space-y-2">
        {STUDY_CATEGORIES.map((category) => {
          const Icon = category.icon;
          const isExpanded = expandedCategory === category.id;

          return (
            <div key={category.id} className="card bg-base-100 shadow-sm rounded-2xl overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.id)}
                className="flex items-center gap-3 w-full p-4 active:bg-base-200 transition-colors"
              >
                <div className={`p-2 rounded-xl bg-gradient-to-br ${category.color}`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="flex-1 font-bold text-left">{category.title}</span>
                <ChevronRight className={`w-5 h-5 text-base-content/30 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </button>

              {/* Category Items */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-2">
                  {category.items.map((item, index) => (
                    <a
                      key={index}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={handleLinkClick}
                      className="flex items-center gap-3 p-3 bg-base-200/50 rounded-xl active:scale-[0.98] transition-all"
                    >
                      <span className="text-2xl">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{item.title}</p>
                        <p className="text-xs text-base-content/50 line-clamp-1">{item.description}</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-base-content/30 flex-shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Links */}
      <div className="card bg-base-100 shadow-sm rounded-2xl overflow-hidden">
        <div className="p-4">
          <h4 className="font-bold mb-3 flex items-center gap-2">
            <Headphones className="w-5 h-5 text-primary" />
            Quick Access
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'WOL', url: 'https://wol.jw.org/', icon: '🔍' },
              { label: 'Study Bible', url: 'https://www.jw.org/en/library/bible/study-bible/books/', icon: '📖' },
              { label: 'JW Broadcasting', url: 'https://www.jw.org/en/library/videos/', icon: '📺' },
              { label: 'Kingdom Songs', url: 'https://www.jw.org/en/library/music/', icon: '🎵' },
            ].map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleLinkClick}
                className="flex items-center gap-2 p-3 bg-base-200/50 rounded-xl active:scale-95 transition-all"
              >
                <span className="text-xl">{link.icon}</span>
                <span className="font-medium text-sm">{link.label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudyTab;
