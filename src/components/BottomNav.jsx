import { Home, BookOpen, Target } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { haptics } from '../utils/native';

function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const navItems = [
    { path: '/', icon: Home, label: t('nav.home') },
    { path: '/study', icon: BookOpen, label: t('nav.study') },
    { path: '/goals', icon: Target, label: t('nav.goals') },
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