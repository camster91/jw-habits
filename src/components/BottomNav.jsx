import { Home, BarChart3, Settings, Link2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/stats', icon: BarChart3, label: 'Stats' },
    { path: '/links', icon: Link2, label: 'Links' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <nav className="btm-nav btm-nav-lg bg-base-200 border-t" aria-label="Main navigation">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.path}
            className={isActive ? 'active' : ''}
            onClick={() => navigate(item.path)}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <item.icon className="w-5 h-5" aria-hidden="true" />
            <span className="btm-nav-label text-xs">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default BottomNav;
