import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Inbox, Zap, Clock, Cloud, Trash2, Edit2, X, FolderOpen } from 'lucide-react-native';
import { Task, TaskStatus } from '@/types/task';
import Colors from '@/constants/colors';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

interface TaskActionSheetProps {
  visible: boolean;
  task: Task | null;
  onClose: () => void;
  onMove: (status: TaskStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
}

const actions = [
  { status: 'inbox' as TaskStatus, label: 'Move to Inbox', icon: Inbox, color: Colors.inbox },
  { status: 'next' as TaskStatus, label: 'Next Action', icon: Zap, color: Colors.nextAction },
  { status: 'waiting' as TaskStatus, label: 'Waiting For', icon: Clock, color: Colors.waiting },
  { status: 'someday' as TaskStatus, label: 'Someday/Maybe', icon: Cloud, color: Colors.someday },
];

export default function TaskActionSheet({ visible, task, onClose, onMove, onEdit, onDelete }: TaskActionSheetProps) {
  const handleMove = (status: TaskStatus) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onMove(status);
    onClose();
  };

  const handleDelete = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    onDelete();
    onClose();
  };

  if (!task) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={2}>{task.title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Move to</Text>
            {actions.filter(a => a.status !== task.status).map((action) => (
              <TouchableOpacity
                key={action.status}
                style={styles.actionItem}
                onPress={() => handleMove(action.status)}
              >
                <View style={[styles.actionIcon, { backgroundColor: `${action.color}20` }]}>
                  <action.icon size={18} color={action.color} />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.actionItem} onPress={onEdit}>
            <View style={[styles.actionIcon, { backgroundColor: Colors.surfaceLight }]}>
              <Edit2 size={18} color={Colors.text} />
            </View>
            <Text style={styles.actionLabel}>Edit Task</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={handleDelete}>
            <View style={[styles.actionIcon, { backgroundColor: `${Colors.highlight}20` }]}>
              <Trash2 size={18} color={Colors.highlight} />
            </View>
            <Text style={[styles.actionLabel, { color: Colors.highlight }]}>Delete Task</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 22,
  },
  closeButton: {
    padding: 4,
    marginLeft: 12,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 14,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
});
