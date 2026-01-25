import { Home, BarChart3, Settings, Link2, Newspaper } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import useNewsStore from '../stores/newsStore';
import { haptics } from '../utils/native';

function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const unreadCount = useNewsStore((state) => state.getUnreadCount());

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/news', icon: Newspaper, label: 'News', badge: unreadCount },
    { path: '/stats', icon: BarChart3, label: 'Stats' },
    { path: '/links', icon: Link2, label: 'Links' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const handleNavClick = (path) => {
    if (location.pathname !== path) {
      haptics.light();
      navigate(path);
    }
  };

  return (
    <nav
      className="btm-nav btm-nav-lg bg-base-200 border-t"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Main navigation"
    >
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.path}
            className={isActive ? 'active' : ''}
            onClick={() => handleNavClick(item.path)}
            aria-label={item.badge ? `${item.label} (${item.badge} unread)` : item.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <div className="relative">
              <item.icon className="w-5 h-5" aria-hidden="true" />
              {item.badge > 0 && (
                <span className="absolute -top-1 -right-1 badge badge-xs badge-primary">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </div>
            <span className="btm-nav-label text-xs">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default BottomNav;
