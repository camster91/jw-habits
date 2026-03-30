import { useState } from 'react';
import { Target, Plus, Check, Trash2, ChevronDown, ChevronUp, Star, BookOpen, Users, Heart, Clock } from 'lucide-react';
import useGoalsStore from '../stores/goalsStore';
import useGamificationStore from '../stores/gamificationStore';
import { haptics } from '../utils/native';

const CATEGORIES = [
  { id: 'spiritual', label: 'Spiritual', color: 'badge-primary', icon: BookOpen },
  { id: 'ministry', label: 'Ministry', color: 'badge-secondary', icon: Users },
  { id: 'personal', label: 'Personal', color: 'badge-accent', icon: Heart },
];

// Suggested goals based on JW.org spiritual activities
const SUGGESTED_GOALS = [
  {
    title: 'Read the Bible daily for 30 days',
    description: 'Build a habit of daily Bible reading using the schedule on jw.org',
    category: 'spiritual',
    icon: '📖',
  },
  {
    title: 'Complete "Enjoy Life Forever!" book',
    description: 'Work through the interactive Bible course',
    category: 'spiritual',
    icon: '📚',
  },
  {
    title: 'Attend all meetings for a month',
    description: 'Midweek and weekend meetings - in person or online',
    category: 'spiritual',
    icon: '🏛️',
  },
  {
    title: 'Start a Bible study',
    description: 'Help someone learn about the Bible',
    category: 'ministry',
    icon: '👥',
  },
  {
    title: 'Auxiliary pioneer for one month',
    description: 'Set aside extra time for the ministry',
    category: 'ministry',
    icon: '🚶',
  },
  {
    title: 'Learn a new theocratic skill',
    description: 'Improve at public speaking, teaching, or another skill',
    category: 'personal',
    icon: '🎯',
  },
  {
    title: 'Memorize 10 key scriptures',
    description: 'Build your scripture arsenal for teaching',
    category: 'spiritual',
    icon: '💭',
  },
  {
    title: 'Family worship every week',
    description: 'Consistent weekly family Bible study',
    category: 'personal',
    icon: '👨‍👩‍👧',
  },
];

function GoalsTab() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', description: '', category: 'spiritual' });
  const [showCompleted, setShowCompleted] = useState(false);

  const { goals, addGoal, toggleGoalComplete, deleteGoal, updateGoal } = useGoalsStore();
  const { recordGoalCompleted } = useGamificationStore();

  const activeGoals = goals.filter((g) => !g.completed);
  const completedGoals = goals.filter((g) => g.completed);

  const handleAddGoal = (e) => {
    e.preventDefault();
    if (!newGoal.title.trim()) return;
    haptics.success();
    addGoal(newGoal);
    setNewGoal({ title: '', description: '', category: 'spiritual' });
    setShowAddForm(false);
  };

  const handleAddSuggested = (suggested) => {
    haptics.success();
    addGoal({
      title: suggested.title,
      description: suggested.description,
      category: suggested.category,
    });
    setShowSuggestions(false);
  };

  const handleProgressChange = (id, progress) => {
    haptics.selection();
    updateGoal(id, { progress: parseInt(progress) });
    if (parseInt(progress) === 100) {
      haptics.success();
    }
  };

  const handleToggleComplete = (id) => {
    haptics.medium();
    const goal = goals.find(g => g.id === id);
    toggleGoalComplete(id);
    if (goal && !goal.completed) {
      recordGoalCompleted();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold">Goals</h3>
            <p className="text-xs text-base-content/50">{activeGoals.length} active</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              haptics.light();
              setShowSuggestions(!showSuggestions);
              setShowAddForm(false);
            }}
            className="btn btn-ghost btn-sm"
          >
            <Star className="w-4 h-4" />
            Ideas
          </button>
          <button
            onClick={() => {
              haptics.light();
              setShowAddForm(!showAddForm);
              setShowSuggestions(false);
            }}
            className="btn btn-primary btn-sm"
          >
            <Plus className="w-4 h-4" />
            New
          </button>
        </div>
      </div>

      {/* Suggestions Panel */}
      {showSuggestions && (
        <div className="card bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
          <div className="card-body p-4">
            <h4 className="font-semibold text-amber-800 flex items-center gap-2">
              <Star className="w-4 h-4" />
              Goal Ideas
            </h4>
            <div className="grid gap-2 mt-2">
              {SUGGESTED_GOALS.map((suggested, index) => {
                const isAlreadyAdded = goals.some(g => g.title === suggested.title);
                return (
                  <button
                    key={index}
                    onClick={() => !isAlreadyAdded && handleAddSuggested(suggested)}
                    disabled={isAlreadyAdded}
                    className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                      isAlreadyAdded
                        ? 'bg-base-200 opacity-50 cursor-not-allowed'
                        : 'bg-white hover:bg-amber-100 active:scale-[0.98]'
                    }`}
                  >
                    <span className="text-2xl">{suggested.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{suggested.title}</p>
                      <p className="text-xs text-base-content/60 truncate">{suggested.description}</p>
                    </div>
                    {isAlreadyAdded ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <Plus className="w-4 h-4 text-amber-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <form onSubmit={handleAddGoal} className="card bg-base-100 shadow-md p-4 space-y-3">
          <input
            type="text"
            placeholder="What's your goal?"
            value={newGoal.title}
            onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
            className="input input-bordered w-full"
            autoFocus
          />
          <textarea
            placeholder="Add details (optional)..."
            value={newGoal.description}
            onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
            className="textarea textarea-bordered w-full"
            rows={2}
          />
          <div className="flex gap-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setNewGoal({ ...newGoal, category: cat.id })}
                  className={`badge gap-1 ${newGoal.category === cat.id ? cat.color : 'badge-ghost'}`}
                >
                  <Icon className="w-3 h-3" />
                  {cat.label}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowAddForm(false)} className="btn btn-ghost btn-sm">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              Add Goal
            </button>
          </div>
        </form>
      )}

      {/* Active Goals */}
      {activeGoals.length === 0 && !showAddForm && !showSuggestions ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
            <Target className="w-8 h-8 text-amber-500" />
          </div>
          <p className="font-medium text-base-content/70">No goals yet</p>
          <p className="text-sm text-base-content/50 mt-1">Set a spiritual goal to work toward</p>
          <button
            onClick={() => setShowSuggestions(true)}
            className="btn btn-primary btn-sm mt-4"
          >
            <Star className="w-4 h-4" />
            Browse Ideas
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {activeGoals.map((goal) => {
            const categoryInfo = CATEGORIES.find((c) => c.id === goal.category);
            const Icon = categoryInfo?.icon || Target;
            return (
              <div key={goal.id} className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="card-body p-4">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleToggleComplete(goal.id)}
                      className="mt-0.5 flex-shrink-0"
                    >
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        goal.progress === 100
                          ? 'border-success bg-success'
                          : 'border-base-300 hover:border-primary'
                      }`}>
                        {goal.progress === 100 && <Check className="w-4 h-4 text-success-content" />}
                      </div>
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold">{goal.title}</h4>
                        {categoryInfo && (
                          <span className={`badge badge-sm gap-1 ${categoryInfo.color}`}>
                            <Icon className="w-3 h-3" />
                            {categoryInfo.label}
                          </span>
                        )}
                      </div>
                      {goal.description && (
                        <p className="text-sm text-base-content/60 mt-1">{goal.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex-1 h-2 bg-base-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all rounded-full ${
                              goal.progress === 100 ? 'bg-success' : 'bg-primary'
                            }`}
                            style={{ width: `${goal.progress}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">{goal.progress}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="10"
                        value={goal.progress}
                        onChange={(e) => handleProgressChange(goal.id, e.target.value)}
                        className="range range-xs range-primary w-full mt-1 opacity-0 h-4 cursor-pointer"
                        style={{ marginTop: '-0.75rem' }}
                      />
                    </div>
                    <button
                      onClick={() => {
                        haptics.light();
                        deleteGoal(goal.id);
                      }}
                      className="btn btn-ghost btn-xs text-base-content/40 hover:text-error"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="pt-2">
          <button
            onClick={() => {
              haptics.light();
              setShowCompleted(!showCompleted);
            }}
            className="btn btn-ghost btn-sm w-full justify-between text-base-content/60"
          >
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              Completed ({completedGoals.length})
            </span>
            {showCompleted ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showCompleted && (
            <div className="space-y-2 mt-2">
              {completedGoals.map((goal) => (
                <div key={goal.id} className="card bg-base-200/50">
                  <div className="card-body p-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => handleToggleComplete(goal.id)}>
                        <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center">
                          <Check className="w-3 h-3 text-success-content" />
                        </div>
                      </button>
                      <span className="line-through text-base-content/50 flex-1">{goal.title}</span>
                      <button
                        onClick={() => deleteGoal(goal.id)}
                        className="btn btn-ghost btn-xs text-base-content/30"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GoalsTab;
