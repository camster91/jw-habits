import { ExternalLink, Newspaper, BookOpen, Video, Library, Radio, Book, Music, Users } from 'lucide-react';
import { JW_ORG_SECTIONS } from '../utils/jwLibraryLinks';

const linkCategories = [
  {
    title: 'News & Updates',
    links: [
      { title: "What's New", url: JW_ORG_SECTIONS.whatsNew, icon: Newspaper },
      { title: 'Newsroom', url: JW_ORG_SECTIONS.news, icon: Newspaper }
    ]
  },
  {
    title: 'Magazines',
    links: [
      { title: 'All Magazines', url: JW_ORG_SECTIONS.magazines, icon: BookOpen },
      { title: 'Watchtower Study', url: JW_ORG_SECTIONS.watchtowerStudy, icon: BookOpen },
      { title: 'Awake!', url: JW_ORG_SECTIONS.awake, icon: BookOpen }
    ]
  },
  {
    title: 'Videos & Media',
    links: [
      { title: 'All Videos', url: JW_ORG_SECTIONS.videos, icon: Video },
      { title: 'JW Broadcasting', url: JW_ORG_SECTIONS.broadcasting, icon: Radio },
      { title: 'Music', url: JW_ORG_SECTIONS.music, icon: Music }
    ]
  },
  {
    title: 'Study Materials',
    links: [
      { title: 'Online Library', url: JW_ORG_SECTIONS.library, icon: Library },
      { title: 'Bible Online', url: JW_ORG_SECTIONS.bibleOnline, icon: Book },
      { title: 'Meeting Workbooks', url: JW_ORG_SECTIONS.meetingWorkbooks, icon: BookOpen },
      { title: 'Bible Teachings', url: JW_ORG_SECTIONS.bibleTeachings, icon: Book }
    ]
  },
  {
    title: 'About',
    links: [
      { title: "About Jehovah's Witnesses", url: JW_ORG_SECTIONS.aboutUs, icon: Users }
    ]
  }
];

function Links() {
  return (
    <div className="min-h-screen bg-base-200 pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-content p-4">
        <h1 className="text-xl font-bold">JW.org Links</h1>
        <p className="text-sm opacity-80">Quick access to JW.org content</p>
      </div>

      {/* Links */}
      <div className="p-4 space-y-4">
        {linkCategories.map((category) => (
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
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-base-200 transition-colors"
                  >
                    <link.icon className="w-5 h-5 text-primary" />
                    <span className="flex-1 text-sm">{link.title}</span>
                    <ExternalLink className="w-4 h-4 text-base-content/40" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Direct JW Library Link */}
        <div className="card bg-primary text-primary-content shadow-xl">
          <div className="card-body p-4">
            <h2 className="font-bold">Open JW Library App</h2>
            <p className="text-sm opacity-80">
              Links on this page will open in JW Library if installed on your device.
            </p>
            <a
              href="https://www.jw.org/en/online-help/jw-library/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-sm mt-2 text-primary-content border-primary-content hover:bg-primary-content hover:text-primary"
            >
              Get JW Library App
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Links;
