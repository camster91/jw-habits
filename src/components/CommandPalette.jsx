import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, BookOpen, Heart, Users, Home, BarChart3, Settings, Link2, Target, Music, Video, Calendar, Trophy, Sparkles, Plus, X } from 'lucide-react';
import useGamificationStore from '../stores/gamificationStore';
import useProgressStore from '../stores/progressStore';
import { format } from 'date-fns';

/**
 * CommandPalette — Cmd+K quick navigation + actions.
 * Opens with Cmd+K (or Ctrl+K) anywhere in the app.
 */
export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const today = format(new Date(), 'yyyy-MM-dd');

  const recordDailyTextCompletion = useGamificationStore((s) => s.recordDailyTextCompletion);
  const markDailyTextRead = useProgressStore((s) => s.markDailyTextRead);

  // Build items
  const items = useMemo(() => [
    { id: 'nav-home', label: 'Home', description: 'Dashboard', icon: Home, group: 'Navigate', shortcut: 'G H', perform: () => navigate('/') },
    { id: 'nav-study', label: 'Study', description: 'Meeting prep & deeper study', icon: BookOpen, group: 'Navigate', shortcut: 'G S', perform: () => navigate('/study') },
    { id: 'nav-goals', label: 'Goals', description: 'Set and track spiritual goals', icon: Target, group: 'Navigate', shortcut: 'G G', perform: () => navigate('/goals') },
    { id: 'nav-stats', label: 'Stats', description: 'Streaks, achievements, progress', icon: BarChart3, group: 'Navigate', shortcut: 'G T', perform: () => navigate('/stats') },
    { id: 'nav-links', label: 'Quick Links', description: 'JW.org resources', icon: Link2, group: 'Navigate', perform: () => navigate('/links') },
    { id: 'nav-settings', label: 'Settings', description: 'App preferences', icon: Settings, group: 'Navigate', perform: () => navigate('/settings') },

    { id: 'act-daily-text', label: 'Mark daily text as read', description: `Quick log today's scripture reading`, icon: BookOpen, group: 'Quick actions', perform: () => {
      markDailyTextRead(today);
      recordDailyTextCompletion();
      setOpen(false);
    }},
    { id: 'act-external-video', label: 'Watch latest video', description: 'JW Broadcasting on jw-video.ashbi.ca', icon: Video, group: 'External', perform: () => window.open('https://jw-video.ashbi.ca', '_blank') },
    { id: 'act-external-music', label: 'Play Kingdom Songs', description: 'jw-music.ashbi.ca', icon: Music, group: 'External', perform: () => window.open('https://jw-music.ashbi.ca', '_blank') },
    { id: 'act-external-study', label: 'Search scriptures', description: 'study.ashbi.ca', icon: Sparkles, group: 'External', perform: () => window.open('https://study.ashbi.ca', '_blank') },
  ], [navigate, markDailyTextRead, recordDailyTextCompletion, today]);

  // Cmd+K to open
  useEffect(() => {
    const onKey = (e) => {
      const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
      const meta = isMac ? e.metaKey : e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      setActiveIndex(0);
    }
  }, [open]);

  const filtered = query
    ? items.filter(
        (i) =>
          i.label.toLowerCase().includes(query.toLowerCase()) ||
          i.description?.toLowerCase().includes(query.toLowerCase()),
      )
    : items;

  const grouped = filtered.reduce((acc, item) => {
    (acc[item.group] = acc[item.group] || []).push(item);
    return acc;
  }, {});

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 px-4 animate-fade-in"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-xl bg-base-100 border border-base-300 rounded-xl shadow-2xl overflow-hidden animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-base-300">
          <Search className="w-5 h-5 text-base-content/50" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((i) => Math.max(0, i - 1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                filtered[activeIndex]?.perform();
                setOpen(false);
              }
            }}
            placeholder="Search actions, navigate, or type a question..."
            className="flex-1 bg-transparent outline-none text-base placeholder:text-base-content/40"
          />
          <kbd className="hidden sm:block text-[10px] px-1.5 py-0.5 rounded bg-base-200 text-base-content/50">
            ESC
          </kbd>
          <button onClick={() => setOpen(false)} className="text-base-content/40 hover:text-base-content">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-base-content/50 text-sm">No results</div>
          ) : (
            Object.entries(grouped).map(([group, groupItems]) => {
              let flatIndex = filtered.indexOf(groupItems[0]);
              return (
                <div key={group} className="py-2">
                  <div className="px-4 py-1 text-[10px] font-semibold text-base-content/40 uppercase tracking-wider">
                    {group}
                  </div>
                  {groupItems.map((item, i) => {
                    const idx = flatIndex + i;
                    const isActive = idx === activeIndex;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          item.perform();
                          setOpen(false);
                        }}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          isActive ? 'bg-primary/10' : ''
                        }`}
                      >
                        <Icon className="w-4 h-4 text-base-content/60 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{item.label}</div>
                          {item.description && (
                            <div className="text-xs text-base-content/50 truncate">{item.description}</div>
                          )}
                        </div>
                        {item.shortcut && (
                          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-base-200 text-base-content/50">
                            {item.shortcut}
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
