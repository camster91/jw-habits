import { ExternalLink, Newspaper, BookOpen, Video, Library, Radio } from 'lucide-react';
import { JW_ORG_SECTIONS } from '../utils/jwLibraryLinks';

const linkItems = [
  {
    title: "What's New",
    description: 'Latest content on JW.org',
    url: JW_ORG_SECTIONS.whatsNew,
    icon: Newspaper,
    color: 'text-primary'
  },
  {
    title: 'Magazines',
    description: 'Watchtower & Awake!',
    url: JW_ORG_SECTIONS.magazines,
    icon: BookOpen,
    color: 'text-secondary'
  },
  {
    title: 'Videos',
    description: 'JW Broadcasting & more',
    url: JW_ORG_SECTIONS.videos,
    icon: Video,
    color: 'text-accent'
  },
  {
    title: 'Library',
    description: 'Publications & Bible',
    url: JW_ORG_SECTIONS.library,
    icon: Library,
    color: 'text-info'
  },
  {
    title: 'Broadcasting',
    description: 'JW Broadcasting programs',
    url: JW_ORG_SECTIONS.broadcasting,
    icon: Radio,
    color: 'text-warning'
  }
];

function QuickLinks() {
  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title text-lg">Quick Links</h2>
        <div className="divider my-1"></div>

        <div className="space-y-2">
          {linkItems.map((item) => (
            <a
              key={item.title}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-base-200 transition-colors"
            >
              <item.icon className={`w-5 h-5 ${item.color}`} />
              <div className="flex-1">
                <p className="font-medium text-sm">{item.title}</p>
                <p className="text-xs text-base-content/60">{item.description}</p>
              </div>
              <ExternalLink className="w-4 h-4 text-base-content/40" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export default QuickLinks;
