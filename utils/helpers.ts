export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 0 && diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'long' });

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function isOverdue(dateString?: string): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return date < now;
}

export function isDueToday(dateString?: string): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

export function isDueSoon(dateString?: string, days: number = 3): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 && diff <= days;
}

export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatDate(dateString);
}

import { Priority, Context, TaskStatus } from '@/types/task';

export interface ParsedTask {
  title: string;
  priority?: Priority;
  context?: Context;
  projectName?: string;
  dueDate?: string;
  tags: string[];
  status?: TaskStatus;
}

export function parseTaskInput(input: string): ParsedTask {
  let title = input;
  let priority: Priority | undefined;
  let context: Context | undefined;
  let projectName: string | undefined;
  let dueDate: string | undefined;
  let status: TaskStatus | undefined;
  const tags: string[] = [];

  // Parse priority: pri:H, pri:M, pri:L or !H, !M, !L
  const priorityMatch = title.match(/\b(?:pri:|!)([HML])\b/i);
  if (priorityMatch) {
    const p = priorityMatch[1].toUpperCase();
    if (p === 'H') priority = 'high';
    else if (p === 'M') priority = 'medium';
    else if (p === 'L') priority = 'low';
    title = title.replace(priorityMatch[0], '').trim();
  }

  // Parse context: @home, @work, @computer, @phone, @errands, @anywhere
  const contextMatch = title.match(/@(home|work|computer|phone|errands|anywhere)\b/i);
  if (contextMatch) {
    context = `@${contextMatch[1].toLowerCase()}` as Context;
    title = title.replace(contextMatch[0], '').trim();
  }

  // Parse project: pro:projectname
  const projectMatch = title.match(/\bpro:(\S+)/i);
  if (projectMatch) {
    projectName = projectMatch[1];
    title = title.replace(projectMatch[0], '').trim();
  }

  // Parse due date: due:today, due:tomorrow, due:YYYY-MM-DD, due:+3d
  const dueMatch = title.match(/\bdue:(\S+)/i);
  if (dueMatch) {
    const dueValue = dueMatch[1].toLowerCase();
    const today = new Date();

    if (dueValue === 'today') {
      dueDate = today.toISOString().split('T')[0];
    } else if (dueValue === 'tomorrow' || dueValue === 'tom') {
      today.setDate(today.getDate() + 1);
      dueDate = today.toISOString().split('T')[0];
    } else if (dueValue.match(/^\+\d+d$/)) {
      const days = parseInt(dueValue.slice(1, -1));
      today.setDate(today.getDate() + days);
      dueDate = today.toISOString().split('T')[0];
    } else if (dueValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      dueDate = dueValue;
    }
    title = title.replace(dueMatch[0], '').trim();
  }

  // Parse tags: +tag1 +tag2
  const tagMatches = title.match(/\+(\w+)/g);
  if (tagMatches) {
    tagMatches.forEach(tag => {
      tags.push(tag.slice(1));
      title = title.replace(tag, '').trim();
    });
  }

  // Parse status shortcuts: >next, >wait, >someday
  const statusMatch = title.match(/>(next|wait|waiting|someday|maybe)/i);
  if (statusMatch) {
    const s = statusMatch[1].toLowerCase();
    if (s === 'next') status = 'next';
    else if (s === 'wait' || s === 'waiting') status = 'waiting';
    else if (s === 'someday' || s === 'maybe') status = 'someday';
    title = title.replace(statusMatch[0], '').trim();
  }

  // Clean up extra spaces
  title = title.replace(/\s+/g, ' ').trim();

  return {
    title,
    priority,
    context,
    projectName,
    dueDate,
    tags,
    status,
  };
}
