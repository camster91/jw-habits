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
  ArrowRight,
  Sparkles,
  CheckCircle,
} from 'lucide-react';
import { haptics } from '../utils/native';
import useSettingsStore from '../stores/settingsStore';

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

const PUBLISHER_OPTIONS = [
  { value: 'pioneer', label: 'Pioneer', sub: 'Full-time ministry' },
  { value: 'regular', label: 'Regular Publisher', sub: 'Monthly ministry' },
  { value: 'none', label: 'Not currently publishing', sub: 'Personal habits only' },
];

export default function Onboarding() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [name, setName] = useState('');
  const [publisherStatus, setPublisherStatus] = useState('none');
  const setUserName = useSettingsStore((s) => s.setUserName);
  const setPublisherStatusAction = useSettingsStore((s) => s.setPublisherStatus);

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
    // Guard: after rehydration, function actions can be undefined.
    // The persist middleware doesn't store functions, so on first load the
    // initial state has them, but if anything has set state to the rehydrated
    // shape, the function may be missing.
    if (name.trim() && typeof setUserName === 'function') {
      setUserName(name.trim());
    }
    if (typeof setPublisherStatusAction === 'function') {
      setPublisherStatusAction(publisherStatus);
    }
    markOnboarded();
    setVisible(false);
  };

  const handleNext = () => {
    haptics.light();
    if (currentPage < FEATURES.length + 1) {
      setCurrentPage((p) => p + 1);
    }
  };

  if (!visible) return null;

  // Publisher status step is after all features (FEATURES.length) and before "All Set"
  const isPublisherStep = currentPage === FEATURES.length + 1;
  const isLastPage = currentPage === FEATURES.length + 2;

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
              <p className="mt-2 text-base-content/70 text-sm leading-relaxed">
                {t('onboarding.welcomeDesc')}
              </p>
              <div className="mt-5">
                <label className="block text-left text-xs font-medium text-base-content/70 mb-1.5">
                  Your first name (optional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 30))}
                  placeholder="e.g. Sarah"
                  className="input input-bordered w-full text-center text-lg"
                  maxLength={30}
                  autoComplete="given-name"
                />
                <p className="mt-1.5 text-[10px] text-base-content/70">
                  Stored on this device only. You can change it later in Settings.
                </p>
              </div>
            </div>
          ) : isPublisherStep ? (
            /* Publisher status step */
            <div className="text-center">
              <h2 className="text-2xl font-bold text-base-content">
                What's your publishing status?
              </h2>
              <p className="mt-2 text-base-content/70 text-sm leading-relaxed">
                This helps us personalize your experience.
              </p>
              <div className="mt-5 space-y-2">
                {PUBLISHER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      haptics.light();
                      setPublisherStatus(opt.value);
                    }}
                    className={`ios-pill-btn w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                      publisherStatus === opt.value
                        ? 'border-primary bg-primary/10'
                        : 'border-base-300 bg-base-100'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        publisherStatus === opt.value
                          ? 'border-primary bg-primary'
                          : 'border-base-300'
                      }`}
                    >
                      {publisherStatus === opt.value && (
                        <div className="w-2.5 h-2.5 rounded-full bg-white" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-base-content">{opt.label}</div>
                      <div className="text-xs text-base-content/70">{opt.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
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
              <p className="mt-2 text-base-content/70 text-sm leading-relaxed">
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
                    <p className="mt-2 text-base-content/70 text-sm leading-relaxed">
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
              {[0, 1, 2, 3, 4, 5, 6].slice(0, FEATURES.length + 2).map((page) => (
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

          {/* CTA Button — on the welcome page (page 0), "Get Started" dismisses
              the modal immediately and goes to home. Otherwise, advance. */}
          <div className="mt-6">
            {isLastPage ? (
              <button
                onClick={handleDismiss}
                className="btn btn-primary w-full btn-touch text-white font-semibold shadow-lg"
              >
                <Star className="w-5 h-5" />
                {t('onboarding.startTracking')}
              </button>
            ) : currentPage === 0 ? (
              <button
                onClick={handleDismiss}
                className="btn btn-primary w-full btn-touch text-white font-semibold shadow-lg"
              >
                <ArrowRight className="w-5 h-5" />
                {t('onboarding.getStarted')}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="btn btn-primary w-full btn-touch text-white font-semibold shadow-lg"
              >
                {t('onboarding.next')}
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Skip */}
          {!isLastPage && (
            <button
              onClick={handleDismiss}
              className="btn btn-ghost btn-sm w-full mt-2 text-base-content/70 hover:text-base-content/70"
            >
              {t('onboarding.skip')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}