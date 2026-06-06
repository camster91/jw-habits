import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BarChart3, Link2, Settings, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { haptics } from '../utils/native.js';
import { DrawerContext } from '../hooks/useDrawer.js';
function SideDrawer({ children }) {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const DRAWER_ITEMS = [
        { path: '/statistics', icon: BarChart3, label: t('nav.statistics'), description: t('nav.statisticsDesc') },
        { path: '/links', icon: Link2, label: t('nav.quickLinks'), description: t('nav.quickLinksDesc') },
        { path: '/settings', icon: Settings, label: t('nav.settings'), description: t('nav.settingsDesc') },
    ];
    const openDrawer = useCallback(() => {
        haptics.light();
        setIsOpen(true);
    }, []);
    const closeDrawer = useCallback(() => {
        setIsOpen(false);
    }, []);
    const handleNavClick = (path) => {
        haptics.light();
        setIsOpen(false);
        setTimeout(() => navigate(path), 150);
    };
    return (_jsx(DrawerContext.Provider, { value: { openDrawer, closeDrawer, isOpen }, children: _jsxs("div", { className: "drawer", children: [_jsx("input", { id: "side-drawer", type: "checkbox", className: "drawer-toggle", checked: isOpen, onChange: (e) => setIsOpen(e.target.checked) }), _jsx("div", { className: "drawer-content", children: children }), _jsxs("div", { className: "drawer-side z-50", children: [_jsx("label", { htmlFor: "side-drawer", className: "drawer-overlay", "aria-label": "Close menu" }), _jsxs("aside", { className: "bg-base-100 min-h-full w-72 flex flex-col", style: { paddingTop: 'env(safe-area-inset-top)' }, children: [_jsxs("div", { className: "flex items-center justify-between p-4 border-b border-base-200", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-bold", children: t('nav.more') }), _jsx("p", { className: "text-xs text-base-content/50", children: t('nav.moreSubtitle') })] }), _jsx("button", { onClick: closeDrawer, className: "btn btn-ghost btn-sm btn-square", "aria-label": "Close menu", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsx("nav", { className: "flex-1 p-3 space-y-1", children: DRAWER_ITEMS.map((item) => {
                                        const Icon = item.icon;
                                        const isActive = location.pathname === item.path;
                                        return (_jsxs("button", { onClick: () => handleNavClick(item.path), className: `flex items-center gap-3 w-full p-3 rounded-xl transition-all active:scale-[0.98] ${isActive
                                                ? 'bg-primary/10 text-primary'
                                                : 'hover:bg-base-200 active:bg-base-200'}`, children: [_jsx("div", { className: `p-2 rounded-xl ${isActive ? 'bg-primary/15' : 'bg-base-200'}`, children: _jsx(Icon, { className: `w-5 h-5 ${isActive ? 'text-primary' : 'text-base-content/60'}` }) }), _jsxs("div", { className: "text-left", children: [_jsx("p", { className: `font-medium text-sm ${isActive ? 'text-primary' : ''}`, children: item.label }), _jsx("p", { className: "text-xs text-base-content/50", children: item.description })] })] }, item.path));
                                    }) }), _jsx("div", { className: "p-4 border-t border-base-200", children: _jsx("p", { className: "text-xs text-base-content/40 text-center", children: "JW Habits" }) })] })] })] }) }));
}
export default SideDrawer;
//# sourceMappingURL=SideDrawer.js.map