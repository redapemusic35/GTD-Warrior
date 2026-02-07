import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, ScrollView, Pressable, Platform } from 'react-native';
import { X, Calendar, Flag, Hash, User, FolderOpen } from 'lucide-react-native';
import { Task, Priority, Context, CONTEXTS, PRIORITIES } from '@/types/task';
import { Project } from '@/types/task';
import Colors from '@/constants/colors';
import * as Haptics from 'expo-haptics';

interface EditTaskModalProps {
  visible: boolean;
  task: Task | null;
  projects: Project[];
  onClose: () => void;
  onSave: (updates: Partial<Task>) => void;
}

export default function EditTaskModal({ visible, task, projects, onClose, onSave }: EditTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority | undefined>();
  const [context, setContext] = useState<Context | undefined>();
  const [projectId, setProjectId] = useState<string | undefined>();
  const [dueDate, setDueDate] = useState('');
  const [waitingFor, setWaitingFor] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setContext(task.context);
      setProjectId(task.projectId);
      setDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
      setWaitingFor(task.waitingFor || '');
      setTags(task.tags.join(', '));
    }
  }, [task]);

  const handleSave = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      context,
      projectId,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      waitingFor: waitingFor.trim() || undefined,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    });
    onClose();
  };

  if (!task) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Edit Task</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.field}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Task title"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Add details..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Flag size={14} color={Colors.textMuted} />
                <Text style={styles.label}>Priority</Text>
              </View>
              <View style={styles.chips}>
                {PRIORITIES.map((p) => (
                  <TouchableOpacity
                    key={p.value}
                    style={[
                      styles.chip,
                      priority === p.value && styles.chipSelected,
                      priority === p.value && { borderColor: p.value === 'high' ? Colors.priorityHigh : p.value === 'medium' ? Colors.priorityMedium : Colors.priorityLow },
                    ]}
                    onPress={() => setPriority(priority === p.value ? undefined : p.value)}
                  >
                    <Text style={[styles.chipText, priority === p.value && styles.chipTextSelected]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Hash size={14} color={Colors.textMuted} />
                <Text style={styles.label}>Context</Text>
              </View>
              <View style={styles.chips}>
                {CONTEXTS.map((c) => (
                  <TouchableOpacity
                    key={c.value}
                    style={[styles.chip, context === c.value && styles.chipSelected]}
                    onPress={() => setContext(context === c.value ? undefined : c.value)}
                  >
                    <Text style={[styles.chipText, context === c.value && styles.chipTextSelected]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <View style={styles.labelRow}>
                <FolderOpen size={14} color={Colors.textMuted} />
                <Text style={styles.label}>Project</Text>
              </View>
              <View style={styles.chips}>
                <TouchableOpacity
                  style={[styles.chip, !projectId && styles.chipSelected]}
                  onPress={() => setProjectId(undefined)}
                >
                  <Text style={[styles.chipText, !projectId && styles.chipTextSelected]}>None</Text>
                </TouchableOpacity>
                {projects.filter(p => p.status === 'active').map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.chip, projectId === p.id && styles.chipSelected, projectId === p.id && { borderColor: p.color }]}
                    onPress={() => setProjectId(projectId === p.id ? undefined : p.id)}
                  >
                    <View style={[styles.projectDot, { backgroundColor: p.color }]} />
                    <Text style={[styles.chipText, projectId === p.id && styles.chipTextSelected]}>
                      {p.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Calendar size={14} color={Colors.textMuted} />
                <Text style={styles.label}>Due Date</Text>
              </View>
              <TextInput
                style={styles.input}
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            {task.status === 'waiting' && (
              <View style={styles.field}>
                <View style={styles.labelRow}>
                  <User size={14} color={Colors.textMuted} />
                  <Text style={styles.label}>Waiting For</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={waitingFor}
                  onChangeText={setWaitingFor}
                  placeholder="Person or thing you're waiting on"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Tags (comma separated)</Text>
              <TextInput
                style={styles.input}
                value={tags}
                onChangeText={setTags}
                placeholder="work, urgent, follow-up"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
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
  modal: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  content: {
    padding: 20,
  },
  field: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  chipSelected: {
    backgroundColor: Colors.surfaceHighlight,
    borderColor: Colors.highlight,
  },
  chipText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  chipTextSelected: {
    color: Colors.text,
    fontWeight: '500',
  },
  projectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  saveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.highlight,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
});
