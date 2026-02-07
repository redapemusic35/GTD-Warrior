import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity } from 'react-native';
import { Inbox, Zap, Clock, Cloud, CheckCircle, AlertTriangle, Calendar, TrendingUp, Target } from 'lucide-react-native';
import { useTasks } from '@/contexts/TaskContext';
import Colors from '@/constants/colors';
import { isOverdue, isDueToday, isDueSoon } from '@/utils/helpers';

export default function ReviewScreen() {
  const { tasks, projects, goals, stats } = useTasks();

  const weeklyStats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const completedThisWeek = tasks.filter(t => 
      t.completedAt && new Date(t.completedAt) >= weekAgo
    ).length;

    const addedThisWeek = tasks.filter(t =>
      new Date(t.createdAt) >= weekAgo
    ).length;

    return { completedThisWeek, addedThisWeek };
  }, [tasks]);

  const upcomingTasks = useMemo(() => {
    return tasks
      .filter(t => t.status !== 'done' && isDueSoon(t.dueDate, 7))
      .sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      })
      .slice(0, 5);
  }, [tasks]);

  const overdueTasks = useMemo(() => {
    return tasks.filter(t => t.status !== 'done' && isOverdue(t.dueDate));
  }, [tasks]);

  const activeProjectCount = projects.filter(p => p.status === 'active').length;
  const stuckProjects = projects.filter(p => {
    if (p.status !== 'active') return false;
    const projectTasks = tasks.filter(t => t.projectId === p.id && t.status === 'next');
    return projectTasks.length === 0;
  });

  const StatCard = ({ icon: Icon, label, value, color, subtext }: any) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
        <Icon size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {subtext && <Text style={styles.statSubtext}>{subtext}</Text>}
    </View>
  );

  const BucketSummary = ({ icon: Icon, label, count, color }: any) => (
    <View style={styles.bucketRow}>
      <View style={[styles.bucketIcon, { backgroundColor: `${color}20` }]}>
        <Icon size={16} color={color} />
      </View>
      <Text style={styles.bucketLabel}>{label}</Text>
      <Text style={[styles.bucketCount, { color }]}>{count}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Weekly Review</Text>
        <Text style={styles.date}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          icon={CheckCircle}
          label="Completed"
          value={weeklyStats.completedThisWeek}
          color={Colors.success}
          subtext="this week"
        />
        <StatCard
          icon={TrendingUp}
          label="Added"
          value={weeklyStats.addedThisWeek}
          color={Colors.info}
          subtext="this week"
        />
        <StatCard
          icon={Target}
          label="Projects"
          value={activeProjectCount}
          color={Colors.project}
          subtext="active"
        />
        <StatCard
          icon={AlertTriangle}
          label="Overdue"
          value={overdueTasks.length}
          color={Colors.highlight}
          subtext="needs attention"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>GTD Buckets</Text>
        <View style={styles.bucketsCard}>
          <BucketSummary icon={Inbox} label="Inbox" count={stats.inbox} color={Colors.inbox} />
          <BucketSummary icon={Zap} label="Next Actions" count={stats.next} color={Colors.nextAction} />
          <BucketSummary icon={Clock} label="Waiting For" count={stats.waiting} color={Colors.waiting} />
          <BucketSummary icon={Cloud} label="Someday/Maybe" count={stats.someday} color={Colors.someday} />
        </View>
      </View>

      {overdueTasks.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Overdue Tasks</Text>
          <View style={styles.alertCard}>
            {overdueTasks.slice(0, 3).map((task) => (
              <View key={task.id} style={styles.alertItem}>
                <View style={styles.alertDot} />
                <Text style={styles.alertText} numberOfLines={1}>{task.title}</Text>
              </View>
            ))}
            {overdueTasks.length > 3 && (
              <Text style={styles.alertMore}>+{overdueTasks.length - 3} more</Text>
            )}
          </View>
        </View>
      )}

      {stuckProjects.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚧 Projects Need Next Actions</Text>
          <View style={styles.alertCard}>
            {stuckProjects.map((project) => (
              <View key={project.id} style={styles.alertItem}>
                <View style={[styles.alertDot, { backgroundColor: project.color }]} />
                <Text style={styles.alertText} numberOfLines={1}>{project.title}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📅 Coming Up</Text>
        {upcomingTasks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Calendar size={24} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No upcoming deadlines</Text>
          </View>
        ) : (
          <View style={styles.upcomingCard}>
            {upcomingTasks.map((task) => (
              <View key={task.id} style={styles.upcomingItem}>
                <View style={styles.upcomingDate}>
                  <Text style={[
                    styles.upcomingDateText,
                    isDueToday(task.dueDate) && styles.upcomingDateToday,
                    isOverdue(task.dueDate) && styles.upcomingDateOverdue,
                  ]}>
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                  </Text>
                </View>
                <Text style={styles.upcomingTitle} numberOfLines={1}>{task.title}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Review Checklist</Text>
        <View style={styles.checklistCard}>
          {[
            { text: 'Process inbox to zero', done: stats.inbox === 0 },
            { text: 'Review next actions', done: false },
            { text: 'Check waiting for items', done: false },
            { text: 'Review project list', done: false },
            { text: 'Review someday/maybe', done: false },
          ].map((item, index) => (
            <View key={index} style={styles.checklistItem}>
              <View style={[styles.checklistBox, item.done && styles.checklistBoxDone]}>
                {item.done && <CheckCircle size={14} color={Colors.success} />}
              </View>
              <Text style={[styles.checklistText, item.done && styles.checklistTextDone]}>
                {item.text}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 20,
    paddingTop: 12,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  date: {
    fontSize: 15,
    color: Colors.textMuted,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
  },
  statCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statSubtext: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  bucketsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bucketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  bucketIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bucketLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  bucketCount: {
    fontSize: 17,
    fontWeight: '600',
  },
  alertCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.highlight,
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  alertMore: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingTop: 8,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  upcomingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  upcomingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  upcomingDate: {
    width: 60,
  },
  upcomingDateText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  upcomingDateToday: {
    color: Colors.warning,
  },
  upcomingDateOverdue: {
    color: Colors.highlight,
  },
  upcomingTitle: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  checklistCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  checklistBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checklistBoxDone: {
    backgroundColor: `${Colors.success}20`,
    borderColor: Colors.success,
  },
  checklistText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  checklistTextDone: {
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
});
