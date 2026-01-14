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
    <div className="btm-nav btm-nav-lg bg-base-200 border-t">
      {navItems.map(({ path, icon: Icon, label }) => (
        <button
          key={path}
          className={location.pathname === path ? 'active' : ''}
          onClick={() => navigate(path)}
        >
          <Icon className="w-5 h-5" />
          <span className="btm-nav-label text-xs">{label}</span>
        </button>
      ))}
    </div>
  );
}

export default BottomNav;
