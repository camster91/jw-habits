import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import useServiceStore from '../stores/serviceStore';
import useGamificationStore from '../stores/gamificationStore';
import { haptics } from '../utils/native';
import { format } from 'date-fns';

const QUICK_OPTIONS = [
  { label: '1h Field Service', hours: 1, type: 'field-service', emoji: '🚪' },
  { label: '2h Field Service', hours: 2, type: 'field-service', emoji: '🚪' },
  { label: 'Return Visit', hours: 0.5, type: 'return-visit', emoji: '🔄' },
  { label: 'Bible Study', hours: 1, type: 'bible-study', emoji: '📖' },
];

/**
 * QuickAddFAB — floating action button that lets you log service activity
 * from any tab in the app. Opens a compact modal with quick-time options.
 */
export default function QuickAddFAB() {
  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customHours, setCustomHours] = useState({ minutes: 60, type: 'field-service' });
  // Single-flight guard. Without this, a 5-tap storm on a quick-add
  // button creates 5 service entries, doubles the gamification XP,
  // and lets users farm the first_service / service_10h / service_50h
  // achievements trivially. Same pattern used in Service.jsx:30,114.
  const [isSubmitting, setIsSubmitting] = useState(false);
  const addEntry = useServiceStore((s) => s.addEntry);
  const recordServiceActivity = useGamificationStore((s) => s.recordServiceActivity);

  const today = format(new Date(), 'yyyy-MM-dd');

  const handleQuickAdd = (hours, type) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    haptics.success();
    addEntry({
      date: today,
      durationMinutes: Math.round(hours * 60),
      type,
      placements: type === 'field-service' ? Math.round(hours * 2) : 0,
      returnVisits: type === 'return-visit' ? 1 : 0,
      bibleStudies: type === 'bible-study' ? 1 : 0,
    });
    recordServiceActivity(hours);
    setOpen(false);
    setTimeout(() => setIsSubmitting(false), 600);
  };

  const handleCustomAdd = () => {
    if (isSubmitting) return;
    if (customHours.minutes < 1) return;
    setIsSubmitting(true);
    haptics.success();
    addEntry({
      date: today,
      durationMinutes: customHours.minutes,
      type: customHours.type,
    });
    recordServiceActivity(customHours.minutes / 60);
    setOpen(false);
    setShowCustom(false);
    setTimeout(() => setIsSubmitting(false), 600);
  };

  return (
    <>
      {/* Overlay */}
      {open && (
        <div className="fab-overlay" onClick={() => setOpen(false)} />
      )}

      {/* Menu */}
      {open && (
        <div className="fab-menu">
          <div className="fab-menu-header">
            <span>Log Service</span>
            <button onClick={() => setOpen(false)} className="fab-close">
              <X className="w-4 h-4" />
            </button>
          </div>

          {!showCustom ? (
            <div className="fab-options">
              {QUICK_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  className="fab-option"
                  onClick={() => handleQuickAdd(opt.hours, opt.type)}
                >
                  <span className="fab-option-emoji">{opt.emoji}</span>
                  <span className="fab-option-label">{opt.label}</span>
                </button>
              ))}
              <button
                className="fab-option fab-option-custom"
                onClick={() => setShowCustom(true)}
              >
                <span className="fab-option-emoji">⏱</span>
                <span className="fab-option-label">Custom</span>
              </button>
            </div>
          ) : (
            <div className="fab-custom">
              <div className="fab-custom-field">
                <label>Minutes</label>
                <input
                  type="number"
                  min={1}
                  max={480}
                  step={5}
                  value={customHours.minutes}
                  onChange={(e) =>
                    setCustomHours((c) => ({ ...c, minutes: parseInt(e.target.value) || 0 }))
                  }
                  autoFocus
                />
              </div>
              <div className="fab-custom-field">
                <label>Type</label>
                <select
                  value={customHours.type}
                  onChange={(e) =>
                    setCustomHours((c) => ({
                      ...c,
                      type: e.target.value,
                    }))
                  }
                >
                  <option value="field-service">Field Service</option>
                  <option value="return-visit">Return Visit</option>
                  <option value="bible-study">Bible Study</option>
                </select>
              </div>
              <div className="fab-custom-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => setShowCustom(false)}>
                  Back
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleCustomAdd}>
                  Log
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FAB button */}
      <button
        className="fab-button"
        onClick={() => {
          haptics.light();
          setOpen((o) => !o);
        }}
        aria-label={open ? 'Close' : 'Quick add service'}
      >
        {open ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
      </button>
    </>
  );
}
