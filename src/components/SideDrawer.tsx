import { useState, useCallback, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BarChart3, Link2, Settings, BookHeart, X } from 'lucide-react';
import { haptics } from '../utils/native';
import { DrawerContext } from '../hooks/useDrawer';

interface DrawerItem {
  path: string;
  icon: any; // LucideIcon type
  label: string;
  description: string;
}

const DRAWER_ITEMS: DrawerItem[] = [
  { path: '/stats', icon: BarChart3, label: 'Statistics', description: 'View your progress data' },
  { path: '/links', icon: Link2, label: 'Quick Links', description: 'JW.org resources' },
  { path: '/settings', icon: Settings, label: 'Settings', description: 'App preferences' },
  { path: '/memories', icon: BookHeart, label: 'Memories', description: 'Your reflections' },
];

interface SideDrawerProps {
  children: ReactNode;
}

function SideDrawer({ children }: SideDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const openDrawer = useCallback(() => {
    haptics.light();
    setIsOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleNavClick = (path: string) => {
    haptics.light();
    setIsOpen(false);
    
    setTimeout(() => navigate(path), 150);
  };

  return (
    <DrawerContext.Provider value={{ openDrawer, closeDrawer, isOpen }}>
      <div className="drawer">
        <input
          id="side-drawer"
          type="checkbox"
          className="drawer-toggle"
          checked={isOpen}
          onChange={(e) => setIsOpen(e.target.checked)}
        />

        {/* Main content */}
        <div className="drawer-content">
          {children}
        </div>

        {/* Drawer sidebar */}
        <div className="drawer-side z-50">
          {/* Overlay */}
          <label
            htmlFor="side-drawer"
            className="drawer-overlay"
            aria-label="Close menu"
          />

          {/* Sidebar content */}
          <aside className="bg-base-100 min-h-full w-72 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-base-200">
              <div>
                <h2 className="text-lg font-bold">More</h2>
                <p className="text-xs text-base-content/50">Additional features</p>
              </div>
              <button
                onClick={closeDrawer}
                className="btn btn-ghost btn-sm btn-square"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 p-3 space-y-1">
              {DRAWER_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavClick(item.path)}
                    className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all active:scale-[0.98] ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-base-200 active:bg-base-200'
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${isActive ? 'bg-primary/15' : 'bg-base-200'}`}>
                      <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-base-content/60'}`} />
                    </div>
                    <div className="text-left">
                      <p className={`font-medium text-sm ${isActive ? 'text-primary' : ''}`}>{item.label}</p>
                      <p className="text-xs text-base-content/50">{item.description}</p>
                    </div>
                  </button>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-base-200">
              <p className="text-xs text-base-content/40 text-center">
                JW Habits
              </p>
            </div>
          </aside>
        </div>
      </div>
    </DrawerContext.Provider>
  );
}

export default SideDrawer;
