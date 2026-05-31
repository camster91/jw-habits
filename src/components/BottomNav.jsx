import { Home, BookOpen, Target, Cross } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { haptics } from '../utils/native';

function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/study', icon: BookOpen, label: 'Study' },
    { path: '/goals', icon: Target, label: 'Goals' },
    { path: '/service', icon: Cross, label: 'Service' },
  ];

  const handleNavClick = (path) => {
    if (location.pathname !== path) {
      haptics.light();
      navigate(path);
    }
  };

  // Check if current path matches a nav item or is a sub-path of it
  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      className="btm-nav btm-nav-lg bg-base-200 border-t"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Main navigation"
    >
      {navItems.map((item) => {
        const active = isActive(item.path);
        return (
          <button
            key={item.path}
            className={active ? 'active' : ''}
            onClick={() => handleNavClick(item.path)}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
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