import { useState } from 'react';
import { FolderKanban, Plus, Check, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import useGoalsStore from '../stores/goalsStore';

const CATEGORIES = [
  { id: 'congregation', label: 'Congregation', color: 'badge-primary' },
  { id: 'ministry', label: 'Ministry', color: 'badge-secondary' },
  { id: 'personal', label: 'Personal', color: 'badge-accent' },
];

function ProjectsTab() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProject, setNewProject] = useState({ title: '', description: '', category: 'personal' });
  const [expandedProject, setExpandedProject] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const {
    projects,
    addProject,
    deleteProject,
    addTaskToProject,
    toggleProjectTask,
    deleteProjectTask,
    getProjectProgress,
  } = useGoalsStore();

  const activeProjects = projects.filter((p) => !p.completed);

  const handleAddProject = (e) => {
    e.preventDefault();
    if (!newProject.title.trim()) return;
    addProject(newProject);
    setNewProject({ title: '', description: '', category: 'personal' });
    setShowAddForm(false);
  };

  const handleAddTask = (projectId, e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    addTaskToProject(projectId, { title: newTaskTitle });
    setNewTaskTitle('');
  };

  const toggleExpanded = (projectId) => {
    setExpandedProject(expandedProject === projectId ? null : projectId);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderKanban className="w-5 h-5 text-secondary" />
          <h3 className="font-semibold">Projects</h3>
          <span className="badge badge-ghost badge-sm">{activeProjects.length} active</span>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn btn-secondary btn-sm"
        >
          <Plus className="w-4 h-4" />
          Add Project
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form onSubmit={handleAddProject} className="card bg-base-200 p-4 space-y-3">
          <input
            type="text"
            placeholder="Project name..."
            value={newProject.title}
            onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
            className="input input-bordered input-sm w-full"
            autoFocus
          />
          <textarea
            placeholder="Description (optional)..."
            value={newProject.description}
            onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
            className="textarea textarea-bordered textarea-sm w-full"
            rows={2}
          />
          <div className="flex gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setNewProject({ ...newProject, category: cat.id })}
                className={`badge ${newProject.category === cat.id ? cat.color : 'badge-ghost'}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowAddForm(false)} className="btn btn-ghost btn-sm">
              Cancel
            </button>
            <button type="submit" className="btn btn-secondary btn-sm">
              Create Project
            </button>
          </div>
        </form>
      )}

      {/* Projects List */}
      {activeProjects.length === 0 && !showAddForm ? (
        <div className="text-center py-8 text-base-content/60">
          <FolderKanban className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>No active projects</p>
          <p className="text-sm">Create a project to organize your tasks</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeProjects.map((project) => {
            const categoryInfo = CATEGORIES.find((c) => c.id === project.category);
            const progress = getProjectProgress(project.id);
            const isExpanded = expandedProject === project.id;
            const completedTasks = project.tasks.filter((t) => t.completed).length;

            return (
              <div key={project.id} className="card bg-base-100 shadow-sm">
                <div className="card-body p-3">
                  {/* Project Header */}
                  <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => toggleExpanded(project.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-base-content/60" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-base-content/60" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium">{project.title}</h4>
                        {categoryInfo && (
                          <span className={`badge badge-sm ${categoryInfo.color}`}>
                            {categoryInfo.label}
                          </span>
                        )}
                      </div>
                      {project.tasks.length > 0 && (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-base-300 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                progress === 100 ? 'bg-success' : 'bg-secondary'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-base-content/60">
                            {completedTasks}/{project.tasks.length}
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteProject(project.id);
                      }}
                      className="btn btn-ghost btn-xs text-error"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="mt-3 pl-6 space-y-2">
                      {project.description && (
                        <p className="text-sm text-base-content/60">{project.description}</p>
                      )}

                      {/* Tasks List */}
                      {project.tasks.length > 0 && (
                        <div className="space-y-1">
                          {project.tasks.map((task) => (
                            <div
                              key={task.id}
                              className="flex items-center gap-2 p-2 rounded hover:bg-base-200"
                            >
                              <input
                                type="checkbox"
                                checked={task.completed}
                                onChange={() => toggleProjectTask(project.id, task.id)}
                                className="checkbox checkbox-xs checkbox-secondary"
                              />
                              <span
                                className={`flex-1 text-sm ${
                                  task.completed ? 'line-through text-base-content/50' : ''
                                }`}
                              >
                                {task.title}
                              </span>
                              <button
                                onClick={() => deleteProjectTask(project.id, task.id)}
                                className="btn btn-ghost btn-xs opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="w-3 h-3 text-error" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Task Form */}
                      <form
                        onSubmit={(e) => handleAddTask(project.id, e)}
                        className="flex gap-2"
                      >
                        <input
                          type="text"
                          placeholder="Add a task..."
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          className="input input-bordered input-xs flex-1"
                        />
                        <button type="submit" className="btn btn-ghost btn-xs">
                          <Plus className="w-3 h-3" />
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ProjectsTab;
