import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GraduationCap, Book, ExternalLink, Video, FileText, Globe, Search, ChevronRight, ChevronDown, Star, Headphones } from 'lucide-react';
import { haptics } from '../utils/native';

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
    id: 'bible-teachings',
    title: 'Bible Teachings',
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

function DeeperStudySection() {
  const { t } = useTranslation();
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [showIdeas, setShowIdeas] = useState(false);
  const [showDeeperStudy, setShowDeeperStudy] = useState(false);

  const toggleCategory = (id) => {
    haptics.light();
    setExpandedCategory(expandedCategory === id ? null : id);
  };

  const handleLinkClick = () => {
    haptics.light();
  };

  return (
    <>
      {/* Deeper Study - Collapsible */}
      <button
        onClick={() => {
          haptics.light();
          setShowDeeperStudy(!showDeeperStudy);
        }}
        className="flex items-center justify-between w-full p-4 bg-base-100 rounded-2xl shadow-sm active:scale-[0.99] transition-all"
      >
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-bold">{t("study.deeperStudy")}</h3>
            <p className="text-xs text-base-content/50">{t("study.researchTools")}</p>
          </div>
        </div>
        {showDeeperStudy ? (
          <ChevronDown className="w-5 h-5 text-base-content/30" />
        ) : (
          <ChevronRight className="w-5 h-5 text-base-content/30" />
        )}
      </button>

      {showDeeperStudy && (
        <>
          {/* Study Ideas Toggle */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                haptics.light();
                setShowIdeas(!showIdeas);
              }}
              className="btn btn-ghost btn-sm gap-1"
            >
              <Star className="w-4 h-4" />
              {t("goals.ideas")}
            </button>
          </div>

          {/* Study Ideas Panel */}
          {showIdeas && (
            <div className="card bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200">
              <div className="card-body p-4">
                <h4 className="font-semibold text-emerald-800 flex items-center gap-2 mb-3">
                  <Star className="w-4 h-4" />
                  {t("study.studyIdeas")}
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
                {t("study.quickAccess")}
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
        </>
      )}
    </>
  );
}

export default DeeperStudySection;