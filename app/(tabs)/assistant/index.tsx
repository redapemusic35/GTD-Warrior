import React, { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, FlatList, Text, KeyboardAvoidingView, Platform, ActivityIndicator, Animated } from 'react-native';
import { Send, Bot, User, Sparkles, Inbox, Zap, FolderPlus, Calendar, Mic, Square } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { createRorkTool, useRorkAgent } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import { useTasks } from '@/contexts/TaskContext';
import Colors from '@/constants/colors';
import * as Haptics from 'expo-haptics';

const QUICK_PROMPTS = [
  { icon: Inbox, text: "Help me process my inbox", color: Colors.inbox },
  { icon: Zap, text: "What should I work on next?", color: Colors.nextAction },
  { icon: FolderPlus, text: "Break down a project into tasks", color: Colors.project },
  { icon: Calendar, text: "Schedule tasks for this week", color: Colors.highlight },
];

export default function AssistantScreen() {
  const { tasks, projects, areas, addTask, moveTask, addProject, stats } = useTasks();
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const flatListRef = useRef<FlatList>(null);

  const { messages, sendMessage, status } = useRorkAgent({
    tools: {
      addTask: createRorkTool({
        description: "Add a new task to the GTD system. Use this when the user wants to capture a new task, break down projects, or schedule something on the calendar. Setting a dueDate will make the task appear on the calendar view.",
        zodSchema: z.object({
          title: z.string().describe("The task title - keep it actionable and clear"),
          status: z.enum(['inbox', 'next', 'waiting', 'someday']).describe("GTD bucket: inbox for unclarified, next for actionable, waiting for delegated, someday for future"),
          priority: z.enum(['high', 'medium', 'low']).optional().describe("Task priority level"),
          context: z.enum(['@home', '@work', '@computer', '@phone', '@errands', '@anywhere']).optional().describe("Context where the task can be done"),
          dueDate: z.string().optional().describe("Due date in YYYY-MM-DD format. Set this to schedule the task on the calendar."),
          projectId: z.string().optional().describe("Associated project ID - use getProjects to find existing project IDs"),
          waitingFor: z.string().optional().describe("Person or thing being waited on, if status is waiting"),
        }),
        execute(taskInput) {
          console.log('AI adding task:', taskInput);
          addTask({
            title: taskInput.title,
            status: taskInput.status,
            priority: taskInput.priority,
            context: taskInput.context,
            dueDate: taskInput.dueDate,
            projectId: taskInput.projectId,
            waitingFor: taskInput.waitingFor,
          });
          const calendarNote = taskInput.dueDate ? ` (scheduled for ${taskInput.dueDate})` : '';
          const projectNote = taskInput.projectId ? ` in project` : '';
          return `Added task: ${taskInput.title}${calendarNote}${projectNote}`;
        },
      }),
      moveTask: createRorkTool({
        description: "Move an existing task to a different GTD bucket",
        zodSchema: z.object({
          taskId: z.string().describe("ID of the task to move"),
          newStatus: z.enum(['inbox', 'next', 'waiting', 'someday', 'done']).describe("New GTD bucket for the task"),
        }),
        execute(moveInput) {
          console.log('AI moving task:', moveInput);
          moveTask(moveInput.taskId, moveInput.newStatus);
          return `Moved task to ${moveInput.newStatus}`;
        },
      }),
      getTasksSummary: createRorkTool({
        description: "Get a summary of current tasks and their statuses to help with recommendations",
        zodSchema: z.object({}),
        execute() {
          const inboxTasks = tasks.filter(t => t.status === 'inbox');
          const nextTasks = tasks.filter(t => t.status === 'next');
          const waitingTasks = tasks.filter(t => t.status === 'waiting');
          const somedayTasks = tasks.filter(t => t.status === 'someday');
          const scheduledTasks = tasks.filter(t => t.dueDate && t.status !== 'done');

          const summary = {
            inbox: inboxTasks.length,
            next: nextTasks.length,
            waiting: waitingTasks.length,
            someday: somedayTasks.length,
            scheduled: scheduledTasks.length,
            total: tasks.length,
            inboxItems: inboxTasks.slice(0, 10).map(t => `${t.id}: ${t.title}`).join(', '),
            nextActions: nextTasks.slice(0, 5).map(t => `${t.id}: ${t.title} (${t.priority || 'no priority'}, ${t.context || 'no context'})`).join(', '),
            upcomingScheduled: scheduledTasks.slice(0, 5).map(t => `${t.id}: ${t.title} (due: ${t.dueDate})`).join(', '),
            activeProjects: projects.filter(p => p.status === 'active').map(p => `${p.id}: ${p.title}`).join(', '),
          };
          return JSON.stringify(summary);
        },
      }),
      createProject: createRorkTool({
        description: "Create a new project in the GTD system. Use this when the user wants to start a new project or organize related tasks under a project.",
        zodSchema: z.object({
          title: z.string().describe("The project title - should describe the desired outcome"),
          description: z.string().optional().describe("Detailed description of the project"),
          outcome: z.string().optional().describe("The successful outcome that defines project completion"),
          areaId: z.enum(['work', 'personal', 'health', 'finance']).optional().describe("Area of focus this project belongs to"),
          status: z.enum(['active', 'on-hold']).default('active').describe("Project status: active or on-hold"),
          dueDate: z.string().optional().describe("Target completion date in YYYY-MM-DD format"),
          color: z.string().optional().describe("Project color in hex format (e.g., #3B82F6). Defaults to blue."),
        }),
        execute(projectInput) {
          console.log('AI creating project:', projectInput);
          const newProject = addProject({
            title: projectInput.title,
            description: projectInput.description,
            outcome: projectInput.outcome,
            areaId: projectInput.areaId,
            status: projectInput.status || 'active',
            dueDate: projectInput.dueDate,
            color: projectInput.color || '#3B82F6',
          });
          return `Created project: ${projectInput.title} (ID: ${newProject.id}). You can now add tasks to this project using the addTask tool with projectId: ${newProject.id}`;
        },
      }),
      getProjects: createRorkTool({
        description: "Get a list of all projects with their IDs. Use this to find project IDs when you need to add tasks to existing projects.",
        zodSchema: z.object({}),
        execute() {
          const projectList = projects.map(p => ({
            id: p.id,
            title: p.title,
            status: p.status,
            area: p.areaId || 'none',
            taskCount: tasks.filter(t => t.projectId === p.id).length,
          }));
          return JSON.stringify({ projects: projectList, availableAreas: areas.map(a => ({ id: a.id, title: a.title })) });
        },
      }),
    },
  });

  const handleSend = useCallback(() => {
    if (input.trim() && status !== 'streaming') {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      sendMessage(input.trim());
      setInput('');
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [input, sendMessage, status]);

  const handleQuickPrompt = useCallback((text: string) => {
    if (status !== 'streaming') {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      sendMessage(text);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [sendMessage, status]);

  const startPulseAnimation = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const stopPulseAnimation = useCallback(() => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  }, [pulseAnim]);

  const transcribeAudio = useCallback(async (audioData: Blob | { uri: string; name: string; type: string }) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioData as any);

      const response = await fetch('https://toolkit.rork.com/stt/transcribe/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const result = await response.json();
      console.log('Transcription result:', result);

      if (result.text) {
        setInput(prev => prev ? `${prev} ${result.text}` : result.text);
      }
    } catch (error) {
      console.error('Transcription error:', error);
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  const startRecordingMobile = useCallback(async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        console.log('Audio permission not granted');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });
      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
      startPulseAnimation();

      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      console.log('Recording started (mobile)');
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, [startPulseAnimation]);

  const stopRecordingMobile = useCallback(async () => {
    try {
      if (!recordingRef.current) return;

      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recordingRef.current.getURI();
      console.log('Recording stopped, URI:', uri);
      recordingRef.current = null;
      setIsRecording(false);
      stopPulseAnimation();

      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      if (uri) {
        const uriParts = uri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        const audioFile = {
          uri,
          name: `recording.${fileType}`,
          type: `audio/${fileType}`,
        };
        await transcribeAudio(audioFile);
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setIsRecording(false);
      stopPulseAnimation();
    }
  }, [stopPulseAnimation, transcribeAudio]);

  const startRecordingWeb = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      startPulseAnimation();
      console.log('Recording started (web)');
    } catch (error) {
      console.error('Failed to start web recording:', error);
    }
  }, [startPulseAnimation, transcribeAudio]);

  const stopRecordingWeb = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setIsRecording(false);
      stopPulseAnimation();
      console.log('Recording stopped (web)');
    }
  }, [stopPulseAnimation]);

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      if (Platform.OS === 'web') {
        stopRecordingWeb();
      } else {
        await stopRecordingMobile();
      }
    } else {
      if (Platform.OS === 'web') {
        await startRecordingWeb();
      } else {
        await startRecordingMobile();
      }
    }
  }, [isRecording, startRecordingMobile, stopRecordingMobile, startRecordingWeb, stopRecordingWeb]);

  const renderMessage = useCallback(({ item }: { item: typeof messages[0] }) => {
    const isUser = item.role === 'user';

    return (
      <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
        {!isUser && (
          <View style={styles.avatar}>
            <Bot size={18} color={Colors.highlight} />
          </View>
        )}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          {item.parts.map((part, i) => {
            if (part.type === 'text') {
              return (
                <Text key={`${item.id}-${i}`} style={[styles.messageText, isUser && styles.userText]}>
                  {part.text}
                </Text>
              );
            }
            if (part.type === 'tool') {
              const toolName = part.toolName;
              if (part.state === 'output-available') {
                return (
                  <View key={`${item.id}-${i}`} style={styles.toolResult}>
                    <Sparkles size={12} color={Colors.success} />
                    <Text style={styles.toolResultText}>
                      {toolName === 'addTask' ? '✓ Task added' :
                       toolName === 'moveTask' ? '✓ Task moved' :
                       toolName === 'createProject' ? '✓ Project created' :
                       toolName === 'getProjects' ? '✓ Got projects' :
                       '✓ Got task data'}
                    </Text>
                  </View>
                );
              }
              if (part.state === 'input-streaming' || part.state === 'input-available') {
                return (
                  <View key={`${item.id}-${i}`} style={styles.toolResult}>
                    <ActivityIndicator size="small" color={Colors.highlight} />
                    <Text style={styles.toolResultText}>Working...</Text>
                  </View>
                );
              }
            }
            return null;
          })}
        </View>
        {isUser && (
          <View style={[styles.avatar, styles.userAvatar]}>
            <User size={18} color={Colors.text} />
          </View>
        )}
      </View>
    );
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {messages.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Bot size={48} color={Colors.highlight} />
          </View>
          <Text style={styles.emptyTitle}>Your GTD Coach</Text>
          <Text style={styles.emptyDescription}>
            I can help you process your inbox, organize tasks, and stay productive using the GTD methodology.
          </Text>

          <View style={styles.quickPrompts}>
            {QUICK_PROMPTS.map((prompt, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickPrompt}
                onPress={() => handleQuickPrompt(prompt.text)}
              >
                <prompt.icon size={18} color={prompt.color} />
                <Text style={styles.quickPromptText}>{prompt.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={isTranscribing ? "Transcribing..." : "Ask your GTD coach..."}
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={500}
            onSubmitEditing={handleSend}
            editable={status !== 'streaming' && !isTranscribing}
          />
          <TouchableOpacity
            style={[styles.micButton, isRecording && styles.micButtonRecording]}
            onPress={toggleRecording}
            disabled={status === 'streaming' || isTranscribing}
          >
            {isTranscribing ? (
              <ActivityIndicator size="small" color={Colors.highlight} />
            ) : isRecording ? (
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <Square size={16} color={Colors.error} fill={Colors.error} />
              </Animated.View>
            ) : (
              <Mic size={18} color={Colors.highlight} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() || status === 'streaming') && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || status === 'streaming'}
          >
            {status === 'streaming' ? (
              <ActivityIndicator size="small" color={Colors.background} />
            ) : (
              <Send size={18} color={Colors.background} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: `${Colors.highlight}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  quickPrompts: {
    width: '100%',
    gap: 10,
  },
  quickPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickPromptText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },
  messageList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
    gap: 8,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${Colors.highlight}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatar: {
    backgroundColor: Colors.surfaceLight,
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 18,
    padding: 14,
  },
  assistantBubble: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: Colors.highlight,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 21,
  },
  userText: {
    color: Colors.text,
  },
  toolResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  toolResultText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  inputContainer: {
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.surface,
    borderRadius: 24,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    maxHeight: 100,
    paddingVertical: 8,
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.highlight}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButtonRecording: {
    backgroundColor: `${Colors.error}20`,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.highlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.surfaceLight,
  },
});
