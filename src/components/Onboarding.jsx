/**
 * Onboarding Component
 * Shows a welcome screen for first-time and returning users.
 * Stored flag: 'jw-habits-onboarded' — once set, component is hidden.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  Heart,
  Users,
  Target,
  Star,
  ChevronRight,
  Sparkles,
  CheckCircle,
} from 'lucide-react';
import { haptics } from '../utils/native';

const STORAGE_KEY = 'jw-habits-onboarded';

function isOnboarded() {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

function markOnboarded() {
  localStorage.setItem(STORAGE_KEY, 'true');
}

const FEATURES = [
  {
    icon: BookOpen,
    titleKey: 'onboarding.featureBible',
    descKey: 'onboarding.featureBibleDesc',
    color: 'text-accent',
    bg: 'bg-accent/10',
  },
  {
    icon: Heart,
    titleKey: 'onboarding.featurePrayer',
    descKey: 'onboarding.featurePrayerDesc',
    color: 'text-error',
    bg: 'bg-error/10',
  },
  {
    icon: Users,
    titleKey: 'onboarding.featureFamily',
    descKey: 'onboarding.featureFamilyDesc',
    color: 'text-secondary',
    bg: 'bg-secondary/10',
  },
  {
    icon: Target,
    titleKey: 'onboarding.featureGoals',
    descKey: 'onboarding.featureGoalsDesc',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
];

export default function Onboarding() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    // Show onboarding only if not yet completed
    if (!isOnboarded()) {
      // Small delay so app UI first renders
      const timer = setTimeout(() => setVisible(true), 400);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    haptics.success();
    markOnboarded();
    setVisible(false);
  };

  const handleNext = () => {
    haptics.light();
    if (currentPage < FEATURES.length) {
      setCurrentPage((p) => p + 1);
    }
  };

  if (!visible) return null;

  const isLastPage = currentPage === FEATURES.length;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center animate-fade-in-up">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleDismiss}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-sm sm:mx-4 bg-base-100 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Top accent bar */}
        <div className="h-1 bg-gradient-to-r from-primary via-secondary to-accent" />

        <div className="px-6 pt-6 pb-8">
          {/* Logo / Icon */}
          {!isLastPage && (
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-2xl bg-primary/10">
                <Sparkles className="w-10 h-10 text-primary animate-gentle-pulse" />
              </div>
            </div>
          )}

          {/* Page content */}
          {currentPage === 0 ? (
            /* Welcome page */
            <div className="text-center">
              <h2 className="text-2xl font-bold text-base-content">
                {t('onboarding.welcome')}
              </h2>
              <p className="mt-2 text-base-content/60 text-sm leading-relaxed">
                {t('onboarding.welcomeDesc')}
              </p>
            </div>
          ) : isLastPage ? (
            /* Done page */
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-2xl bg-success/10">
                  <CheckCircle className="w-10 h-10 text-success" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-base-content">
                {t('onboarding.allSet')}
              </h2>
              <p className="mt-2 text-base-content/60 text-sm leading-relaxed">
                {t('onboarding.allSetDesc')}
              </p>
            </div>
          ) : (
            /* Feature page */
            <div className="text-center">
              {(() => {
                const feature = FEATURES[currentPage - 1];
                const Icon = feature.icon;
                return (
                  <>
                    <div className="flex justify-center mb-4">
                      <div className={`p-4 rounded-2xl ${feature.bg}`}>
                        <Icon className={`w-10 h-10 ${feature.color}`} />
                      </div>
                    </div>
                    <h2 className="text-xl font-bold text-base-content">
                      {t(feature.titleKey)}
                    </h2>
                    <p className="mt-2 text-base-content/60 text-sm leading-relaxed">
                      {t(feature.descKey)}
                    </p>
                  </>
                );
              })()}
            </div>
          )}

          {/* Page dots */}
          {!isLastPage && (
            <div className="flex justify-center gap-2 mt-6">
              {[0, ...FEATURES.map((_, i) => i + 1)].map((page) => (
                <div
                  key={page}
                  className={`h-1.5 rounded-full transition-all ${
                    page === currentPage
                      ? 'w-6 bg-primary'
                      : 'w-1.5 bg-base-300'
                  }`}
                />
              ))}
            </div>
          )}

          {/* CTA Button */}
          <div className="mt-6">
            {isLastPage ? (
              <button
                onClick={handleDismiss}
                className="btn btn-primary w-full btn-touch text-white font-semibold shadow-lg"
              >
                <Star className="w-5 h-5" />
                {t('onboarding.startTracking')}
              </button>
            ) : (
              <button
                onClick={currentPage === 0 ? handleNext : handleNext}
                className="btn btn-primary w-full btn-touch text-white font-semibold shadow-lg"
              >
                {currentPage === 0 ? t('onboarding.getStarted') : (
                  <>
                    {t('onboarding.next')}
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            )}
          </div>

          {/* Skip */}
          {!isLastPage && (
            <button
              onClick={handleDismiss}
              className="btn btn-ghost btn-sm w-full mt-2 text-base-content/40 hover:text-base-content/60"
            >
              {t('onboarding.skip')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}