import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';

// Use fake timers to control Date.now() for unique IDs
vi.useFakeTimers();

// Import the store
const { default: useGoalsStore } = await import('./goalsStore.js');

describe('goalsStore', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-04-12T12:00:00'));
    act(() => {
      useGoalsStore.setState({ goals: [], projects: [] });
    });
  });

  describe('addGoal', () => {
    it('should create a goal with correct defaults', () => {
      act(() => {
        useGoalsStore.getState().addGoal({ title: 'Read Bible daily' });
      });

      const goals = useGoalsStore.getState().goals;
      expect(goals.length).toBe(1);
      const goal = goals[0];
      expect(goal.title).toBe('Read Bible daily');
      expect(goal.description).toBe('');
      expect(goal.category).toBe('spiritual');
      expect(goal.targetDate).toBeNull();
      expect(goal.progress).toBe(0);
      expect(goal.completed).toBe(false);
      expect(goal.id).toBeDefined();
      expect(goal.createdAt).toBeDefined();
    });

    it('should accept optional fields', () => {
      act(() => {
        useGoalsStore.getState().addGoal({
          title: 'Preach more',
          description: 'Increase ministry hours',
          category: 'ministry',
          targetDate: '2026-12-31',
        });
      });

      const goal = useGoalsStore.getState().goals[0];
      expect(goal.description).toBe('Increase ministry hours');
      expect(goal.category).toBe('ministry');
      expect(goal.targetDate).toBe('2026-12-31');
    });
  });

  describe('updateGoal', () => {
    it('should update specified fields', () => {
      act(() => {
        useGoalsStore.getState().addGoal({ title: 'Original' });
      });
      const goalId = useGoalsStore.getState().goals[0].id;

      act(() => {
        useGoalsStore.getState().updateGoal(goalId, { title: 'Updated', progress: 50 });
      });

      const goal = useGoalsStore.getState().goals[0];
      expect(goal.title).toBe('Updated');
      expect(goal.progress).toBe(50);
    });

    it('should not affect other goals', () => {
      act(() => {
        useGoalsStore.getState().addGoal({ title: 'Goal 1' });
      });
      // Advance time to get a different Date.now() for the second goal's ID
      vi.advanceTimersByTime(10);
      act(() => {
        useGoalsStore.getState().addGoal({ title: 'Goal 2' });
      });

      const goalId = useGoalsStore.getState().goals[0].id;
      act(() => {
        useGoalsStore.getState().updateGoal(goalId, { title: 'Updated Goal 1' });
      });

      const goals = useGoalsStore.getState().goals;
      expect(goals[0].title).toBe('Updated Goal 1');
      expect(goals[1].title).toBe('Goal 2');
    });
  });

  describe('deleteGoal', () => {
    it('should remove a goal', () => {
      act(() => {
        useGoalsStore.getState().addGoal({ title: 'To delete' });
      });
      const goalId = useGoalsStore.getState().goals[0].id;

      act(() => {
        useGoalsStore.getState().deleteGoal(goalId);
      });

      expect(useGoalsStore.getState().goals.length).toBe(0);
    });

    it('should not remove other goals', () => {
      act(() => {
        useGoalsStore.getState().addGoal({ title: 'Keep' });
      });
      vi.advanceTimersByTime(10);
      act(() => {
        useGoalsStore.getState().addGoal({ title: 'Remove' });
      });

      const goalId = useGoalsStore.getState().goals[1].id;
      act(() => {
        useGoalsStore.getState().deleteGoal(goalId);
      });

      const goals = useGoalsStore.getState().goals;
      expect(goals.length).toBe(1);
      expect(goals[0].title).toBe('Keep');
    });
  });

  describe('toggleGoalComplete', () => {
    it('should toggle completed status from false to true and set progress to 100', () => {
      act(() => {
        useGoalsStore.getState().addGoal({ title: 'My goal' });
      });
      const goalId = useGoalsStore.getState().goals[0].id;

      act(() => {
        useGoalsStore.getState().toggleGoalComplete(goalId);
      });

      const goal = useGoalsStore.getState().goals[0];
      expect(goal.completed).toBe(true);
      expect(goal.progress).toBe(100);
    });

    it('should toggle completed status from true back to false preserving progress', () => {
      act(() => {
        useGoalsStore.getState().addGoal({ title: 'My goal' });
      });
      const goalId = useGoalsStore.getState().goals[0].id;

      act(() => {
        useGoalsStore.getState().toggleGoalComplete(goalId); // mark complete
        useGoalsStore.getState().toggleGoalComplete(goalId); // unmark
      });

      const goal = useGoalsStore.getState().goals[0];
      expect(goal.completed).toBe(false);
      // When uncompleting, progress stays at 100 (it was set to 100 on first toggle)
      expect(goal.progress).toBe(100);
    });
  });

  describe('addProject', () => {
    it('should create a project with tasks', () => {
      act(() => {
        useGoalsStore.getState().addProject({ title: 'New Project' });
      });

      const projects = useGoalsStore.getState().projects;
      expect(projects.length).toBe(1);
      const project = projects[0];
      expect(project.title).toBe('New Project');
      expect(project.description).toBe('');
      expect(project.category).toBe('personal');
      expect(project.tasks).toEqual([]);
      expect(project.completed).toBe(false);
      expect(project.id).toBeDefined();
      expect(project.createdAt).toBeDefined();
    });

    it('should accept optional fields', () => {
      act(() => {
        useGoalsStore.getState().addProject({
          title: 'Congregation Project',
          description: 'A project for the congregation',
          category: 'congregation',
        });
      });

      const project = useGoalsStore.getState().projects[0];
      expect(project.description).toBe('A project for the congregation');
      expect(project.category).toBe('congregation');
    });
  });

  describe('addTaskToProject', () => {
    it('should add a task to a project', () => {
      act(() => {
        useGoalsStore.getState().addProject({ title: 'My Project' });
      });
      const projectId = useGoalsStore.getState().projects[0].id;

      act(() => {
        useGoalsStore.getState().addTaskToProject(projectId, { title: 'Task 1' });
      });

      const project = useGoalsStore.getState().projects[0];
      expect(project.tasks.length).toBe(1);
      expect(project.tasks[0].title).toBe('Task 1');
      expect(project.tasks[0].completed).toBe(false);
      expect(project.tasks[0].id).toBeDefined();
    });

    it('should add multiple tasks to a project', () => {
      act(() => {
        useGoalsStore.getState().addProject({ title: 'My Project' });
      });
      const projectId = useGoalsStore.getState().projects[0].id;

      act(() => {
        useGoalsStore.getState().addTaskToProject(projectId, { title: 'Task 1' });
        vi.advanceTimersByTime(10);
        useGoalsStore.getState().addTaskToProject(projectId, { title: 'Task 2' });
      });

      const project = useGoalsStore.getState().projects[0];
      expect(project.tasks.length).toBe(2);
    });
  });

  describe('toggleProjectTask', () => {
    it('should toggle a task completed status', () => {
      act(() => {
        useGoalsStore.getState().addProject({ title: 'My Project' });
      });
      const projectId = useGoalsStore.getState().projects[0].id;

      act(() => {
        useGoalsStore.getState().addTaskToProject(projectId, { title: 'Task 1' });
      });
      const taskId = useGoalsStore.getState().projects[0].tasks[0].id;

      act(() => {
        useGoalsStore.getState().toggleProjectTask(projectId, taskId);
      });

      const task = useGoalsStore.getState().projects[0].tasks[0];
      expect(task.completed).toBe(true);
    });

    it('should toggle a task back to incomplete', () => {
      act(() => {
        useGoalsStore.getState().addProject({ title: 'My Project' });
      });
      const projectId = useGoalsStore.getState().projects[0].id;

      act(() => {
        useGoalsStore.getState().addTaskToProject(projectId, { title: 'Task 1' });
      });
      const taskId = useGoalsStore.getState().projects[0].tasks[0].id;

      act(() => {
        useGoalsStore.getState().toggleProjectTask(projectId, taskId);
        useGoalsStore.getState().toggleProjectTask(projectId, taskId);
      });

      const task = useGoalsStore.getState().projects[0].tasks[0];
      expect(task.completed).toBe(false);
    });
  });

  describe('deleteProjectTask', () => {
    it('should remove a task from a project', () => {
      act(() => {
        useGoalsStore.getState().addProject({ title: 'My Project' });
      });
      const projectId = useGoalsStore.getState().projects[0].id;

      act(() => {
        useGoalsStore.getState().addTaskToProject(projectId, { title: 'Task 1' });
        vi.advanceTimersByTime(10);
        useGoalsStore.getState().addTaskToProject(projectId, { title: 'Task 2' });
      });
      const taskId = useGoalsStore.getState().projects[0].tasks[0].id;

      act(() => {
        useGoalsStore.getState().deleteProjectTask(projectId, taskId);
      });

      const project = useGoalsStore.getState().projects[0];
      expect(project.tasks.length).toBe(1);
      expect(project.tasks[0].title).toBe('Task 2');
    });
  });

  describe('getActiveGoals', () => {
    it('should return only non-completed goals', () => {
      act(() => {
        useGoalsStore.getState().addGoal({ title: 'Active Goal' });
      });
      vi.advanceTimersByTime(10);
      act(() => {
        useGoalsStore.getState().addGoal({ title: 'Done Goal' });
      });
      const doneId = useGoalsStore.getState().goals[1].id;

      act(() => {
        useGoalsStore.getState().toggleGoalComplete(doneId);
      });

      const active = useGoalsStore.getState().getActiveGoals();
      expect(active.length).toBe(1);
      expect(active[0].title).toBe('Active Goal');
    });

    it('should return empty array when all goals are completed', () => {
      act(() => {
        useGoalsStore.getState().addGoal({ title: 'Done 1' });
      });
      vi.advanceTimersByTime(10);
      act(() => {
        useGoalsStore.getState().addGoal({ title: 'Done 2' });
      });

      act(() => {
        const goals = useGoalsStore.getState().goals;
        goals.forEach((g) => {
          useGoalsStore.getState().toggleGoalComplete(g.id);
        });
      });

      expect(useGoalsStore.getState().getActiveGoals()).toEqual([]);
    });
  });

  describe('getProjectProgress', () => {
    it('should calculate percentage correctly', () => {
      act(() => {
        useGoalsStore.getState().addProject({ title: 'My Project' });
      });
      const projectId = useGoalsStore.getState().projects[0].id;

      act(() => {
        useGoalsStore.getState().addTaskToProject(projectId, { title: 'Task 1' });
        useGoalsStore.getState().addTaskToProject(projectId, { title: 'Task 2' });
        useGoalsStore.getState().addTaskToProject(projectId, { title: 'Task 3' });
        useGoalsStore.getState().addTaskToProject(projectId, { title: 'Task 4' });
      });

      // Complete 2 out of 4 tasks
      const tasks = useGoalsStore.getState().projects[0].tasks;
      act(() => {
        useGoalsStore.getState().toggleProjectTask(projectId, tasks[0].id);
        useGoalsStore.getState().toggleProjectTask(projectId, tasks[1].id);
      });

      const progress = useGoalsStore.getState().getProjectProgress(projectId);
      expect(progress).toBe(50);
    });

    it('should return 0 for project with no tasks', () => {
      act(() => {
        useGoalsStore.getState().addProject({ title: 'Empty Project' });
      });

      const projectId = useGoalsStore.getState().projects[0].id;
      expect(useGoalsStore.getState().getProjectProgress(projectId)).toBe(0);
    });

    it('should return 100 when all tasks are complete', () => {
      act(() => {
        useGoalsStore.getState().addProject({ title: 'My Project' });
      });
      const projectId = useGoalsStore.getState().projects[0].id;

      act(() => {
        useGoalsStore.getState().addTaskToProject(projectId, { title: 'Task 1' });
        useGoalsStore.getState().addTaskToProject(projectId, { title: 'Task 2' });
      });

      const tasks = useGoalsStore.getState().projects[0].tasks;
      act(() => {
        useGoalsStore.getState().toggleProjectTask(projectId, tasks[0].id);
        useGoalsStore.getState().toggleProjectTask(projectId, tasks[1].id);
      });

      expect(useGoalsStore.getState().getProjectProgress(projectId)).toBe(100);
    });

    it('should return 0 for non-existent project', () => {
      expect(useGoalsStore.getState().getProjectProgress('nonexistent')).toBe(0);
    });
  });
});