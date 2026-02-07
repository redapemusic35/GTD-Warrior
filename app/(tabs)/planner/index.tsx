import React, { useState, useMemo, useCallback, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, FlatList, Animated } from 'react-native';
import { ChevronLeft, ChevronRight, Sun, Sunrise, Moon, Clock, AlertCircle, CheckCircle2, Plus } from 'lucide-react-native';
import { useTasks } from '@/contexts/TaskContext';
import TaskItem from '@/components/TaskItem';
import TaskActionSheet from '@/components/TaskActionSheet';
import EditTaskModal from '@/components/EditTaskModal';
import EmptyState from '@/components/EmptyState';
import Colors from '@/constants/colors';
import { Task, TaskStatus } from '@/types/task';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const TIME_BLOCKS = [
  { id: 'morning', label: 'Morning', hours: '6 AM - 12 PM', icon: Sunrise, color: '#FFB703' },
  { id: 'afternoon', label: 'Afternoon', hours: '12 PM - 6 PM', icon: Sun, color: '#E94560' },
  { id: 'evening', label: 'Evening', hours: '6 PM - 12 AM', icon: Moon, color: '#9B5DE5' },
];

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
};

const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.toDateString() === date2.toDateString();
};

const isToday = (date: Date): boolean => {
  return isSameDay(date, new Date());
};

export default function PlannerScreen() {
  const { tasks, projects, updateTask, deleteTask, completeTask, moveTask } = useTasks();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const navigateDay = useCallback((direction: number) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: direction * -50,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction);
    setSelectedDate(newDate);
  }, [selectedDate, slideAnim]);

  const goToToday = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setSelectedDate(new Date());
  }, []);

  const todayTasks = useMemo(() => {
    return tasks.filter(task => {
      if (task.status === 'done') return false;
      if (!task.dueDate) return false;
      return isSameDay(new Date(task.dueDate), selectedDate);
    });
  }, [tasks, selectedDate]);

  const completedTodayTasks = useMemo(() => {
    return tasks.filter(task => {
      if (task.status !== 'done' || !task.completedAt) return false;
      return isSameDay(new Date(task.completedAt), selectedDate);
    });
  }, [tasks, selectedDate]);

  const overdueTasks = useMemo(() => {
    if (!isToday(selectedDate)) return [];
    return tasks.filter(task => {
      if (task.status === 'done' || !task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return dueDate < today;
    });
  }, [tasks, selectedDate]);

  const nextActionTasks = useMemo(() => {
    if (!isToday(selectedDate)) return [];
    return tasks.filter(task => task.status === 'next' && !task.dueDate).slice(0, 5);
  }, [tasks, selectedDate]);

  const handleTaskPress = useCallback((task: Task) => {
    setSelectedTask(task);
    setShowActionSheet(true);
  }, []);

  const handleComplete = useCallback((task: Task) => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
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

  const totalTasks = todayTasks.length + overdueTasks.length;
  const completedCount = completedTodayTasks.length;

  return (
    <View style={styles.container}>
      <View style={styles.dateHeader}>
        <TouchableOpacity style={styles.navButton} onPress={() => navigateDay(-1)}>
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>

        <Animated.View style={[styles.dateContainer, { transform: [{ translateX: slideAnim }] }]}>
          <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
          {isToday(selectedDate) && (
            <View style={styles.todayBadge}>
              <Text style={styles.todayBadgeText}>Today</Text>
            </View>
          )}
        </Animated.View>

        <TouchableOpacity style={styles.navButton} onPress={() => navigateDay(1)}>
          <ChevronRight size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {!isToday(selectedDate) && (
        <TouchableOpacity style={styles.goTodayButton} onPress={goToToday}>
          <Text style={styles.goTodayText}>Go to Today</Text>
        </TouchableOpacity>
      )}

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Clock size={18} color={Colors.highlight} />
          <Text style={styles.statValue}>{totalTasks}</Text>
          <Text style={styles.statLabel}>Scheduled</Text>
        </View>
        <View style={styles.statCard}>
          <CheckCircle2 size={18} color={Colors.success} />
          <Text style={styles.statValue}>{completedCount}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        {overdueTasks.length > 0 && (
          <View style={[styles.statCard, styles.overdueCard]}>
            <AlertCircle size={18} color={Colors.highlight} />
            <Text style={[styles.statValue, { color: Colors.highlight }]}>{overdueTasks.length}</Text>
            <Text style={styles.statLabel}>Overdue</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {overdueTasks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <AlertCircle size={18} color={Colors.highlight} />
              <Text style={[styles.sectionTitle, { color: Colors.highlight }]}>Overdue</Text>
            </View>
            {overdueTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onPress={() => handleTaskPress(task)}
                onComplete={() => handleComplete(task)}
                onLongPress={() => handleTaskPress(task)}
              />
            ))}
          </View>
        )}

        {todayTasks.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Clock size={18} color={Colors.info} />
              <Text style={styles.sectionTitle}>Scheduled for {isToday(selectedDate) ? 'Today' : formatDate(selectedDate).split(',')[0]}</Text>
            </View>
            {todayTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onPress={() => handleTaskPress(task)}
                onComplete={() => handleComplete(task)}
                onLongPress={() => handleTaskPress(task)}
              />
            ))}
          </View>
        ) : (
          !overdueTasks.length && isToday(selectedDate) && (
            <EmptyState
              icon={Sun}
              title="No Tasks Scheduled"
              description="Add due dates to your tasks to see them in your daily planner"
              color={Colors.warning}
            />
          )
        )}

        {isToday(selectedDate) && nextActionTasks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Plus size={18} color={Colors.nextAction} />
              <Text style={styles.sectionTitle}>Available Next Actions</Text>
            </View>
            <Text style={styles.sectionSubtitle}>Tasks without due dates from your Next list</Text>
            {nextActionTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onPress={() => handleTaskPress(task)}
                onComplete={() => handleComplete(task)}
                onLongPress={() => handleTaskPress(task)}
              />
            ))}
          </View>
        )}

        {completedTodayTasks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <CheckCircle2 size={18} color={Colors.success} />
              <Text style={styles.sectionTitle}>Completed</Text>
            </View>
            {completedTodayTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onPress={() => handleTaskPress(task)}
                onComplete={() => handleComplete(task)}
                onLongPress={() => handleTaskPress(task)}
              />
            ))}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

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
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateContainer: {
    alignItems: 'center',
    flex: 1,
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  todayBadge: {
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 2,
    backgroundColor: Colors.highlight,
    borderRadius: 10,
  },
  todayBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text,
  },
  goTodayButton: {
    alignSelf: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.highlight,
  },
  goTodayText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.highlight,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  overdueCard: {
    borderColor: `${Colors.highlight}40`,
    backgroundColor: `${Colors.highlight}10`,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 12,
    marginLeft: 26,
  },
  bottomPadding: {
    height: 100,
  },
});
