/**
 * AchievementPopup Component
 * Displays a celebratory popup when user earns achievements
 */

import { useEffect, useState } from 'react';
import { Trophy, X, Sparkles } from 'lucide-react';
import useGamificationStore from '../stores/gamificationStore';
import { haptics } from '../utils/native';

// Confetti particle component
function ConfettiParticle({ delay, color, left }) {
  return (
    <div
      className="absolute w-2 h-2 rounded-full animate-confetti"
      style={{
        backgroundColor: color,
        left: `${left}%`,
        animationDelay: `${delay}ms`,
      }}
    />
  );
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

  const currentAchievement = recentAchievements[currentIndex];
  const level = getLevel();

  useEffect(() => {
    if (recentAchievements.length > 0 && !isVisible) {
      // Delay showing popup slightly for better UX
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
    } else {
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

  // Generate confetti particles
  const confettiParticles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    delay: i * 50,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    left: Math.random() * 100,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${
          isExiting ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleClose}
      />

      {/* Confetti container */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confettiParticles.map((particle) => (
          <ConfettiParticle
            key={particle.id}
            delay={particle.delay}
            color={particle.color}
            left={particle.left}
          />
        ))}
      </div>

      {/* Achievement card */}
      <div
        className={`relative bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all duration-300 ${
          isExiting ? 'scale-90 opacity-0' : 'animate-achievement-pop'
        }`}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 btn btn-ghost btn-sm btn-circle text-white/80 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-white/30 rounded-full blur-3xl" />

        <div className="relative p-6 text-center">
          {/* Achievement unlocked label */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
            <span className="text-white/90 font-semibold tracking-wide uppercase text-sm">
              Achievement Unlocked!
            </span>
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>

          {/* Achievement icon */}
          <div className="relative inline-block mb-4">
            <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center animate-bounce-subtle">
              <span className="text-5xl animate-wiggle">{currentAchievement.icon}</span>
            </div>
            {/* Glow ring */}
            <div className="absolute inset-0 rounded-full border-4 border-white/40 animate-ping-slow" />
          </div>

          {/* Achievement name */}
          <h2 className="text-2xl font-bold text-white mb-2 animate-fade-in-up">
            {currentAchievement.name}
          </h2>

          {/* Achievement description */}
          <p className="text-white/80 mb-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            {currentAchievement.description}
          </p>

          {/* Points earned */}
          {currentAchievement.points > 0 && (
            <div
              className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-4 animate-fade-in-up"
              style={{ animationDelay: '200ms' }}
            >
              <Trophy className="w-5 h-5 text-yellow-200" />
              <span className="text-white font-bold">+{currentAchievement.points} points</span>
            </div>
          )}

          {/* Level display */}
          <div
            className="text-white/70 text-sm mb-6 animate-fade-in-up"
            style={{ animationDelay: '300ms' }}
          >
            Level {level}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 justify-center animate-fade-in-up" style={{ animationDelay: '400ms' }}>
            {recentAchievements.length > 1 && (
              <div className="text-white/60 text-sm self-center">
                {currentIndex + 1} of {recentAchievements.length}
              </div>
            )}
            <button
              onClick={handleNext}
              className="btn bg-white text-amber-600 hover:bg-white/90 border-none shadow-lg"
            >
              {currentIndex < recentAchievements.length - 1 ? 'Next' : 'Awesome!'}
            </button>
          </div>
        </div>

        {/* Bottom decorative bar */}
        <div className="h-2 bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-400" />
      </div>
    </div>
  );
}

export default AchievementPopup;
