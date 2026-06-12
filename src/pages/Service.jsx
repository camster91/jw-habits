import { useState, useMemo } from 'react';
import { Cross, Plus, Trash2, Calendar, Clock, Target, ChevronDown, BookOpen, Users, MessageSquare, Timer, BarChart3 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import useServiceStore from '../stores/serviceStore';
import useGamificationStore from '../stores/gamificationStore';
import { haptics } from '../utils/native';
import { useToast } from '../components/Toast';

const ENTRY_TYPES = [
  { id: 'field-service', label: 'Field Service', icon: Cross, color: 'badge-primary' },
  { id: 'return-visit', label: 'Return Visit', icon: Users, color: 'badge-secondary' },
  { id: 'bible-study', label: 'Bible Study', icon: BookOpen, color: 'badge-accent' },
  { id: 'door-to-door', label: 'Door-to-Door', icon: MessageSquare, color: 'badge-info' },
  { id: 'other', label: 'Other', icon: BarChart3, color: 'badge-neutral' },
];

const QUICK_ADD_HOURS = [1, 2, 3];

function Service() {
  const toast = useToast();
  const [note, setNote] = useState('');
  const [customHours, setCustomHours] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [selectedType, setSelectedType] = useState('field-service');
  // Single-flight guard for entry + goal submissions. Prevents a rapid double-tap
  // (or 5-tap) from creating duplicate entries. 600ms is enough to swallow a tap-stream
  // and short enough to feel instant.
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── New form fields ──────────────────────────────────────
  const [placements, setPlacements] = useState('');
  const [returnVisits, setReturnVisits] = useState('');
  const [bibleStudies, setBibleStudies] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [breaks, setBreaks] = useState('0.5');

  // Per-field selectors — only re-render when these specific slices change
  const addEntry = useServiceStore((s) => s.addEntry);
  const removeEntry = useServiceStore((s) => s.removeEntry);
  const setMonthlyGoal = useServiceStore((s) => s.setMonthlyGoal);
  const getTodaysEntries = useServiceStore((s) => s.getTodaysEntries);
  const getWeeklyEntries = useServiceStore((s) => s.getWeeklyEntries);
  const getWeeklyTotal = useServiceStore((s) => s.getWeeklyTotal);
  const getMonthlyTotal = useServiceStore((s) => s.getMonthlyTotal);
  const getWeeklyPlacements = useServiceStore((s) => s.getWeeklyPlacements);
  const getWeeklyReturnVisits = useServiceStore((s) => s.getWeeklyReturnVisits);
  const getWeeklyBibleStudies = useServiceStore((s) => s.getWeeklyBibleStudies);
  const getMonthlyPlacements = useServiceStore((s) => s.getMonthlyPlacements);
  const getMonthlyReturnVisits = useServiceStore((s) => s.getMonthlyReturnVisits);
  const getMonthlyBibleStudies = useServiceStore((s) => s.getMonthlyBibleStudies);
  const getTodaysHours = useServiceStore((s) => s.getTodaysHours);
  const monthlyGoalHours = useServiceStore((s) => s.monthlyGoalHours);
  const entries = useServiceStore((s) => s.entries);

  const addServiceActivity = useGamificationStore((s) => s.recordServiceActivity);

  const todaysEntries = getTodaysEntries();
  const weeklyEntries = getWeeklyEntries();
  const weeklyTotal = getWeeklyTotal();
  const monthlyTotal = getMonthlyTotal();
  const weeklyPlacements = getWeeklyPlacements();
  const weeklyReturnVisits = getWeeklyReturnVisits();
  const weeklyBibleStudies = getWeeklyBibleStudies();
  const monthProgress = monthlyGoalHours > 0 ? Math.min((monthlyTotal / monthlyGoalHours) * 100, 100) : 0;

  // Last 7 days of service hours (for the bar chart)
  const last7Days = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const hours = entries
        .filter((e) => e.date === dateStr)
        .reduce((sum, e) => sum + (e.durationMinutes || 0), 0) / 60;
      days.push({
        date: dateStr,
        label: d.toLocaleDateString('en-US', { weekday: 'short' })[0],
        hours,
      });
    }
    return days;
  }, [entries]);
  const last7DaysTotal = last7Days.reduce((s, d) => s + d.hours, 0);

  // ── Auto-calculate hours from start/end/breaks ───────────
  const computedHours = useMemo(() => {
    if (!startTime || !endTime) return null;
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff < 0) diff += 24 * 60; // overnight
    diff = diff / 60 - (Number(breaks) || 0);
    return Math.max(0, Math.round(diff * 10) / 10);
  }, [startTime, endTime, breaks]);

  const resetForm = () => {
    setCustomHours('');
    setNote('');
    setPlacements('');
    setReturnVisits('');
    setBibleStudies('');
    setStartTime('');
    setEndTime('');
    setBreaks('0.5');
    setShowCustom(false);
  };

  const handleQuickAdd = (h) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    haptics.light();
    addEntry({ type: selectedType, hours: h, date: new Date().toISOString().split('T')[0] });
    addServiceActivity(h, 0, 0);
    toast.success(`Added ${h}h entry`);
    setTimeout(() => setIsSubmitting(false), 600);
  };

  const handleCustomAdd = () => {
    if (isSubmitting) return;
    const raw = computedHours ?? parseFloat(customHours);
    // Cap at 24h — no one does 99,999 hours of service in a day.
    const MAX_DAILY_HOURS = 24;
    if (!raw || raw <= 0) { toast.error('Please enter valid hours'); return; }
    if (raw > MAX_DAILY_HOURS) { toast.error(`Daily hours cannot exceed ${MAX_DAILY_HOURS}`); return; }
    setIsSubmitting(true);
    const h = raw;
    haptics.light();
    const rv = parseInt(returnVisits) || 0;
    const p = parseInt(placements) || 0;
    const bs = parseInt(bibleStudies) || 0;
    addEntry({
      type: selectedType,
      hours: h,
      date: new Date().toISOString().split('T')[0],
      note: note.trim(),
      placements: p,
      returnVisits: rv,
      bibleStudies: bs,
      startTime: startTime || null,
      endTime: endTime || null,
      breaks: breaks ? Number(breaks) : 0,
    });
    addServiceActivity(h, rv + bs, p);
    resetForm();
    toast.success(`Added ${h}h entry`);
    setTimeout(() => setIsSubmitting(false), 600);
  };

  const handleDelete = (id) => {
    haptics.light();
    removeEntry(id);
    toast.info('Entry removed');
  };

  const handleSetGoal = () => {
    if (isSubmitting) return;
    const raw = parseFloat(goalInput);
    const MAX_MONTHLY_GOAL = 744; // 31 days × 24h
    if (!raw || raw <= 0) { toast.error('Please enter a valid goal'); return; }
    if (raw > MAX_MONTHLY_GOAL) { toast.error(`Monthly goal cannot exceed ${MAX_MONTHLY_GOAL}h`); return; }
    setIsSubmitting(true);
    const goal = raw;
    haptics.success();
    setMonthlyGoal(goal);
    setGoalInput('');
    setShowGoalModal(false);
    toast.success(`Monthly goal set to ${goal}h`);
    setTimeout(() => setIsSubmitting(false), 600);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateStr === today.toISOString().split('T')[0]) return 'Today';
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getTypeMeta = (typeId) => ENTRY_TYPES.find((t) => t.id === typeId) || ENTRY_TYPES[0];

  const renderEntry = (entry) => {
    const meta = getTypeMeta(entry.type);
    const Icon = meta.icon;
    return (
      <div key={entry.id} className="flex items-center justify-between py-3 px-1">
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4 text-base-content/70" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">{formatDate(entry.date)}</span>
            <span className={`badge badge-sm ${meta.color} mt-1`}>{meta.label}</span>
            {entry.note && <span className="text-xs text-base-content/70 mt-0.5 truncate max-w-[200px]">{entry.note}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 text-xs text-base-content/70">
            {entry.placements > 0 && <span title="Placements">📚{entry.placements}</span>}
            {entry.returnVisits > 0 && <span title="Return Visits">🔄{entry.returnVisits}</span>}
            {entry.bibleStudies > 0 && <span title="Bible Studies">📖{entry.bibleStudies}</span>}
          </div>
          <div className="flex items-center gap-1 text-primary font-semibold">
            <Clock className="w-4 h-4" />
            <span>{entry.hours}h</span>
          </div>
          <button
            onClick={() => handleDelete(entry.id)}
            className="btn btn-ghost btn-sm btn-circle text-error/60 hover:text-error hover:bg-error/10"
            aria-label="Delete entry"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      <PageHeader
        title="Service"
        subtitle="Track your field service"
        icon={Cross}
        gradient="from-green-500 via-emerald-500 to-teal-600"
        blurColor="emerald"
      />

      <main className="container mx-auto px-4 pt-4 space-y-4 max-w-2xl">
        {/* ── Weekly Summary Card (enhanced) ─────────────── */}
        <section className="card bg-base-100 shadow-sm">
          <div className="card-body p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <span className="font-semibold">This Week</span>
              </div>
              <button
                onClick={() => { haptics.light(); setShowGoalModal(true); setGoalInput(String(monthlyGoalHours)); }}
                className="btn btn-ghost btn-sm gap-1"
              >
                <Target className="w-4 h-4" />
                <span className="text-xs">{monthlyGoalHours}h goal</span>
              </button>
            </div>

            {/* Hours */}
            <div className="text-4xl font-bold text-primary">{weeklyTotal}h</div>
            <p className="text-sm text-base-content/70 mt-1">
              {getTodaysHours() > 0 ? `${getTodaysHours()}h today` : 'No entries today'}
            </p>

            {/* Placements / Return Visits / Bible Studies */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="text-center p-2 rounded-lg bg-primary/5">
                <div className="text-lg font-bold text-primary">{weeklyPlacements}</div>
                <div className="text-xs text-base-content/70">Placements</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-secondary/5">
                <div className="text-lg font-bold text-secondary">{weeklyReturnVisits}</div>
                <div className="text-xs text-base-content/70">Return Visits</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-accent/5">
                <div className="text-lg font-bold text-accent">{weeklyBibleStudies}</div>
                <div className="text-xs text-base-content/70">Bible Studies</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Monthly Goal Progress ────────────────────────── */}
        <section className="card bg-base-100 shadow-sm">
          <div className="card-body p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Monthly Goal</span>
              <span className="text-sm text-base-content/70">{monthlyTotal}h / {monthlyGoalHours}h</span>
            </div>
            <progress
              className={`progress ${monthProgress >= 100 ? 'progress-success' : 'progress-primary'} w-full`}
              value={monthProgress} max="100"
            />
            <p className="text-xs text-base-content/70 mt-1">
              {monthProgress >= 100 ? 'Goal reached! 🎉' : `${Math.round(monthProgress)}% of monthly goal`}
            </p>

            {/* Monthly placements/visits/studies */}
            <div className="grid grid-cols-3 gap-2 mt-3 text-xs text-base-content/70">
              <span>📚 {getMonthlyPlacements()} placements</span>
              <span>🔄 {getMonthlyReturnVisits()} visits</span>
              <span>📖 {getMonthlyBibleStudies()} studies</span>
            </div>
          </div>
        </section>

        {/* ── 7-Day Service Hours Chart ──────────────────── */}
        <section className="card bg-base-100 shadow-sm">
          <div className="card-body p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium">Last 7 days</h2>
              <span className="text-xs text-base-content/70">
                {last7DaysTotal.toFixed(1)}h total
              </span>
            </div>
            <div className="relative">
              <div className="flex items-end justify-between gap-1 h-24">
                {last7Days.map((day) => {
                  const maxHours = Math.max(...last7Days.map((d) => d.hours), 1);
                  const heightPct = Math.max((day.hours / maxHours) * 100, day.hours > 0 ? 6 : 0);
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                      <div className="relative w-full flex-1 flex items-end">
                        <div
                          className={`w-full rounded-t ${day.hours > 0 ? 'bg-primary' : 'bg-base-300'}`}
                          style={{ height: `${heightPct}%` }}
                          title={`${day.date}: ${day.hours.toFixed(1)}h`}
                        />
                      </div>
                      <span className="text-[10px] text-base-content/70 font-medium">{day.label}</span>
                      <span className="text-[10px] text-base-content/70 font-bold -mt-0.5">
                        {day.hours > 0 ? day.hours.toFixed(1) : '·'}
                      </span>
                    </div>
                  );
                })}
              </div>
              {last7DaysTotal === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-base-100/85 backdrop-blur-[1px] rounded-xl px-3 py-2 text-center">
                    <p className="text-xs font-medium text-base-content/70">
                      No service entries yet
                    </p>
                    <p className="text-[10px] text-base-content/50 mt-0.5">
                      Tap a quick add button above to log your time
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Entry Type Selector ──────────────────────────── */}
        <section className="card bg-base-100 shadow-sm">
          <div className="card-body p-4">
            <h2 className="text-sm font-medium mb-2">Entry Type</h2>
            <div className="flex flex-wrap gap-2">
              {ENTRY_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => { haptics.light(); setSelectedType(type.id); }}
                  className={`btn btn-sm ${selectedType === type.id ? 'btn-primary' : 'btn-ghost'}`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Quick Add Buttons ────────────────────────────── */}
        <section className="card bg-base-100 shadow-sm">
          <div className="card-body p-4">
            <h2 className="text-sm font-medium mb-3">Quick Add</h2>
            <div className="flex gap-2">
              {QUICK_ADD_HOURS.map((h) => (
                <button key={h} onClick={() => handleQuickAdd(h)} className="btn btn-primary flex-1 gap-1">
                  <Plus className="w-4 h-4" />{h}h
                </button>
              ))}
              <button
                onClick={() => { haptics.light(); setShowCustom(!showCustom); }}
                className="btn btn-ghost flex-1 gap-1"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${showCustom ? 'rotate-180' : ''}`} />
                Custom
              </button>
            </div>

            {/* ── Custom Hours Form (enhanced) ─────────────── */}
            {showCustom && (
              <div className="mt-4 space-y-3 animate-fade-in-up">
                {/* Hours — quick hours input */}
                <div className="form-control">
                  <label className="label py-1"><span className="label-text text-xs">Hours</span></label>
                  <input
                    type="number" placeholder="e.g. 1.5"
                    className="input input-bordered input-sm w-full"
                    value={customHours} onChange={(e) => setCustomHours(e.target.value)}
                    min="0" max="24" step="0.5"
                  />
                </div>

                {/* OR time range */}
                <div className="divider text-xs text-base-content/70 my-1">or enter time range</div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="form-control">
                    <label className="label py-1"><span className="label-text text-xs">Start</span></label>
                    <input
                      type="time" className="input input-bordered input-sm w-full"
                      value={startTime} onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div className="form-control">
                    <label className="label py-1"><span className="label-text text-xs">End</span></label>
                    <input
                      type="time" className="input input-bordered input-sm w-full"
                      value={endTime} onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                  <div className="form-control">
                    <label className="label py-1"><span className="label-text text-xs">Breaks (h)</span></label>
                    <input
                      type="number" className="input input-bordered input-sm w-full"
                      value={breaks} onChange={(e) => setBreaks(e.target.value)}
                      min="0" step="0.25"
                    />
                  </div>
                </div>
                {computedHours !== null && (
                  <div className="flex items-center gap-2 p-2 rounded bg-success/10 text-success text-sm">
                    <Timer className="w-4 h-4" />
                    Computed: <strong>{computedHours}h</strong>
                  </div>
                )}

                {/* ── Placements / Return Visits / Bible Studies ── */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="form-control">
                    <label className="label py-1"><span className="label-text text-xs">📚 Placements</span></label>
                    <input
                      type="number" placeholder="0"
                      className="input input-bordered input-sm w-full"
                      value={placements} onChange={(e) => setPlacements(e.target.value)}
                      min="0"
                    />
                  </div>
                  <div className="form-control">
                    <label className="label py-1"><span className="label-text text-xs">🔄 R. Visits</span></label>
                    <input
                      type="number" placeholder="0"
                      className="input input-bordered input-sm w-full"
                      value={returnVisits} onChange={(e) => setReturnVisits(e.target.value)}
                      min="0"
                    />
                  </div>
                  <div className="form-control">
                    <label className="label py-1"><span className="label-text text-xs">📖 B. Studies</span></label>
                    <input
                      type="number" placeholder="0"
                      className="input input-bordered input-sm w-full"
                      value={bibleStudies} onChange={(e) => setBibleStudies(e.target.value)}
                      min="0"
                    />
                  </div>
                </div>

                {/* Note */}
                <div className="form-control">
                  <input
                    type="text" placeholder="Note (optional)"
                    className="input input-bordered input-sm w-full"
                    value={note} onChange={(e) => setNote(e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <button onClick={handleCustomAdd} className="btn btn-primary flex-1">Add Entry</button>
                  <button onClick={resetForm} className="btn btn-ghost btn-sm">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Today's Entries ──────────────────────────────── */}
        {todaysEntries.length > 0 && (
          <section className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
              <h2 className="text-sm font-medium mb-2">Today</h2>
              <div className="divide-y divide-base-300">{todaysEntries.map(renderEntry)}</div>
            </div>
          </section>
        )}

        {/* ── This Week's Entries ───────────────────────────── */}
        {weeklyEntries.length > 0 && (
          <section className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
              <h2 className="text-sm font-medium mb-2">This Week</h2>
              <div className="divide-y divide-base-300">{weeklyEntries.map(renderEntry)}</div>
            </div>
          </section>
        )}

        {/* ── Empty State ───────────────────────────────────── */}
        {weeklyEntries.length === 0 && (
          <section className="card bg-base-100 shadow-sm">
            <div className="card-body p-8 text-center">
              <Cross className="w-12 h-12 mx-auto text-base-content/20 mb-3" />
              <p className="text-base-content/70">No service entries this week</p>
              <p className="text-sm text-base-content/70 mt-1">Tap a quick add button to log your time</p>
            </div>
          </section>
        )}
      </main>

      {/* ── Monthly Goal Modal ─────────────────────────────── */}
      {showGoalModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h2 className="font-bold text-lg mb-4">Set Monthly Goal</h2>
            <div className="form-control mb-4">
              <label className="label"><span className="label-text">Goal (hours)</span></label>
              <input
                type="number" placeholder="e.g. 20" className="input input-bordered"
                value={goalInput} onChange={(e) => setGoalInput(e.target.value)} min="1" max="744" step="1"
              />
            </div>
            <div className="modal-action">
              <button onClick={() => setShowGoalModal(false)} className="btn btn-ghost">Cancel</button>
              <button onClick={handleSetGoal} className="btn btn-primary">Save Goal</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowGoalModal(false)} />
        </div>
      )}
    </div>
  );
}

export default Service;
