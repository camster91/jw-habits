import { useState } from 'react';
import { Target, Plus, Check, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import useGoalsStore from '../stores/goalsStore';

const CATEGORIES = [
  { id: 'spiritual', label: 'Spiritual', color: 'badge-primary' },
  { id: 'ministry', label: 'Ministry', color: 'badge-secondary' },
  { id: 'personal', label: 'Personal', color: 'badge-accent' },
];

function GoalsTab() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', description: '', category: 'spiritual' });
  const [showCompleted, setShowCompleted] = useState(false);

  const { goals, addGoal, toggleGoalComplete, deleteGoal, updateGoal } = useGoalsStore();

  const activeGoals = goals.filter((g) => !g.completed);
  const completedGoals = goals.filter((g) => g.completed);

  const handleAddGoal = (e) => {
    e.preventDefault();
    if (!newGoal.title.trim()) return;
    addGoal(newGoal);
    setNewGoal({ title: '', description: '', category: 'spiritual' });
    setShowAddForm(false);
  };

  const handleProgressChange = (id, progress) => {
    updateGoal(id, { progress: parseInt(progress) });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Goals</h3>
          <span className="badge badge-ghost badge-sm">{activeGoals.length} active</span>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn btn-primary btn-sm"
        >
          <Plus className="w-4 h-4" />
          Add Goal
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form onSubmit={handleAddGoal} className="card bg-base-200 p-4 space-y-3">
          <input
            type="text"
            placeholder="Goal title..."
            value={newGoal.title}
            onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
            className="input input-bordered input-sm w-full"
            autoFocus
          />
          <textarea
            placeholder="Description (optional)..."
            value={newGoal.description}
            onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
            className="textarea textarea-bordered textarea-sm w-full"
            rows={2}
          />
          <div className="flex gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setNewGoal({ ...newGoal, category: cat.id })}
                className={`badge ${newGoal.category === cat.id ? cat.color : 'badge-ghost'}`}
              >
                {cat.label}
              </button>
            ))}
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
      {activeGoals.length === 0 && !showAddForm ? (
        <div className="text-center py-8 text-base-content/60">
          <Target className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>No active goals</p>
          <p className="text-sm">Add a goal to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeGoals.map((goal) => {
            const categoryInfo = CATEGORIES.find((c) => c.id === goal.category);
            return (
              <div key={goal.id} className="card bg-base-100 shadow-sm">
                <div className="card-body p-3">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleGoalComplete(goal.id)}
                      className="mt-1 flex-shrink-0"
                    >
                      <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center hover:bg-primary/10">
                        {goal.progress === 100 && <Check className="w-3 h-3 text-primary" />}
                      </div>
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium">{goal.title}</h4>
                        {categoryInfo && (
                          <span className={`badge badge-sm ${categoryInfo.color}`}>
                            {categoryInfo.label}
                          </span>
                        )}
                      </div>
                      {goal.description && (
                        <p className="text-sm text-base-content/60 mt-1">{goal.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="10"
                          value={goal.progress}
                          onChange={(e) => handleProgressChange(goal.id, e.target.value)}
                          className="range range-xs range-primary flex-1"
                        />
                        <span className="text-xs w-8">{goal.progress}%</span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteGoal(goal.id)}
                      className="btn btn-ghost btn-xs text-error"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completed Goals Toggle */}
      {completedGoals.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="btn btn-ghost btn-sm w-full justify-between"
          >
            <span>Completed ({completedGoals.length})</span>
            {showCompleted ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showCompleted && (
            <div className="space-y-2 mt-2">
              {completedGoals.map((goal) => (
                <div key={goal.id} className="card bg-base-200 opacity-60">
                  <div className="card-body p-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleGoalComplete(goal.id)}>
                        <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center">
                          <Check className="w-3 h-3 text-success-content" />
                        </div>
                      </button>
                      <span className="line-through flex-1">{goal.title}</span>
                      <button
                        onClick={() => deleteGoal(goal.id)}
                        className="btn btn-ghost btn-xs text-error"
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
