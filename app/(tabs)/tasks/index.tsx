import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Zap, Clock, Cloud, CheckCircle, Filter, LucideIcon } from 'lucide-react-native';
import { useTasks } from '@/contexts/TaskContext';
import TaskItem from '@/components/TaskItem';
import TaskActionSheet from '@/components/TaskActionSheet';
import EditTaskModal from '@/components/EditTaskModal';
import EmptyState from '@/components/EmptyState';
import Colors from '@/constants/colors';
import { Task, TaskStatus, Context, CONTEXTS } from '@/types/task';

type FilterType = 'next' | 'waiting' | 'someday' | 'done';

const FILTERS: { value: FilterType; label: string; icon: LucideIcon; color: string }[] = [
  { value: 'next', label: 'Next', icon: Zap, color: Colors.nextAction },
  { value: 'waiting', label: 'Waiting', icon: Clock, color: Colors.waiting },
  { value: 'someday', label: 'Someday', icon: Cloud, color: Colors.someday },
  { value: 'done', label: 'Done', icon: CheckCircle, color: Colors.success },
];

export default function TasksScreen() {
  const { tasks, projects, updateTask, deleteTask, completeTask, moveTask, stats } = useTasks();
  const [activeFilter, setActiveFilter] = useState<FilterType>('next');
  const [contextFilter, setContextFilter] = useState<Context | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const filteredTasks = useMemo(() => {
    let filtered = tasks.filter(t => t.status === activeFilter);
    if (contextFilter) {
      filtered = filtered.filter(t => t.context === contextFilter);
    }
    return filtered.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2, undefined: 3 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 3;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 3;
      return aPriority - bPriority;
    });
  }, [tasks, activeFilter, contextFilter]);

  const getFilterCount = useCallback((filter: FilterType) => {
    switch (filter) {
      case 'next': return stats.next;
      case 'waiting': return stats.waiting;
      case 'someday': return stats.someday;
      case 'done': return stats.done;
      default: return 0;
    }
  }, [stats]);

  const handleTaskPress = useCallback((task: Task) => {
    setSelectedTask(task);
    setShowActionSheet(true);
  }, []);

  const handleComplete = useCallback((task: Task) => {
    if (task.status === 'done') {
      moveTask(task.id, 'next');
    } else {
      completeTask(task.id);
    }
  }, [completeTask, moveTask]);

  const handleMove = useCallback((status: TaskStatus) => {
    if (selectedTask) {
      moveTask(selectedTask.id, status);
    }
  }, [selectedTask, moveTask]);

  const handleEdit = useCallback(() => {
    setShowActionSheet(false);
    setTimeout(() => setShowEditModal(true), 300);
  }, []);

  const handleSaveEdit = useCallback((updates: Partial<Task>) => {
    if (selectedTask) {
      updateTask(selectedTask.id, updates);
    }
  }, [selectedTask, updateTask]);

  const handleDelete = useCallback(() => {
    if (selectedTask) {
      deleteTask(selectedTask.id);
    }
  }, [selectedTask, deleteTask]);

  const renderItem = useCallback(({ item }: { item: Task }) => (
    <TaskItem
      task={item}
      onPress={() => handleTaskPress(item)}
      onComplete={() => handleComplete(item)}
      onLongPress={() => handleTaskPress(item)}
    />
  ), [handleTaskPress, handleComplete]);

  const activeFilterConfig = FILTERS.find(f => f.value === activeFilter);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterBarContent}
      >
        {FILTERS.map((filter) => {
          const Icon = filter.icon;
          const isActive = activeFilter === filter.value;
          return (
            <TouchableOpacity
              key={filter.value}
              style={[styles.filterChip, isActive && { backgroundColor: `${filter.color}20`, borderColor: filter.color }]}
              onPress={() => setActiveFilter(filter.value)}
            >
              <Icon size={16} color={isActive ? filter.color : Colors.textMuted} />
              <Text style={[styles.filterLabel, isActive && { color: filter.color }]}>
                {filter.label}
              </Text>
              <View style={[styles.filterCount, isActive && { backgroundColor: filter.color }]}>
                <Text style={[styles.filterCountText, isActive && { color: Colors.background }]}>
                  {getFilterCount(filter.value)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.contextBar}
        contentContainerStyle={styles.contextBarContent}
      >
        <TouchableOpacity
          style={[styles.contextChip, !contextFilter && styles.contextChipActive]}
          onPress={() => setContextFilter(null)}
        >
          <Filter size={14} color={!contextFilter ? Colors.text : Colors.textMuted} />
          <Text style={[styles.contextLabel, !contextFilter && styles.contextLabelActive]}>All</Text>
        </TouchableOpacity>
        {CONTEXTS.map((ctx) => (
          <TouchableOpacity
            key={ctx.value}
            style={[styles.contextChip, contextFilter === ctx.value && styles.contextChipActive]}
            onPress={() => setContextFilter(contextFilter === ctx.value ? null : ctx.value)}
          >
            <Text style={[styles.contextLabel, contextFilter === ctx.value && styles.contextLabelActive]}>
              {ctx.value}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon={activeFilterConfig?.icon || Zap}
            title={`No ${activeFilterConfig?.label} Tasks`}
            description={activeFilter === 'next' ? "Process your inbox to add next actions" : `No tasks in ${activeFilterConfig?.label.toLowerCase()} list`}
            color={activeFilterConfig?.color}
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
    backgroundColor: Colors.background
  },
  filterBar: {
    maxHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterBarContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    flexDirection: 'row',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  filterCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  contextBar: {
    maxHeight: 44,
  },
  contextBarContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
  },
  contextChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    gap: 6,
  },
  contextChipActive: {
    backgroundColor: Colors.surfaceHighlight,
  },
  contextLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  contextLabelActive: {
    color: Colors.text,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 100,
    flexGrow: 1,
  },
});
