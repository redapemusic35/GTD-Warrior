import React, { useState, useMemo, useCallback, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, Animated, Dimensions } from 'react-native';
import { ChevronLeft, ChevronRight, Circle, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { useTasks } from '@/contexts/TaskContext';
import TaskItem from '@/components/TaskItem';
import TaskActionSheet from '@/components/TaskActionSheet';
import EditTaskModal from '@/components/EditTaskModal';
import Colors from '@/constants/colors';
import { Task, TaskStatus } from '@/types/task';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAY_SIZE = Math.floor((SCREEN_WIDTH - 48) / 7);

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  tasks: Task[];
  completedTasks: Task[];
}

const getCalendarDays = (year: number, month: number, tasks: Task[]): CalendarDay[] => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPadding = firstDay.getDay();
  const days: CalendarDay[] = [];
  const today = new Date();

  for (let i = startPadding - 1; i >= 0; i--) {
    const date = new Date(year, month, -i);
    days.push({
      date,
      isCurrentMonth: false,
      isToday: false,
      tasks: getTasksForDate(date, tasks, false),
      completedTasks: getTasksForDate(date, tasks, true),
    });
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    const isToday = date.toDateString() === today.toDateString();
    days.push({
      date,
      isCurrentMonth: true,
      isToday,
      tasks: getTasksForDate(date, tasks, false),
      completedTasks: getTasksForDate(date, tasks, true),
    });
  }

  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    const date = new Date(year, month + 1, i);
    days.push({
      date,
      isCurrentMonth: false,
      isToday: false,
      tasks: getTasksForDate(date, tasks, false),
      completedTasks: getTasksForDate(date, tasks, true),
    });
  }

  return days;
};

const getTasksForDate = (date: Date, tasks: Task[], completed: boolean): Task[] => {
  return tasks.filter(task => {
    if (completed) {
      if (task.status !== 'done' || !task.completedAt) return false;
      const completedDate = new Date(task.completedAt);
      return completedDate.toDateString() === date.toDateString();
    } else {
      if (task.status === 'done' || !task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      return dueDate.toDateString() === date.toDateString();
    }
  });
};

export default function CalendarScreen() {
  const { tasks, projects, updateTask, deleteTask, completeTask, moveTask } = useTasks();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calendarDays = useMemo(() => {
    return getCalendarDays(year, month, tasks);
  }, [year, month, tasks]);

  const selectedDayData = useMemo(() => {
    if (!selectedDate) return null;
    return calendarDays.find(day => day.date.toDateString() === selectedDate.toDateString());
  }, [calendarDays, selectedDate]);

  const navigateMonth = useCallback((direction: number) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0.5, duration: 100, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();

    setCurrentDate(new Date(year, month + direction, 1));
  }, [year, month, fadeAnim]);

  const goToToday = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  }, []);

  const selectDate = useCallback((day: CalendarDay) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setSelectedDate(day.date);
  }, []);

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

  const isOverdue = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.navButton} onPress={() => navigateMonth(-1)}>
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={goToToday}>
          <Animated.Text style={[styles.monthTitle, { opacity: fadeAnim }]}>
            {MONTHS[month]} {year}
          </Animated.Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navButton} onPress={() => navigateMonth(1)}>
          <ChevronRight size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekHeader}>
        {DAYS.map(day => (
          <View key={day} style={styles.weekDay}>
            <Text style={styles.weekDayText}>{day}</Text>
          </View>
        ))}
      </View>

      <Animated.View style={[styles.calendarGrid, { opacity: fadeAnim }]}>
        {calendarDays.map((day, index) => {
          const hasTasks = day.tasks.length > 0;
          const hasCompleted = day.completedTasks.length > 0;
          const hasOverdue = day.isCurrentMonth && isOverdue(day.date) && hasTasks;
          const isSelected = selectedDate?.toDateString() === day.date.toDateString();
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayCell,
                !day.isCurrentMonth && styles.dayCellOutside,
                day.isToday && styles.dayCellToday,
                isSelected && styles.dayCellSelected,
              ]}
              onPress={() => selectDate(day)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayNumber,
                  !day.isCurrentMonth && styles.dayNumberOutside,
                  day.isToday && styles.dayNumberToday,
                  isSelected && styles.dayNumberSelected,
                ]}
              >
                {day.date.getDate()}
              </Text>
              
              <View style={styles.indicators}>
                {hasTasks && (
                  <View style={[styles.dot, hasOverdue ? styles.dotOverdue : styles.dotActive]} />
                )}
                {hasCompleted && (
                  <View style={[styles.dot, styles.dotCompleted]} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </Animated.View>

      <View style={styles.selectedDateHeader}>
        {selectedDate && (
          <Text style={styles.selectedDateText}>
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
        )}
      </View>

      <ScrollView style={styles.taskList} showsVerticalScrollIndicator={false}>
        {selectedDayData && selectedDayData.tasks.length > 0 && (
          <View style={styles.taskSection}>
            <View style={styles.taskSectionHeader}>
              {isOverdue(selectedDayData.date) ? (
                <AlertCircle size={16} color={Colors.highlight} />
              ) : (
                <Circle size={16} color={Colors.info} />
              )}
              <Text style={[
                styles.taskSectionTitle,
                isOverdue(selectedDayData.date) && { color: Colors.highlight }
              ]}>
                {isOverdue(selectedDayData.date) ? 'Overdue' : 'Due'}
              </Text>
              <View style={styles.taskCount}>
                <Text style={styles.taskCountText}>{selectedDayData.tasks.length}</Text>
              </View>
            </View>
            {selectedDayData.tasks.map(task => (
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

        {selectedDayData && selectedDayData.completedTasks.length > 0 && (
          <View style={styles.taskSection}>
            <View style={styles.taskSectionHeader}>
              <CheckCircle2 size={16} color={Colors.success} />
              <Text style={styles.taskSectionTitle}>Completed</Text>
              <View style={[styles.taskCount, { backgroundColor: Colors.success }]}>
                <Text style={styles.taskCountText}>{selectedDayData.completedTasks.length}</Text>
              </View>
            </View>
            {selectedDayData.completedTasks.map(task => (
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

        {selectedDayData && selectedDayData.tasks.length === 0 && selectedDayData.completedTasks.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No tasks for this day</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  weekHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
  },
  weekDay: {
    width: DAY_SIZE,
    alignItems: 'center',
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dayCell: {
    width: DAY_SIZE,
    height: DAY_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: DAY_SIZE / 2,
  },
  dayCellOutside: {
    opacity: 0.3,
  },
  dayCellToday: {
    backgroundColor: `${Colors.highlight}20`,
  },
  dayCellSelected: {
    backgroundColor: Colors.highlight,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  dayNumberOutside: {
    color: Colors.textMuted,
  },
  dayNumberToday: {
    color: Colors.highlight,
    fontWeight: '700',
  },
  dayNumberSelected: {
    color: Colors.text,
    fontWeight: '700',
  },
  indicators: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 2,
    height: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  dotActive: {
    backgroundColor: Colors.info,
  },
  dotOverdue: {
    backgroundColor: Colors.highlight,
  },
  dotCompleted: {
    backgroundColor: Colors.success,
  },
  selectedDateHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  taskList: {
    flex: 1,
  },
  taskSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  taskSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  taskSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  taskCount: {
    backgroundColor: Colors.info,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  taskCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  bottomPadding: {
    height: 100,
  },
});
