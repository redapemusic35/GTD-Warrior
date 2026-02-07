import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Task, Project, Area, Goal, TaskStatus, Priority, Context } from '@/types/task';
import { generateId } from '@/utils/helpers';

const STORAGE_KEYS = {
  TASKS: 'taskflow_tasks',
  PROJECTS: 'taskflow_projects',
  AREAS: 'taskflow_areas',
  GOALS: 'taskflow_goals',
};

const DEFAULT_AREAS: Area[] = [
  { id: 'work', title: 'Work', description: 'Professional responsibilities', icon: 'Briefcase', createdAt: new Date().toISOString() },
  { id: 'personal', title: 'Personal', description: 'Personal life and growth', icon: 'User', createdAt: new Date().toISOString() },
  { id: 'health', title: 'Health', description: 'Physical and mental wellbeing', icon: 'Heart', createdAt: new Date().toISOString() },
  { id: 'finance', title: 'Finance', description: 'Financial management', icon: 'DollarSign', createdAt: new Date().toISOString() },
];

export const [TaskProvider, useTasks] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [areas, setAreas] = useState<Area[]>(DEFAULT_AREAS);
  const [goals, setGoals] = useState<Goal[]>([]);

  const tasksQuery = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.TASKS);
      return stored ? JSON.parse(stored) : [];
    },
  });

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.PROJECTS);
      return stored ? JSON.parse(stored) : [];
    },
  });

  const areasQuery = useQuery({
    queryKey: ['areas'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.AREAS);
      return stored ? JSON.parse(stored) : DEFAULT_AREAS;
    },
  });

  const goalsQuery = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.GOALS);
      return stored ? JSON.parse(stored) : [];
    },
  });

  useEffect(() => {
    if (tasksQuery.data) setTasks(tasksQuery.data);
  }, [tasksQuery.data]);

  useEffect(() => {
    if (projectsQuery.data) setProjects(projectsQuery.data);
  }, [projectsQuery.data]);

  useEffect(() => {
    if (areasQuery.data) setAreas(areasQuery.data);
  }, [areasQuery.data]);

  useEffect(() => {
    if (goalsQuery.data) setGoals(goalsQuery.data);
  }, [goalsQuery.data]);

  const syncTasks = useMutation({
    mutationFn: async (newTasks: Task[]) => {
      console.log('[TaskContext] Saving tasks:', newTasks.length);
      await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(newTasks));
      console.log('[TaskContext] Tasks saved successfully');
      return newTasks;
    },
    onSuccess: (data) => {
      console.log('[TaskContext] Mutation success, updating query cache');
      queryClient.setQueryData(['tasks'], data);
    },
    onError: (error) => {
      console.error('[TaskContext] Failed to save tasks:', error);
    },
  });

  const syncProjects = useMutation({
    mutationFn: async (newProjects: Project[]) => {
      console.log('[TaskContext] Saving projects:', newProjects.length);
      await AsyncStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(newProjects));
      return newProjects;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['projects'], data);
    },
    onError: (error) => {
      console.error('[TaskContext] Failed to save projects:', error);
    },
  });

  const syncAreas = useMutation({
    mutationFn: async (newAreas: Area[]) => {
      await AsyncStorage.setItem(STORAGE_KEYS.AREAS, JSON.stringify(newAreas));
      return newAreas;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['areas'], data);
    },
    onError: (error) => {
      console.error('[TaskContext] Failed to save areas:', error);
    },
  });

  const syncGoals = useMutation({
    mutationFn: async (newGoals: Goal[]) => {
      await AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(newGoals));
      return newGoals;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['goals'], data);
    },
    onError: (error) => {
      console.error('[TaskContext] Failed to save goals:', error);
    },
  });

  const addTask = useCallback((task: Omit<Task, 'id' | 'createdAt' | 'tags'> & { tags?: string[] }) => {
    const newTask: Task = {
      ...task,
      id: generateId(),
      tags: task.tags || [],
      createdAt: new Date().toISOString(),
    };
    console.log('[TaskContext] Adding task:', newTask.title);
    setTasks(prev => {
      const updated = [...prev, newTask];
      syncTasks.mutate(updated);
      return updated;
    });
    return newTask;
  }, [syncTasks]);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    console.log('[TaskContext] Updating task:', id);
    setTasks(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, ...updates } : t);
      syncTasks.mutate(updated);
      return updated;
    });
  }, [syncTasks]);

  const deleteTask = useCallback((id: string) => {
    console.log('[TaskContext] Deleting task:', id);
    setTasks(prev => {
      const updated = prev.filter(t => t.id !== id);
      syncTasks.mutate(updated);
      return updated;
    });
  }, [syncTasks]);

  const completeTask = useCallback((id: string) => {
    console.log('[TaskContext] Completing task:', id);
    setTasks(prev => {
      const updated = prev.map(t =>
        t.id === id ? { ...t, status: 'done' as TaskStatus, completedAt: new Date().toISOString() } : t
      );
      syncTasks.mutate(updated);
      return updated;
    });
  }, [syncTasks]);

  const moveTask = useCallback((id: string, status: TaskStatus) => {
    console.log('[TaskContext] Moving task:', id, 'to', status);
    setTasks(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, status } : t);
      syncTasks.mutate(updated);
      return updated;
    });
  }, [syncTasks]);

  const addProject = useCallback((project: Omit<Project, 'id' | 'createdAt'>) => {
    const newProject: Project = {
      ...project,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    console.log('[TaskContext] Adding project:', newProject.title);
    setProjects(prev => {
      const updated = [...prev, newProject];
      syncProjects.mutate(updated);
      return updated;
    });
    return newProject;
  }, [syncProjects]);

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    setProjects(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, ...updates } : p);
      syncProjects.mutate(updated);
      return updated;
    });
  }, [syncProjects]);

  const deleteProject = useCallback((id: string) => {
    setProjects(prev => {
      const updated = prev.filter(p => p.id !== id);
      syncProjects.mutate(updated);
      return updated;
    });
  }, [syncProjects]);

  const addGoal = useCallback((goal: Omit<Goal, 'id' | 'createdAt'>) => {
    const newGoal: Goal = {
      ...goal,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    setGoals(prev => {
      const updated = [...prev, newGoal];
      syncGoals.mutate(updated);
      return updated;
    });
    return newGoal;
  }, [syncGoals]);

  const updateGoal = useCallback((id: string, updates: Partial<Goal>) => {
    setGoals(prev => {
      const updated = prev.map(g => g.id === id ? { ...g, ...updates } : g);
      syncGoals.mutate(updated);
      return updated;
    });
  }, [syncGoals]);

  const deleteGoal = useCallback((id: string) => {
    setGoals(prev => {
      const updated = prev.filter(g => g.id !== id);
      syncGoals.mutate(updated);
      return updated;
    });
  }, [syncGoals]);

  const getTasksByStatus = useCallback((status: TaskStatus) => {
    return tasks.filter(t => t.status === status);
  }, [tasks]);

  const getTasksByProject = useCallback((projectId: string) => {
    return tasks.filter(t => t.projectId === projectId);
  }, [tasks]);

  const getTasksByContext = useCallback((context: Context) => {
    return tasks.filter(t => t.context === context && t.status !== 'done');
  }, [tasks]);

  const getProjectProgress = useCallback((projectId: string) => {
    const projectTasks = tasks.filter(t => t.projectId === projectId);
    if (projectTasks.length === 0) return 0;
    const completed = projectTasks.filter(t => t.status === 'done').length;
    return Math.round((completed / projectTasks.length) * 100);
  }, [tasks]);

  const stats = useMemo(() => {
    const inbox = tasks.filter(t => t.status === 'inbox').length;
    const next = tasks.filter(t => t.status === 'next').length;
    const waiting = tasks.filter(t => t.status === 'waiting').length;
    const someday = tasks.filter(t => t.status === 'someday').length;
    const done = tasks.filter(t => t.status === 'done').length;
    const today = tasks.filter(t => {
      if (!t.dueDate || t.status === 'done') return false;
      const due = new Date(t.dueDate);
      const now = new Date();
      return due.toDateString() === now.toDateString();
    }).length;
    const overdue = tasks.filter(t => {
      if (!t.dueDate || t.status === 'done') return false;
      const due = new Date(t.dueDate);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      return due < now;
    }).length;

    return { inbox, next, waiting, someday, done, today, overdue, total: tasks.length };
  }, [tasks]);

  const isLoading = tasksQuery.isLoading || projectsQuery.isLoading || areasQuery.isLoading || goalsQuery.isLoading;

  return {
    tasks,
    projects,
    areas,
    goals,
    isLoading,
    stats,
    addTask,
    updateTask,
    deleteTask,
    completeTask,
    moveTask,
    addProject,
    updateProject,
    deleteProject,
    addGoal,
    updateGoal,
    deleteGoal,
    getTasksByStatus,
    getTasksByProject,
    getTasksByContext,
    getProjectProgress,
  };
});
