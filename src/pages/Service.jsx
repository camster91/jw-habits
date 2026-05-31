import { useState } from 'react';
import { Cross, Plus, Trash2, Calendar, Clock, Target, ChevronDown } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import useServiceStore from '../stores/serviceStore';
import { haptics } from '../utils/native';
import { useToast } from '../components/Toast';

const ENTRY_TYPES = [
  { id: 'field-service', label: 'Field Service', color: 'badge-primary' },
  { id: 'return-visit', label: 'Return Visit', color: 'badge-secondary' },
  { id: 'bible-study', label: 'Bible Study', color: 'badge-accent' },
  { id: 'door-to-door', label: 'Door-to-Door', color: 'badge-info' },
  { id: 'other', label: 'Other', color: 'badge-neutral' },
];

const QUICK_ADD_HOURS = [1, 2, 3];

function Service() {
  const toast = useToast();
  const [hours, setHours] = useState('');
  const [note, setNote] = useState('');
  const [customHours, setCustomHours] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [selectedType, setSelectedType] = useState('field-service');

  const {
    addEntry,
    removeEntry,
    setMonthlyGoal,
    getTodaysEntries,
    getWeeklyEntries,
    getWeeklyTotal,
    getMonthlyTotal,
    monthlyGoalHours,
  } = useServiceStore();

  const todaysEntries = getTodaysEntries();
  const weeklyEntries = getWeeklyEntries();
  const weeklyTotal = getWeeklyTotal();
  const monthlyTotal = getMonthlyTotal();
  const monthProgress = monthlyGoalHours > 0 ? Math.min((monthlyTotal / monthlyGoalHours) * 100, 100) : 0;

  const handleQuickAdd = (h) => {
    haptics.light();
    addEntry({
      type: selectedType,
      hours: h,
      date: new Date().toISOString().split('T')[0],
      note: '',
    });
    toast('success', `Added ${h}h entry`);
  };

  const handleCustomAdd = () => {
    const h = parseFloat(customHours);
    if (!h || h <= 0) {
      toast('error', 'Please enter valid hours');
      return;
    }
    haptics.light();
    addEntry({
      type: selectedType,
      hours: h,
      date: new Date().toISOString().split('T')[0],
      note: note.trim(),
    });
    setCustomHours('');
    setNote('');
    setShowCustom(false);
    toast('success', `Added ${h}h entry`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const h = parseFloat(hours);
    if (!h || h <= 0) {
      toast('error', 'Please enter valid hours');
      return;
    }
    haptics.success();
    addEntry({
      type: selectedType,
      hours: h,
      date: new Date().toISOString().split('T')[0],
      note: note.trim(),
    });
    setHours('');
    setNote('');
    toast('success', `Added ${h}h entry`);
  };

  const handleDelete = (id) => {
    haptics.light();
    removeEntry(id);
    toast('info', 'Entry removed');
  };

  const handleSetGoal = () => {
    const goal = parseFloat(goalInput);
    if (!goal || goal <= 0) {
      toast('error', 'Please enter a valid goal');
      return;
    }
    haptics.success();
    setMonthlyGoal(goal);
    setGoalInput('');
    setShowGoalModal(false);
    toast('success', `Monthly goal set to ${goal}h`);
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

  const getTypeLabel = (typeId) => {
    return ENTRY_TYPES.find((t) => t.id === typeId)?.label || typeId;
  };

  const getTypeColor = (typeId) => {
    return ENTRY_TYPES.find((t) => t.id === typeId)?.color || 'badge-neutral';
  };

  const renderEntry = (entry) => (
    <div key={entry.id} className="flex items-center justify-between py-3 px-1">
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <span className="text-sm font-medium">{formatDate(entry.date)}</span>
          <span className={`badge badge-sm ${getTypeColor(entry.type)} mt-1`}>
            {getTypeLabel(entry.type)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
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
        {/* Weekly Summary Card */}
        <section className="card bg-base-100 shadow-sm">
          <div className="card-body p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <span className="font-semibold">This Week</span>
              </div>
              <button
                onClick={() => {
                  haptics.light();
                  setShowGoalModal(true);
                  setGoalInput(String(monthlyGoalHours));
                }}
                className="btn btn-ghost btn-sm gap-1"
              >
                <Target className="w-4 h-4" />
                <span className="text-xs">{monthlyGoalHours}h goal</span>
              </button>
            </div>
            <div className="text-4xl font-bold text-primary">{weeklyTotal}h</div>
            <p className="text-sm text-base-content/60 mt-1">
              {todaysEntries.length > 0
                ? `${todaysEntries.reduce((s, e) => s + e.hours, 0)}h today`
                : 'No entries today'}
            </p>
          </div>
        </section>

        {/* Monthly Goal Progress */}
        <section className="card bg-base-100 shadow-sm">
          <div className="card-body p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Monthly Goal</span>
              <span className="text-sm text-base-content/60">
                {monthlyTotal}h / {monthlyGoalHours}h
              </span>
            </div>
            <progress
              className={`progress ${monthProgress >= 100 ? 'progress-success' : 'progress-primary'} w-full`}
              value={monthProgress}
              max="100"
            />
            <p className="text-xs text-base-content/50 mt-1">
              {monthProgress >= 100
                ? 'Goal reached! 🎉'
                : `${Math.round(monthProgress)}% of monthly goal`}
            </p>
          </div>
        </section>

        {/* Entry Type Selector */}
        <section className="card bg-base-100 shadow-sm">
          <div className="card-body p-4">
            <h3 className="text-sm font-medium mb-2">Entry Type</h3>
            <div className="flex flex-wrap gap-2">
              {ENTRY_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    haptics.light();
                    setSelectedType(type.id);
                  }}
                  className={`btn btn-sm ${
                    selectedType === type.id ? 'btn-primary' : 'btn-ghost'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Quick Add Buttons */}
        <section className="card bg-base-100 shadow-sm">
          <div className="card-body p-4">
            <h3 className="text-sm font-medium mb-3">Quick Add</h3>
            <div className="flex gap-2">
              {QUICK_ADD_HOURS.map((h) => (
                <button
                  key={h}
                  onClick={() => handleQuickAdd(h)}
                  className="btn btn-primary flex-1 gap-1"
                >
                  <Plus className="w-4 h-4" />
                  {h}h
                </button>
              ))}
              <button
                onClick={() => {
                  haptics.light();
                  setShowCustom(!showCustom);
                }}
                className="btn btn-ghost flex-1 gap-1"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${showCustom ? 'rotate-180' : ''}`} />
                Custom
              </button>
            </div>

            {/* Custom Hours Input */}
            {showCustom && (
              <div className="mt-4 space-y-3">
                <div className="form-control">
                  <input
                    type="number"
                    placeholder="Hours (e.g. 1.5)"
                    className="input input-bordered w-full"
                    value={customHours}
                    onChange={(e) => setCustomHours(e.target.value)}
                    min="0"
                    step="0.5"
                  />
                </div>
                <div className="form-control">
                  <input
                    type="text"
                    placeholder="Note (optional)"
                    className="input input-bordered w-full"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
                <button onClick={handleCustomAdd} className="btn btn-primary w-full">
                  Add Entry
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Today's Entries */}
        {todaysEntries.length > 0 && (
          <section className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
              <h3 className="text-sm font-medium mb-2">Today</h3>
              <div className="divide-y divide-base-300">
                {todaysEntries.map(renderEntry)}
              </div>
            </div>
          </section>
        )}

        {/* This Week's Entries */}
        {weeklyEntries.length > 0 && (
          <section className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
              <h3 className="text-sm font-medium mb-2">This Week</h3>
              <div className="divide-y divide-base-300">
                {weeklyEntries.map(renderEntry)}
              </div>
            </div>
          </section>
        )}

        {/* Empty State */}
        {weeklyEntries.length === 0 && (
          <section className="card bg-base-100 shadow-sm">
            <div className="card-body p-8 text-center">
              <Cross className="w-12 h-12 mx-auto text-base-content/20 mb-3" />
              <p className="text-base-content/60">No service entries this week</p>
              <p className="text-sm text-base-content/40 mt-1">
                Tap a quick add button to log your time
              </p>
            </div>
          </section>
        )}
      </main>

      {/* Monthly Goal Modal */}
      {showGoalModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Set Monthly Goal</h3>
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Goal (hours)</span>
              </label>
              <input
                type="number"
                placeholder="e.g. 20"
                className="input input-bordered"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                min="1"
                step="1"
              />
            </div>
            <div className="modal-action">
              <button
                onClick={() => setShowGoalModal(false)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button onClick={handleSetGoal} className="btn btn-primary">
                Save Goal
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowGoalModal(false)} />
        </div>
      )}
    </div>
  );
}

export default Service;
