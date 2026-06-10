import { ExternalLink, Newspaper, BookOpen, Video, Library, Radio, Book, Music, Users, HelpCircle, MapPin, Calendar, Heart, Baby, GraduationCap, Search, Globe, Headphones, MessageCircle, Building2, Star, Gift, Smartphone, X } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { JW_ORG_SECTIONS } from '../utils/jwLibraryLinks';
import PageHeader from '../components/PageHeader';

const linkCategories = [
  {
    title: 'Bible Teachings',
    links: [
      { title: 'Bible Teachings', url: JW_ORG_SECTIONS.bibleTeachings, icon: BookOpen },
      { title: 'Bible Questions Answered', url: JW_ORG_SECTIONS.bibleQuestionsAnswered, icon: HelpCircle },
      { title: 'Bible Verses Explained', url: JW_ORG_SECTIONS.bibleVersesExplained, icon: BookOpen },
      { title: 'Bible Study Course', url: JW_ORG_SECTIONS.bibleStudyCourse, icon: GraduationCap },
      { title: 'Bible Study Tools', url: JW_ORG_SECTIONS.bibleStudyTools, icon: Search },
      { title: 'Peace & Happiness', url: JW_ORG_SECTIONS.peaceAndHappiness, icon: Heart },
      { title: 'Marriage & Family', url: JW_ORG_SECTIONS.marriageAndFamily, icon: Users },
      { title: 'Teens & Young Adults', url: JW_ORG_SECTIONS.teens, icon: Users },
      { title: 'Children', url: JW_ORG_SECTIONS.children, icon: Baby },
      { title: 'Faith in God', url: JW_ORG_SECTIONS.faithInGod, icon: Star },
      { title: 'Science & the Bible', url: JW_ORG_SECTIONS.scienceAndBible, icon: Globe },
    ]
  },
  {
    title: 'Library',
    links: [
      { title: 'Online Library', url: JW_ORG_SECTIONS.library, icon: Library },
      { title: 'Bibles', url: JW_ORG_SECTIONS.bibles, icon: Book },
      { title: 'Books', url: JW_ORG_SECTIONS.books, icon: BookOpen },
      { title: 'Brochures & Booklets', url: JW_ORG_SECTIONS.brochures, icon: BookOpen },
      { title: 'Tracts & Invitations', url: JW_ORG_SECTIONS.tracts, icon: MessageCircle },
      { title: 'Article Series', url: JW_ORG_SECTIONS.articleSeries, icon: BookOpen },
      { title: 'All Magazines', url: JW_ORG_SECTIONS.magazines, icon: Newspaper },
      { title: 'Watchtower Study', url: JW_ORG_SECTIONS.watchtowerStudy, icon: Newspaper },
      { title: 'Awake!', url: JW_ORG_SECTIONS.awake, icon: Newspaper },
      { title: 'Meeting Workbooks', url: JW_ORG_SECTIONS.meetingWorkbooks, icon: BookOpen },
      { title: 'Publication Indexes', url: JW_ORG_SECTIONS.indexes, icon: Search },
    ]
  },
  {
    title: 'Videos & Media',
    links: [
      { title: 'JW Broadcasting', url: JW_ORG_SECTIONS.broadcasting, icon: Radio },
      { title: 'All Videos', url: JW_ORG_SECTIONS.videos, icon: Video },
      { title: 'Videos (Audio Descriptions)', url: JW_ORG_SECTIONS.videosAudioDescription, icon: Video },
      { title: 'Music', url: JW_ORG_SECTIONS.music, icon: Music },
      { title: 'Audio Dramas', url: JW_ORG_SECTIONS.audioDramas, icon: Headphones },
      { title: 'Dramatic Bible Readings', url: JW_ORG_SECTIONS.dramaticBibleReadings, icon: Headphones },
    ]
  },
  {
    title: 'News & Updates',
    links: [
      { title: "What's New", url: JW_ORG_SECTIONS.whatsNew, icon: Star },
      { title: 'Newsroom', url: JW_ORG_SECTIONS.news, icon: Newspaper },
      { title: 'Experiences', url: JW_ORG_SECTIONS.experiences, icon: Heart },
    ]
  },
  {
    title: 'About Us',
    links: [
      { title: "About Jehovah's Witnesses", url: JW_ORG_SECTIONS.aboutUs, icon: Users },
      { title: 'Frequently Asked Questions', url: JW_ORG_SECTIONS.faq, icon: HelpCircle },
      { title: 'Request a Visit', url: JW_ORG_SECTIONS.requestVisit, icon: MessageCircle },
      { title: 'Contact Us', url: JW_ORG_SECTIONS.contactUs, icon: MessageCircle },
      { title: 'Bethel Tours', url: JW_ORG_SECTIONS.bethelTours, icon: Building2 },
      { title: 'Meetings', url: JW_ORG_SECTIONS.meetings, icon: Users },
      { title: 'Memorial', url: JW_ORG_SECTIONS.memorial, icon: Heart },
      { title: 'Conventions', url: JW_ORG_SECTIONS.conventions, icon: Calendar },
      { title: 'Activities', url: JW_ORG_SECTIONS.activities, icon: Users },
      { title: 'Around the World', url: JW_ORG_SECTIONS.aroundTheWorld, icon: Globe },
    ]
  },
  {
    title: 'Quick Links',
    links: [
      { title: 'Find a Meeting', url: JW_ORG_SECTIONS.findMeeting, icon: MapPin, external: true },
      { title: 'Find a Convention', url: JW_ORG_SECTIONS.findConvention, icon: Calendar, external: true },
      { title: 'Search JW.org', url: JW_ORG_SECTIONS.search, icon: Search },
      { title: 'Medical Information', url: JW_ORG_SECTIONS.medicalInfo, icon: Heart },
      { title: 'Help', url: JW_ORG_SECTIONS.help, icon: HelpCircle },
      { title: 'Donations', url: JW_ORG_SECTIONS.donations, icon: Gift, external: true },
    ]
  },
  {
    title: 'Apps & Tools',
    links: [
      { title: 'Watchtower ONLINE LIBRARY', url: JW_ORG_SECTIONS.watchtowerOnlineLibrary, icon: Library, external: true },
      { title: 'JW Hub', url: JW_ORG_SECTIONS.jwHub, icon: Globe, external: true },
      { title: 'JW Library App', url: JW_ORG_SECTIONS.jwLibraryApp, icon: Smartphone },
      { title: 'Watchtower Library', url: JW_ORG_SECTIONS.watchtowerLibrary, icon: Library },
      { title: 'JW Language', url: JW_ORG_SECTIONS.jwLanguage, icon: Globe },
    ]
  }
];

function Links() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return linkCategories;
    const query = searchQuery.toLowerCase();
    return linkCategories
      .map((category) => ({
        ...category,
        links: category.links.filter(
          (link) =>
            link.title.toLowerCase().includes(query) ||
            category.title.toLowerCase().includes(query)
        ),
      }))
      .filter((category) => category.links.length > 0);
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      {/* Header */}
      <PageHeader
        title={t('links.title')}
        subtitle={t('links.subtitle')}
        shadow
      />

      {/* Links */}
      <div className="container mx-auto px-4 py-6 space-y-4 max-w-2xl">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/70" />
          <input
            type="text"
            placeholder={t('links.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input input-bordered w-full pl-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-5 h-5 text-base-content/70" />
            </button>
          )}
        </div>

        {/* Search Results Label */}
        {searchQuery && (
          <p className="text-sm text-base-content/70">
            {filteredCategories.reduce((sum, cat) => sum + cat.links.length, 0)} link{filteredCategories.reduce((sum, cat) => sum + cat.links.length, 0) !== 1 ? 's' : ''} matching "{searchQuery}"
          </p>
        )}

        {filteredCategories.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-primary/20 flex items-center justify-center">
            <Search className="w-8 h-8 text-primary/50" />
          </div>
          <p className="font-medium text-base-content/70">{t('links.noLinksFound')}</p>
          <p className="text-sm text-base-content/70 mt-1">{t('links.tryDifferent')}</p>
        </div>
        ) : (
          filteredCategories.map((category) => (
            <div key={category.title} className="card bg-base-100 shadow-xl">
              <div className="card-body p-4">
                <h2 className="font-bold text-base-content/80">{category.title}</h2>
                <div className="divider my-1"></div>
                <div className="space-y-1">
                  {category.links.map((link) => (
                    <a
                      key={link.title}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-base-200 active:bg-base-300 transition-colors"
                    >
                      <link.icon className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="flex-1 text-sm">{link.title}</span>
                      <ExternalLink className={`w-4 h-4 flex-shrink-0 ${link.external ? 'text-primary' : 'text-base-content/70'}`} />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}

        {/* Direct JW Library Link */}
        <div className="card bg-gradient-to-br from-primary to-blue-700 text-primary-content shadow-xl">
          <div className="card-body p-4">
            <h2 className="font-bold">Open JW Library App</h2>
            <p className="text-sm opacity-90">
              Links on this page will open in JW Library if installed on your device.
            </p>
            <a
              href="https://www.jw.org/en/online-help/jw-library/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-sm mt-2"
            >
              <Smartphone className="w-4 h-4" />
              Get JW Library App
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Links;
