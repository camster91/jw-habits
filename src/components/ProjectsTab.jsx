import { useState } from 'react';
import { FolderKanban, Plus, Trash2, ChevronDown, ChevronRight, Star, Lightbulb, Users, BookOpen, Mic } from 'lucide-react';
import useGoalsStore from '../stores/goalsStore';
import useGamificationStore from '../stores/gamificationStore';
import { haptics } from '../utils/native';

const CATEGORIES = [
  { id: 'congregation', label: 'Congregation', color: 'badge-primary', icon: Users },
  { id: 'ministry', label: 'Ministry', color: 'badge-secondary', icon: BookOpen },
  { id: 'personal', label: 'Personal', color: 'badge-accent', icon: Mic },
];

// Suggested projects based on JW.org spiritual activities
const SUGGESTED_PROJECTS = [
  {
    title: 'Complete "Enjoy Life Forever!" Course',
    description: 'Work through the interactive Bible study course systematically',
    category: 'ministry',
    icon: '📚',
    tasks: [
      'Introduction and Part 1: What God Has Done for Us',
      'Part 2: Enjoy a Clean Conscience',
      'Part 3: Make Wise Decisions',
      'Part 4: Learn More About Jehovah',
      'Part 5: What Happens at Our Meetings?',
    ],
  },
  {
    title: 'Prepare for Baptism',
    description: 'Study and prepare for dedication to Jehovah',
    category: 'personal',
    icon: '💧',
    tasks: [
      'Complete baptism questions with an elder',
      'Study the "Enjoy Life Forever!" book',
      'Attend all meetings consistently',
      'Share in the ministry regularly',
      'Deepen personal prayer and study habits',
    ],
  },
  {
    title: 'Improve Public Speaking Skills',
    description: 'Apply counsel from the Theocratic Ministry School Guidebook',
    category: 'personal',
    icon: '🎤',
    tasks: [
      'Work on accuracy and fluent delivery',
      'Practice effective use of voice',
      'Develop natural gestures and poise',
      'Improve eye contact and audience connection',
      'Apply points from Watchtower study conductor guidelines',
    ],
  },
  {
    title: 'Family Worship Program',
    description: 'Establish a consistent weekly family worship routine',
    category: 'personal',
    icon: '👨‍👩‍👧',
    tasks: [
      'Choose a regular day and time',
      'Plan first 4 weeks of topics',
      'Gather materials (Bible, publications)',
      'Include Bible reading and discussion',
      'Add interactive activities for children',
    ],
  },
  {
    title: 'Learn a Language for Ministry',
    description: 'Study a new language to reach more people',
    category: 'ministry',
    icon: '🌍',
    tasks: [
      'Choose target language and group',
      'Use JW Language app daily',
      'Learn basic greetings and introductions',
      'Practice with congregation members',
      'Attend foreign language meetings/groups',
    ],
  },
  {
    title: 'Convention/Assembly Preparation',
    description: 'Get ready for the upcoming spiritual event',
    category: 'congregation',
    icon: '🏟️',
    tasks: [
      'Review program schedule',
      'Prepare clothing and supplies',
      'Study Bible verses in advance',
      'Arrange transportation and accommodations',
      'Plan ministry during convention',
    ],
  },
  {
    title: 'Personal Bible Study Schedule',
    description: 'Create a structured approach to Bible reading',
    category: 'personal',
    icon: '📖',
    tasks: [
      'Choose a Bible reading plan',
      'Set daily reading time',
      'Prepare for weekly Bible reading portion',
      'Research background information',
      'Keep notes of personal study insights',
    ],
  },
  {
    title: 'Territory Coverage Campaign',
    description: 'Help your congregation cover territory effectively',
    category: 'congregation',
    icon: '🗺️',
    tasks: [
      'Volunteer for territory servant assistance',
      'Learn about not-at-homes',
      'Plan letter writing or phone witnessing',
      'Participate in group witnessing arrangements',
      'Report progress to territory servant',
    ],
  },
];

function ProjectsTab() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
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
  const { recordProjectCompleted } = useGamificationStore();

  const activeProjects = projects.filter((p) => !p.completed);

  const handleAddProject = (e) => {
    e.preventDefault();
    if (!newProject.title.trim()) return;
    haptics.success();
    addProject(newProject);
    setNewProject({ title: '', description: '', category: 'personal' });
    setShowAddForm(false);
  };

  const handleAddSuggested = (suggested) => {
    haptics.success();
    const project = addProject({
      title: suggested.title,
      description: suggested.description,
      category: suggested.category,
    });
    // Add pre-defined tasks to the project
    if (suggested.tasks && project) {
      suggested.tasks.forEach((taskTitle) => {
        addTaskToProject(project.id, { title: taskTitle });
      });
    }
    setShowSuggestions(false);
  };

  const handleAddTask = (projectId, e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    haptics.light();
    addTaskToProject(projectId, { title: newTaskTitle });
    setNewTaskTitle('');
  };

  const toggleExpanded = (projectId) => {
    haptics.selection();
    setExpandedProject(expandedProject === projectId ? null : projectId);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl">
            <FolderKanban className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold">Projects</h3>
            <p className="text-xs text-base-content/50">{activeProjects.length} active</p>
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
            <Lightbulb className="w-4 h-4" />
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
        <div className="card bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
          <div className="card-body p-4">
            <h4 className="font-semibold text-purple-800 flex items-center gap-2">
              <Star className="w-4 h-4" />
              Project Ideas
            </h4>
            <div className="grid gap-2 mt-2">
              {SUGGESTED_PROJECTS.map((suggested, index) => {
                const isAlreadyAdded = projects.some(p => p.title === suggested.title);
                return (
                  <button
                    key={index}
                    onClick={() => !isAlreadyAdded && handleAddSuggested(suggested)}
                    disabled={isAlreadyAdded}
                    className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                      isAlreadyAdded
                        ? 'bg-base-200 opacity-50 cursor-not-allowed'
                        : 'bg-white hover:bg-purple-100 active:scale-[0.98]'
                    }`}
                  >
                    <span className="text-2xl">{suggested.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{suggested.title}</p>
                      <p className="text-xs text-base-content/60 truncate">{suggested.description}</p>
                      {suggested.tasks && (
                        <p className="text-xs text-purple-600 mt-1">{suggested.tasks.length} tasks included</p>
                      )}
                    </div>
                    {isAlreadyAdded ? (
                      <span className="text-xs text-success">Added</span>
                    ) : (
                      <Plus className="w-4 h-4 text-purple-600" />
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
        <form onSubmit={handleAddProject} className="card bg-base-100 shadow-md p-4 space-y-3">
          <input
            type="text"
            placeholder="Project name..."
            value={newProject.title}
            onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
            className="input input-bordered w-full"
            autoFocus
          />
          <textarea
            placeholder="Description (optional)..."
            value={newProject.description}
            onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
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
                  onClick={() => setNewProject({ ...newProject, category: cat.id })}
                  className={`badge gap-1 ${newProject.category === cat.id ? cat.color : 'badge-ghost'}`}
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
              Create Project
            </button>
          </div>
        </form>
      )}

      {/* Projects List */}
      {activeProjects.length === 0 && !showAddForm && !showSuggestions ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
            <FolderKanban className="w-8 h-8 text-purple-500" />
          </div>
          <p className="font-medium text-base-content/70">No projects yet</p>
          <p className="text-sm text-base-content/50 mt-1">Start a project to organize tasks</p>
          <button
            onClick={() => setShowSuggestions(true)}
            className="btn btn-primary btn-sm mt-4"
          >
            <Lightbulb className="w-4 h-4" />
            Browse Ideas
          </button>
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
                        haptics.light();
                        deleteProject(project.id);
                      }}
                      className="btn btn-ghost btn-xs text-base-content/40 hover:text-error"
                    >
                      <Trash2 className="w-4 h-4" />
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
                                onChange={() => {
                                  haptics.light();
                                  toggleProjectTask(project.id, task.id);
                                  if (!task.completed) {
                                    const otherTasks = project.tasks.filter(t => t.id !== task.id);
                                    const allOthersDone = otherTasks.every(t => t.completed);
                                    if (allOthersDone) {
                                      recordProjectCompleted();
                                    }
                                  }
                                }}
                                className="checkbox checkbox-sm checkbox-success"
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
