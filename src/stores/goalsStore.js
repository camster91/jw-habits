import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useGoalsStore = create(
  persist(
    (set, get) => ({
      goals: [],
      projects: [],

      // Goal actions
      addGoal: (goal) =>
        set((state) => ({
          goals: [
            ...state.goals,
            {
              id: Date.now().toString(),
              title: goal.title,
              description: goal.description || '',
              category: goal.category || 'spiritual', // spiritual, ministry, personal
              targetDate: goal.targetDate || null,
              progress: 0,
              completed: false,
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      updateGoal: (id, updates) =>
        set((state) => ({
          goals: state.goals.map((goal) =>
            goal.id === id ? { ...goal, ...updates } : goal
          ),
        })),

      deleteGoal: (id) =>
        set((state) => ({
          goals: state.goals.filter((goal) => goal.id !== id),
        })),

      toggleGoalComplete: (id) =>
        set((state) => ({
          goals: state.goals.map((goal) =>
            goal.id === id
              ? { ...goal, completed: !goal.completed, progress: goal.completed ? goal.progress : 100 }
              : goal
          ),
        })),

      // Project actions
      addProject: (project) =>
        set((state) => ({
          projects: [
            ...state.projects,
            {
              id: Date.now().toString(),
              title: project.title,
              description: project.description || '',
              category: project.category || 'personal', // congregation, personal, ministry
              tasks: [],
              completed: false,
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === id ? { ...project, ...updates } : project
          ),
        })),

      deleteProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((project) => project.id !== id),
        })),

      addTaskToProject: (projectId, task) =>
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === projectId
              ? {
                  ...project,
                  tasks: [
                    ...project.tasks,
                    {
                      id: Date.now().toString(),
                      title: task.title,
                      completed: false,
                    },
                  ],
                }
              : project
          ),
        })),

      toggleProjectTask: (projectId, taskId) =>
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === projectId
              ? {
                  ...project,
                  tasks: project.tasks.map((task) =>
                    task.id === taskId ? { ...task, completed: !task.completed } : task
                  ),
                }
              : project
          ),
        })),

      deleteProjectTask: (projectId, taskId) =>
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === projectId
              ? {
                  ...project,
                  tasks: project.tasks.filter((task) => task.id !== taskId),
                }
              : project
          ),
        })),

      // Getters
      getActiveGoals: () => {
        const state = get();
        return state.goals.filter((goal) => !goal.completed);
      },

      getCompletedGoals: () => {
        const state = get();
        return state.goals.filter((goal) => goal.completed);
      },

      getActiveProjects: () => {
        const state = get();
        return state.projects.filter((project) => !project.completed);
      },

      getProjectProgress: (projectId) => {
        const state = get();
        const project = state.projects.find((p) => p.id === projectId);
        if (!project || project.tasks.length === 0) return 0;
        const completedTasks = project.tasks.filter((t) => t.completed).length;
        return Math.round((completedTasks / project.tasks.length) * 100);
      },
    }),
    {
      name: 'jw-goals-storage',
      version: 1,
    }
  )
);

export default useGoalsStore;
