import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, Text, TouchableOpacity, Modal, TextInput, ScrollView, Pressable } from 'react-native';
import { Plus, FolderOpen, ChevronRight, Target, X, CheckCircle } from 'lucide-react-native';
import { useTasks } from '@/contexts/TaskContext';
import EmptyState from '@/components/EmptyState';
import Colors from '@/constants/colors';
import { Project, Goal } from '@/types/task';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const PROJECT_COLORS = [
  '#E94560', '#4ECCA3', '#FFB703', '#219EBC', '#9B5DE5',
  '#F15BB5', '#00BBF9', '#00F5D4', '#FEE440', '#FF6B6B',
];

export default function ProjectsScreen() {
  const { projects, goals, areas, addProject, updateProject, deleteProject, addGoal, getProjectProgress, getTasksByProject } = useTasks();
  const [showAddProject, setShowAddProject] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectOutcome, setNewProjectOutcome] = useState('');
  const [selectedColor, setSelectedColor] = useState(PROJECT_COLORS[0]);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [selectedHorizon, setSelectedHorizon] = useState<'1-year' | '3-year' | '5-year' | 'vision'>('1-year');

  const activeProjects = projects.filter(p => p.status === 'active');
  const completedProjects = projects.filter(p => p.status === 'completed');

  const handleAddProject = useCallback(() => {
    if (newProjectTitle.trim()) {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      addProject({
        title: newProjectTitle.trim(),
        outcome: newProjectOutcome.trim() || undefined,
        color: selectedColor,
        status: 'active',
      });
      setNewProjectTitle('');
      setNewProjectOutcome('');
      setSelectedColor(PROJECT_COLORS[0]);
      setShowAddProject(false);
    }
  }, [newProjectTitle, newProjectOutcome, selectedColor, addProject]);

  const handleAddGoal = useCallback(() => {
    if (newGoalTitle.trim()) {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      addGoal({
        title: newGoalTitle.trim(),
        horizon: selectedHorizon,
      });
      setNewGoalTitle('');
      setSelectedHorizon('1-year');
      setShowAddGoal(false);
    }
  }, [newGoalTitle, selectedHorizon, addGoal]);

  const handleCompleteProject = useCallback((project: Project) => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    updateProject(project.id, { status: 'completed', completedAt: new Date().toISOString() });
  }, [updateProject]);

  const renderProject = useCallback(({ item }: { item: Project }) => {
    const progress = getProjectProgress(item.id);
    const taskCount = getTasksByProject(item.id).length;

    return (
      <TouchableOpacity style={styles.projectCard} activeOpacity={0.7}>
        <View style={styles.projectHeader}>
          <View style={[styles.projectColor, { backgroundColor: item.color }]} />
          <View style={styles.projectInfo}>
            <Text style={styles.projectTitle}>{item.title}</Text>
            {item.outcome && (
              <Text style={styles.projectOutcome} numberOfLines={1}>{item.outcome}</Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => handleCompleteProject(item)}
          >
            <CheckCircle size={22} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.projectMeta}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: item.color }]} />
          </View>
          <View style={styles.projectStats}>
            <Text style={styles.projectStatText}>{taskCount} tasks</Text>
            <Text style={styles.projectStatText}>{progress}% complete</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [getProjectProgress, getTasksByProject, handleCompleteProject]);

  const renderGoal = useCallback(({ item }: { item: Goal }) => {
    const horizonLabels = {
      '1-year': '1 Year',
      '3-year': '3 Years',
      '5-year': '5 Years',
      'vision': 'Vision',
    };

    return (
      <View style={styles.goalCard}>
        <Target size={18} color={Colors.project} />
        <View style={styles.goalInfo}>
          <Text style={styles.goalTitle}>{item.title}</Text>
          <Text style={styles.goalHorizon}>{horizonLabels[item.horizon]}</Text>
        </View>
      </View>
    );
  }, []);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Projects</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddProject(true)}
          >
            <Plus size={18} color={Colors.highlight} />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {activeProjects.length === 0 ? (
          <View style={styles.emptyCard}>
            <FolderOpen size={32} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No active projects</Text>
            <Text style={styles.emptySubtext}>Create a project to organize related tasks</Text>
          </View>
        ) : (
          activeProjects.map((project) => (
            <View key={project.id}>{renderProject({ item: project })}</View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Long-Term Goals</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddGoal(true)}
          >
            <Plus size={18} color={Colors.highlight} />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {goals.length === 0 ? (
          <View style={styles.emptyCard}>
            <Target size={32} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No goals yet</Text>
            <Text style={styles.emptySubtext}>Set your vision and long-term objectives</Text>
          </View>
        ) : (
          goals.map((goal) => (
            <View key={goal.id}>{renderGoal({ item: goal })}</View>
          ))
        )}
      </View>

      {completedProjects.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Completed ({completedProjects.length})</Text>
          {completedProjects.map((project) => (
            <View key={project.id} style={[styles.projectCard, styles.completedCard]}>
              <View style={[styles.projectColor, { backgroundColor: project.color, opacity: 0.5 }]} />
              <Text style={[styles.projectTitle, styles.completedText]}>{project.title}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 100 }} />

      <Modal visible={showAddProject} transparent animationType="slide" onRequestClose={() => setShowAddProject(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowAddProject(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Project</Text>
              <TouchableOpacity onPress={() => setShowAddProject(false)}>
                <X size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              value={newProjectTitle}
              onChangeText={setNewProjectTitle}
              placeholder="Project name"
              placeholderTextColor={Colors.textMuted}
              autoFocus
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              value={newProjectOutcome}
              onChangeText={setNewProjectOutcome}
              placeholder="What does 'done' look like? (optional)"
              placeholderTextColor={Colors.textMuted}
              multiline
            />

            <Text style={styles.label}>Color</Text>
            <View style={styles.colorPicker}>
              {PROJECT_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorOption, { backgroundColor: color }, selectedColor === color && styles.colorSelected]}
                  onPress={() => setSelectedColor(color)}
                />
              ))}
            </View>

            <TouchableOpacity style={styles.createButton} onPress={handleAddProject}>
              <Text style={styles.createButtonText}>Create Project</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showAddGoal} transparent animationType="slide" onRequestClose={() => setShowAddGoal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowAddGoal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Goal</Text>
              <TouchableOpacity onPress={() => setShowAddGoal(false)}>
                <X size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              value={newGoalTitle}
              onChangeText={setNewGoalTitle}
              placeholder="What do you want to achieve?"
              placeholderTextColor={Colors.textMuted}
              autoFocus
            />

            <Text style={styles.label}>Time Horizon</Text>
            <View style={styles.horizonPicker}>
              {(['1-year', '3-year', '5-year', 'vision'] as const).map((horizon) => (
                <TouchableOpacity
                  key={horizon}
                  style={[styles.horizonOption, selectedHorizon === horizon && styles.horizonSelected]}
                  onPress={() => setSelectedHorizon(horizon)}
                >
                  <Text style={[styles.horizonText, selectedHorizon === horizon && styles.horizonTextSelected]}>
                    {horizon === 'vision' ? 'Vision' : horizon.replace('-', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.createButton} onPress={handleAddGoal}>
              <Text style={styles.createButtonText}>Create Goal</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.highlight,
  },
  projectCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  completedCard: {
    opacity: 0.6,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  projectHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  projectColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    marginRight: 12,
  },
  projectInfo: {
    flex: 1,
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  completedText: {
    textDecorationLine: 'line-through',
    marginLeft: 12,
  },
  projectOutcome: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  completeButton: {
    padding: 4,
  },
  projectMeta: {
    marginTop: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  projectStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  projectStatText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  goalInfo: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  goalHorizon: {
    fontSize: 12,
    color: Colors.project,
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: Colors.text,
  },
  horizonPicker: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  horizonOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  horizonSelected: {
    backgroundColor: Colors.highlight,
    borderColor: Colors.highlight,
  },
  horizonText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  horizonTextSelected: {
    color: Colors.text,
  },
  createButton: {
    backgroundColor: Colors.highlight,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
});
