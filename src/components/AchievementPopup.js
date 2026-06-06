import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Trophy, X, Star } from 'lucide-react';
import useGamificationStore from '../stores/gamificationStore.js';
import { haptics } from '../utils/native.js';
function ConfettiParticle({ delay, color, left }) {
    return (_jsx("div", { className: "absolute w-2 h-2 rounded-full animate-confetti", style: {
            backgroundColor: color,
            left: `${left}%`,
            animationDelay: `${delay}ms`,
        } }));
}
// Generate random confetti colors
const CONFETTI_COLORS = [
    '#FFD700', // Gold
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#A78BFA', // Purple
    '#FB923C', // Orange
    '#34D399', // Green
];
function AchievementPopup() {
    const { recentAchievements, clearRecentAchievements, getLevel } = useGamificationStore();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);
    const [particles, setParticles] = useState([]);
    const currentAchievement = recentAchievements[currentIndex];
    const level = getLevel();
    // Use useMemo to derive particles instead of setState in effect
    const confettiParticles = currentAchievement
        ? Array.from({ length: 20 }, (_, i) => ({
              id: i,
              delay: i * 50,
              color: CONFETTI_COLORS[i % CONFETTI_COLORS.length] ?? '#FFD700',
              left: Math.random() * 100,
          }))
        : [];
    useEffect(() => {
        if (recentAchievements.length > 0 && !isVisible) {
            const timer = setTimeout(() => {
                setIsVisible(true);
                haptics.success();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [recentAchievements, isVisible]);
    const handleNext = () => {
        haptics.light();
        if (currentIndex < recentAchievements.length - 1) {
            setIsExiting(true);
            setTimeout(() => {
                setCurrentIndex(currentIndex + 1);
                setIsExiting(false);
                haptics.success();
            }, 200);
        }
        else {
            handleClose();
        }
    };
    const handleClose = () => {
        haptics.light();
        setIsExiting(true);
        setTimeout(() => {
            setIsVisible(false);
            setCurrentIndex(0);
            setIsExiting(false);
            clearRecentAchievements();
        }, 300);
    };
    if (!isVisible || !currentAchievement) {
        return null;
    }
    return (_jsxs("div", { className: "fixed inset-0 z-[60] flex items-center justify-center p-4", children: [_jsx("div", { className: `absolute inset-0 bg-black/60 transition-opacity duration-300 ${isExiting ? 'opacity-0' : 'opacity-100'}`, onClick: handleClose }), _jsx("div", { className: "absolute inset-0 overflow-hidden pointer-events-none", children: particles.map((particle) => (_jsx(ConfettiParticle, { delay: particle.delay, color: particle.color, left: particle.left }, particle.id))) }), _jsxs("div", { className: `relative bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all duration-300 ${isExiting ? 'scale-90 opacity-0' : 'animate-achievement-pop'}`, children: [_jsx("button", { onClick: handleClose, className: "absolute top-3 right-3 btn btn-ghost btn-sm btn-circle text-white/80 hover:text-white", children: _jsx(X, { className: "w-5 h-5" }) }), _jsxs("div", { className: "relative p-6 text-center", children: [_jsxs("div", { className: "flex items-center justify-center gap-2 mb-4", children: [_jsx(Star, { className: "w-5 h-5 text-white animate-pulse" }), _jsx("span", { className: "text-white/90 font-semibold tracking-wide uppercase text-sm", children: "Achievement Unlocked!" }), _jsx(Star, { className: "w-5 h-5 text-white animate-pulse" })] }), _jsxs("div", { className: "relative inline-block mb-4", children: [_jsx("div", { className: "w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center animate-bounce-subtle", children: _jsx("span", { className: "text-5xl animate-wiggle", children: currentAchievement.icon }) }), _jsx("div", { className: "absolute inset-0 rounded-full border-4 border-white/40 animate-ping-slow" })] }), _jsx("h2", { className: "text-2xl font-bold text-white mb-2 animate-fade-in-up", children: currentAchievement.name }), _jsx("p", { className: "text-white/80 mb-4 animate-fade-in-up", style: { animationDelay: '100ms' }, children: currentAchievement.description }), currentAchievement.points > 0 && (_jsxs("div", { className: "inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-4 animate-fade-in-up", style: { animationDelay: '200ms' }, children: [_jsx(Trophy, { className: "w-5 h-5 text-yellow-200" }), _jsxs("span", { className: "text-white font-bold", children: ["+", currentAchievement.points, " points"] })] })), _jsxs("div", { className: "text-white/70 text-sm mb-6 animate-fade-in-up", style: { animationDelay: '300ms' }, children: ["Level ", level] }), _jsxs("div", { className: "flex gap-3 justify-center animate-fade-in-up", style: { animationDelay: '400ms' }, children: [recentAchievements.length > 1 && (_jsxs("div", { className: "text-white/60 text-sm self-center", children: [currentIndex + 1, " of ", recentAchievements.length] })), _jsx("button", { onClick: handleNext, className: "btn bg-white text-amber-600 hover:bg-white/90 border-none shadow-lg", children: currentIndex < recentAchievements.length - 1 ? 'Next' : 'Awesome!' })] })] }), _jsx("div", { className: "h-2 bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-400" })] })] }));
}
export default AchievementPopup;
//# sourceMappingURL=AchievementPopup.js.map