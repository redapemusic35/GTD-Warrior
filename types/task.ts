export type Priority = 'high' | 'medium' | 'low';
export type TaskStatus = 'inbox' | 'next' | 'waiting' | 'someday' | 'done';
export type Context = '@home' | '@work' | '@computer' | '@phone' | '@errands' | '@anywhere';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: Priority;
  context?: Context;
  projectId?: string;
  dueDate?: string;
  waitingFor?: string;
  tags: string[];
  createdAt: string;
  completedAt?: string;
  estimatedMinutes?: number;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  outcome?: string;
  areaId?: string;
  status: 'active' | 'completed' | 'on-hold';
  dueDate?: string;
  createdAt: string;
  completedAt?: string;
  color: string;
}

export interface Area {
  id: string;
  title: string;
  description?: string;
  icon: string;
  createdAt: string;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  horizon: '1-year' | '3-year' | '5-year' | 'vision';
  areaId?: string;
  createdAt: string;
}

export const CONTEXTS: { value: Context; label: string; icon: string }[] = [
  { value: '@home', label: 'Home', icon: 'Home' },
  { value: '@work', label: 'Work', icon: 'Briefcase' },
  { value: '@computer', label: 'Computer', icon: 'Monitor' },
  { value: '@phone', label: 'Phone', icon: 'Smartphone' },
  { value: '@errands', label: 'Errands', icon: 'ShoppingCart' },
  { value: '@anywhere', label: 'Anywhere', icon: 'Globe' },
];

export const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];
