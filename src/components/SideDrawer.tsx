import React, { useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lightbulb, Info, Settings, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { haptics } from '../utils/native.js';
import { DrawerContext } from '../hooks/useDrawer.js';

interface DrawerItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
}

interface SideDrawerProps {
  children: ReactNode;
}

function SideDrawer({ children }: SideDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  // The home is the only user-facing page (5 link-out rows).
  // The drawer is a 3-item menu: Settings, Ideas, About.
  const DRAWER_ITEMS: DrawerItem[] = [
    { path: '/settings', icon: Settings, label: t('nav.settings'), description: t('nav.settingsDesc') },
    { path: '/ideas', icon: Lightbulb, label: t('nav.ideas', 'Ideas'), description: t('nav.ideasDesc', 'Browse public goal & project ideas') },
    { path: '/about', icon: Info, label: t('nav.about', 'About'), description: t('nav.aboutDesc', 'Third-party disclaimer') },
  ];

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
          <aside className="bg-base-100 min-h-full w-72 flex flex-col border-l border-base-300/30" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-base-200">
                <div>
                <h2 className="text-lg font-bold">{t('nav.more')}</h2>
                <p className="text-xs text-base-content/70">{t('nav.moreSubtitle')}</p>
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
                const colorClass = isActive ? 'blue' : '';
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
                    <div className={`ios-icon ${colorClass} w-9 h-9 shrink-0`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className={`font-medium text-sm ${isActive ? 'text-primary' : ''}`}>{item.label}</p>
                      <p className="text-xs text-base-content/70">{item.description}</p>
                    </div>
                  </button>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-base-200">
              <p className="text-xs text-base-content/70 text-center">
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
