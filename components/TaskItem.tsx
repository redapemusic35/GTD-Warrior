import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Check, Circle, Clock, Calendar, Tag, MoreHorizontal } from 'lucide-react-native';
import { Task } from '@/types/task';
import Colors from '@/constants/colors';
import { formatDate, isOverdue, isDueToday } from '@/utils/helpers';

interface TaskItemProps {
  task: Task;
  onPress?: () => void;
  onComplete?: () => void;
  onLongPress?: () => void;
  showProject?: boolean;
}

export default function TaskItem({ task, onPress, onComplete, onLongPress, showProject }: TaskItemProps) {
  const isComplete = task.status === 'done';
  const overdue = isOverdue(task.dueDate);
  const dueToday = isDueToday(task.dueDate);

  const getPriorityColor = () => {
    switch (task.priority) {
      case 'high': return Colors.priorityHigh;
      case 'medium': return Colors.priorityMedium;
      case 'low': return Colors.priorityLow;
      default: return Colors.border;
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <TouchableOpacity
        style={[styles.checkbox, { borderColor: getPriorityColor() }]}
        onPress={onComplete}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {isComplete && (
          <View style={[styles.checkboxFilled, { backgroundColor: getPriorityColor() }]}>
            <Check size={12} color={Colors.background} strokeWidth={3} />
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={[styles.title, isComplete && styles.titleComplete]} numberOfLines={2}>
          {task.title}
        </Text>

        <View style={styles.meta}>
          {task.dueDate && (
            <View style={[styles.badge, overdue && styles.badgeOverdue, dueToday && styles.badgeToday]}>
              <Calendar size={10} color={overdue ? Colors.highlight : dueToday ? Colors.warning : Colors.textMuted} />
              <Text style={[styles.badgeText, overdue && styles.badgeTextOverdue, dueToday && styles.badgeTextToday]}>
                {formatDate(task.dueDate)}
              </Text>
            </View>
          )}

          {task.context && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{task.context}</Text>
            </View>
          )}

          {task.waitingFor && (
            <View style={[styles.badge, styles.badgeWaiting]}>
              <Clock size={10} color={Colors.warning} />
              <Text style={[styles.badgeText, styles.badgeTextWaiting]}>{task.waitingFor}</Text>
            </View>
          )}

          {task.tags.length > 0 && (
            <View style={styles.badge}>
              <Tag size={10} color={Colors.textMuted} />
              <Text style={styles.badgeText}>{task.tags[0]}</Text>
              {task.tags.length > 1 && (
                <Text style={styles.badgeText}>+{task.tags.length - 1}</Text>
              )}
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity style={styles.moreButton} onPress={onLongPress}>
        <MoreHorizontal size={18} color={Colors.textMuted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxFilled: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 6,
  },
  titleComplete: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  badgeOverdue: {
    backgroundColor: 'rgba(233, 69, 96, 0.15)',
  },
  badgeToday: {
    backgroundColor: 'rgba(255, 183, 3, 0.15)',
  },
  badgeWaiting: {
    backgroundColor: 'rgba(255, 183, 3, 0.15)',
  },
  badgeText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  badgeTextOverdue: {
    color: Colors.highlight,
  },
  badgeTextToday: {
    color: Colors.warning,
  },
  badgeTextWaiting: {
    color: Colors.warning,
  },
  moreButton: {
    padding: 4,
    marginLeft: 8,
  },
});
