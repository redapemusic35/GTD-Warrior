import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, Text, RefreshControl } from 'react-native';
import { Inbox } from 'lucide-react-native';
import { useTasks } from '@/contexts/TaskContext';
import TaskItem from '@/components/TaskItem';
import QuickAddTask from '@/components/QuickAddTask';
import TaskActionSheet from '@/components/TaskActionSheet';
import EditTaskModal from '@/components/EditTaskModal';
import EmptyState from '@/components/EmptyState';
import Colors from '@/constants/colors';
import { Task, TaskStatus } from '@/types/task';
import { parseTaskInput } from '@/utils/helpers';

export default function InboxScreen() {
  const { tasks, projects, addTask, updateTask, deleteTask, completeTask, moveTask, isLoading, stats } = useTasks();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const inboxTasks = tasks.filter(t => t.status === 'inbox');

  const handleAddTask = useCallback((input: string) => {
    console.log('Parsing task input:', input);
    const parsed = parseTaskInput(input);
    console.log('Parsed task:', parsed);

    // Find project by name if specified
    let projectId: string | undefined;
    if (parsed.projectName) {
      const project = projects.find(p =>
        p.title.toLowerCase() === parsed.projectName?.toLowerCase() ||
        p.title.toLowerCase().replace(/\s+/g, '-') === parsed.projectName?.toLowerCase()
      );
      if (project) {
        projectId = project.id;
        console.log('Matched project:', project.title);
      }
    }

    addTask({
      title: parsed.title,
      status: parsed.status || 'inbox',
      priority: parsed.priority,
      context: parsed.context,
      projectId,
      dueDate: parsed.dueDate,
      tags: parsed.tags,
    });
  }, [addTask, projects]);

  const handleTaskPress = useCallback((task: Task) => {
    setSelectedTask(task);
    setShowActionSheet(true);
  }, []);

  const handleComplete = useCallback((task: Task) => {
    console.log('Completing task:', task.id);
    completeTask(task.id);
  }, [completeTask]);

  const handleMove = useCallback((status: TaskStatus) => {
    if (selectedTask) {
      console.log('Moving task:', selectedTask.id, 'to', status);
      moveTask(selectedTask.id, status);
    }
  }, [selectedTask, moveTask]);

  const handleEdit = useCallback(() => {
    setShowActionSheet(false);
    setTimeout(() => setShowEditModal(true), 300);
  }, []);

  const handleSaveEdit = useCallback((updates: Partial<Task>) => {
    if (selectedTask) {
      console.log('Updating task:', selectedTask.id, updates);
      updateTask(selectedTask.id, updates);
    }
  }, [selectedTask, updateTask]);

  const handleDelete = useCallback(() => {
    if (selectedTask) {
      console.log('Deleting task:', selectedTask.id);
      deleteTask(selectedTask.id);
    }
  }, [selectedTask, deleteTask]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const renderItem = useCallback(({ item }: { item: Task }) => (
    <TaskItem
      task={item}
      onPress={() => handleTaskPress(item)}
      onComplete={() => handleComplete(item)}
      onLongPress={() => handleTaskPress(item)}
    />
  ), [handleTaskPress, handleComplete]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.inbox}</Text>
            <Text style={styles.statLabel}>to process</Text>
          </View>
          {stats.overdue > 0 && (
            <View style={[styles.statItem, styles.statWarning]}>
              <Text style={[styles.statNumber, styles.statNumberWarning]}>{stats.overdue}</Text>
              <Text style={[styles.statLabel, styles.statLabelWarning]}>overdue</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.addSection}>
        <QuickAddTask onAdd={handleAddTask} placeholder="Capture anything on your mind..." />
      </View>

      <FlatList
        data={inboxTasks}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.highlight}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={Inbox}
            title="Inbox Zero!"
            description="Your mind is clear. Capture new ideas and tasks above."
            color={Colors.success}
          />
        }
      />

      <TaskActionSheet
        visible={showActionSheet}
        task={selectedTask}
        onClose={() => setShowActionSheet(false)}
        onMove={handleMove}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <EditTaskModal
        visible={showEditModal}
        task={selectedTask}
        projects={projects}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveEdit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  statWarning: {
    backgroundColor: 'rgba(233, 69, 96, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  statNumberWarning: {
    color: Colors.highlight,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  statLabelWarning: {
    color: Colors.highlight,
  },
  addSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    flexGrow: 1,
  },
});
