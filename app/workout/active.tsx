import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, useCallback, useRef } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  SlideInUp,
  SlideOutUp,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  X,
  Plus,
  Check,
  Timer,
  Trophy,
  Dumbbell,
  Minus,
  Disc,
  MoreVertical,
  Pin,
  FileText,
  Layers,
  ArrowUpDown,
  RefreshCw,
  Trash2,
  ChevronDown,
  Clock,
  Sparkles,
  Info,
  Edit3,
} from 'lucide-react-native';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useTimerStore } from '../../src/store/timerStore';
import { getRoutineExercises } from '../../src/db/queries/routines';
import {
  getLastPerformance,
  getWorkoutExercisesWithDetails,
  getSetsForWorkoutExercise,
} from '../../src/db/queries/workouts';
import { formatDuration } from '../../src/utils/calculations';
import { PlateCalculatorModal } from '../../src/components/tools/PlateCalculatorModal';
import type { ActiveExercise, ActiveSet } from '../../src/store/workoutStore';
import type { SetType } from '../../src/db/schema';
import type { PrResult } from '../../src/services/prEngine';

// ─── Rest Timer Component ─────────────────────────────────────────────────────

function RestTimerBar() {
  const { isRunning, isPaused, remainingSeconds, totalSeconds, pauseTimer, resumeTimer, skipTimer, adjustTimer, exerciseName } =
    useTimerStore();

  if (!isRunning && !isPaused && remainingSeconds === 0) return null;

  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;

  return (
    <View className="mx-4 mb-3 bg-card border border-accent/40 rounded-2xl overflow-hidden shadow-lg">
      {/* Progress bar */}
      <View className="h-1 bg-border">
        <View className="h-1 bg-accent" style={{ width: `${Math.min(100, progress * 100)}%` }} />
      </View>

      <View className="flex-row items-center px-4 py-3 gap-3">
        <Timer size={18} color="#F97316" />
        <View className="flex-1">
          <Text className="text-accent font-bold text-xl tabular-nums">
            {formatDuration(remainingSeconds)}
          </Text>
          {exerciseName && (
            <Text className="text-text-muted text-xs font-medium" numberOfLines={1}>
              Rest after {exerciseName}
            </Text>
          )}
        </View>

        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => adjustTimer(-10)}
            className="w-8 h-8 rounded-full bg-surface items-center justify-center active:opacity-60"
          >
            <Text className="text-text-secondary text-xs font-bold">-10</Text>
          </Pressable>
          <Pressable
            onPress={() => adjustTimer(10)}
            className="w-8 h-8 rounded-full bg-surface items-center justify-center active:opacity-60"
          >
            <Text className="text-text-secondary text-xs font-bold">+10</Text>
          </Pressable>
          <Pressable
            onPress={isPaused ? resumeTimer : pauseTimer}
            className="w-8 h-8 rounded-full bg-surface items-center justify-center active:opacity-60"
          >
            <Text className="text-text-primary text-xs font-bold">{isPaused ? '▶' : '⏸'}</Text>
          </Pressable>
          <Pressable
            onPress={skipTimer}
            className="w-8 h-8 rounded-full bg-surface items-center justify-center active:opacity-60"
          >
            <X size={14} color="#71717A" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── PR Badge ─────────────────────────────────────────────────────────────────

function PrBadge({ pr, onDismiss }: { pr: PrResult; onDismiss: () => void }) {
  return (
    <Animated.View entering={SlideInUp.springify().damping(14)} exiting={SlideOutUp.duration(200)}>
      <Pressable
        onPress={onDismiss}
        className="mx-4 mb-3 bg-amber-500/15 border border-amber-500/35 rounded-2xl px-4 py-3 flex-row items-center gap-3"
      >
        <Trophy size={20} color="#F59E0B" />
        <View className="flex-1">
          <Text className="text-amber-500 font-bold text-sm">🏆 Personal Record Broken!</Text>
          <Text className="text-text-secondary text-xs">{pr.description}</Text>
        </View>
        <X size={16} color="#71717A" />
      </Pressable>
    </Animated.View>
  );
}

// ─── Set Row Component ─────────────────────────────────────────────────────────

interface SetRowProps {
  set: ActiveSet;
  index: number;
  previousSets: { weight: number | null; reps: number | null }[];
  exerciseType: string;
  onWeightChange: (val: string) => void;
  onRepsChange: (val: string) => void;
  onComplete: () => void;
  onDelete: () => void;
  onAdjustWeight: (delta: number) => void;
  onAdjustReps: (delta: number) => void;
  onToggleSetType: () => void;
}

function SetRow({
  set,
  index,
  previousSets,
  exerciseType,
  onWeightChange,
  onRepsChange,
  onComplete,
  onDelete,
  onAdjustWeight,
  onAdjustReps,
  onToggleSetType,
}: SetRowProps) {
  const prev = previousSets[index];
  const checkScale = useSharedValue(1);
  const rowBg = useSharedValue(0);

  const animatedCheckStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const animatedRowStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(34, 197, 94, ${rowBg.value * 0.12})`,
  }));

  const handleComplete = () => {
    checkScale.value = withSequence(
      withSpring(0.7, { damping: 8 }),
      withSpring(1.25, { damping: 6 }),
      withSpring(1, { damping: 10 }),
    );
    rowBg.value = withSequence(
      withTiming(1, { duration: 80 }),
      withTiming(0, { duration: 600 }),
    );
    onComplete();
  };

  // Set type badge styling
  const getSetBadge = () => {
    switch (set.setType) {
      case 'warmup':
        return { label: 'W', color: 'text-amber-500', bg: 'bg-amber-500/15 border-amber-500/30' };
      case 'drop':
        return { label: 'D', color: 'text-purple-400', bg: 'bg-purple-500/15 border-purple-500/30' };
      case 'failure':
        return { label: 'F', color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' };
      default:
        return { label: `${index + 1}`, color: 'text-text-secondary', bg: 'bg-surface border-border' };
    }
  };

  const badge = getSetBadge();

  return (
    <Animated.View
      style={animatedRowStyle}
      className={`flex-row items-center gap-2 px-3.5 py-2.5 rounded-xl mb-1.5 ${
        set.isCompleted
          ? 'bg-emerald-500/10 border border-emerald-500/25'
          : 'bg-surface border border-border'
      }`}
    >
      {/* Set type badge (Tap to cycle type) */}
      <Pressable
        onPress={onToggleSetType}
        onLongPress={onDelete}
        className={`w-7 h-7 rounded-lg items-center justify-center border active:opacity-60 ${badge.bg}`}
      >
        <Text className={`text-xs font-bold ${badge.color}`}>{badge.label}</Text>
      </Pressable>

      {/* Previous performance */}
      <View className="w-16 items-center">
        {prev?.weight && prev?.reps ? (
          <Text className="text-text-muted text-xs text-center" numberOfLines={1}>
            {prev.weight}×{prev.reps}
          </Text>
        ) : (
          <Text className="text-text-muted text-xs">—</Text>
        )}
      </View>

      {/* Weight input */}
      {exerciseType !== 'bodyweight' && exerciseType !== 'duration' && (
        <View className="flex-1 flex-row items-center gap-1">
          <Pressable onPress={() => onAdjustWeight(-2.5)} className="w-6 h-6 items-center justify-center active:opacity-60">
            <Minus size={12} color="#71717A" />
          </Pressable>
          <TextInput
            className="flex-1 text-center text-text-primary font-bold text-base bg-transparent p-0"
            placeholder={prev?.weight?.toString() ?? '0'}
            placeholderTextColor="#52525B"
            keyboardType="decimal-pad"
            value={set.weight !== null && set.weight !== undefined ? set.weight.toString() : ''}
            onChangeText={onWeightChange}
            editable={!set.isCompleted}
          />
          <Pressable onPress={() => onAdjustWeight(2.5)} className="w-6 h-6 items-center justify-center active:opacity-60">
            <Plus size={12} color="#71717A" />
          </Pressable>
        </View>
      )}

      {/* Reps / Duration input */}
      <View className="flex-1 flex-row items-center gap-1">
        <Pressable onPress={() => onAdjustReps(-1)} className="w-6 h-6 items-center justify-center active:opacity-60">
          <Minus size={12} color="#71717A" />
        </Pressable>
        <TextInput
          className="flex-1 text-center text-text-primary font-bold text-base bg-transparent p-0"
          placeholder={prev?.reps?.toString() ?? (exerciseType === 'duration' ? '30s' : '0')}
          placeholderTextColor="#52525B"
          keyboardType="number-pad"
          value={set.reps !== null && set.reps !== undefined ? set.reps.toString() : ''}
          onChangeText={onRepsChange}
          editable={!set.isCompleted}
        />
        <Pressable onPress={() => onAdjustReps(1)} className="w-6 h-6 items-center justify-center active:opacity-60">
          <Plus size={12} color="#71717A" />
        </Pressable>
      </View>

      {/* Complete / Undo button */}
      <Pressable
        onPress={handleComplete}
        className={`w-9 h-9 rounded-full items-center justify-center active:opacity-75 ${
          set.isCompleted ? 'bg-emerald-500' : 'bg-surface border border-border'
        }`}
      >
        <Animated.View style={animatedCheckStyle}>
          <Check size={18} color={set.isCompleted ? '#FFFFFF' : '#52525B'} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Exercise Card ─────────────────────────────────────────────────────────────

interface ExerciseCardProps {
  exercise: ActiveExercise;
  previousSets: { weight: number | null; reps: number | null }[];
  onAddSet: () => void;
  onCompleteSet: (setId: string) => void;
  onUpdateWeight: (setId: string, val: string) => void;
  onUpdateReps: (setId: string, val: string) => void;
  onAdjustWeight: (setId: string, delta: number) => void;
  onAdjustReps: (setId: string, delta: number) => void;
  onDeleteSet: (setId: string) => void;
  onToggleSetType: (setId: string) => void;
  onOpenPlateCalc: (weight: number) => void;
  onOpenExerciseMenu: () => void;
}

function ExerciseCard({
  exercise,
  previousSets,
  onAddSet,
  onCompleteSet,
  onUpdateWeight,
  onUpdateReps,
  onAdjustWeight,
  onAdjustReps,
  onDeleteSet,
  onToggleSetType,
  onOpenPlateCalc,
  onOpenExerciseMenu,
}: ExerciseCardProps) {
  const MUSCLE_COLORS: Record<string, string> = {
    chest: '#F97316',
    back: '#3B82F6',
    shoulders: '#8B5CF6',
    biceps: '#06B6D4',
    triceps: '#10B981',
    legs: '#F59E0B',
    core: '#EC4899',
    glutes: '#84CC16',
  };
  const muscleColor = MUSCLE_COLORS[exercise.primaryMuscle] ?? '#F97316';

  const currentTopWeight =
    exercise.sets.find((s) => (s.weight ?? 0) > 0)?.weight ??
    previousSets[0]?.weight ??
    60;

  return (
    <View className="mx-4 mb-4 bg-card border border-border rounded-2xl overflow-hidden">
      {/* Superset indicator banner */}
      {exercise.supersetGroupId && (
        <View className="bg-purple-500/15 border-b border-purple-500/25 px-4 py-1.5 flex-row items-center gap-2">
          <Layers size={13} color="#C084FC" />
          <Text className="text-purple-300 text-2xs font-bold tracking-wider uppercase">
            Superset {exercise.supersetGroupId}
          </Text>
        </View>
      )}

      {/* Header */}
      <View className="px-4 py-3 flex-row items-center gap-3">
        <View className="flex-1">
          <Text className="text-text-primary font-bold text-lg">{exercise.exerciseName}</Text>
          <View className="flex-row items-center gap-2 mt-0.5">
            <Text style={{ color: muscleColor }} className="text-xs font-semibold capitalize">
              {exercise.primaryMuscle.replace(/_/g, ' ')}
            </Text>
            <Text className="text-text-muted text-xs">·</Text>
            <Text className="text-text-muted text-xs">
              Rest {Math.floor(exercise.restSeconds / 60)}:{String(exercise.restSeconds % 60).padStart(2, '0')}
            </Text>
          </View>
        </View>

        {/* Plate Calculator Button */}
        {exercise.exerciseType !== 'bodyweight' && exercise.exerciseType !== 'duration' && (
          <Pressable
            onPress={() => onOpenPlateCalc(currentTopWeight)}
            className="flex-row items-center gap-1 bg-surface border border-border rounded-lg px-2.5 py-1.5 active:opacity-60"
          >
            <Disc size={13} color="#F97316" />
            <Text className="text-text-secondary text-2xs font-semibold">Plates</Text>
          </Pressable>
        )}

        {/* Exercise Context Menu Button */}
        <Pressable
          onPress={onOpenExerciseMenu}
          className="w-8 h-8 rounded-lg bg-surface border border-border items-center justify-center active:opacity-60"
        >
          <MoreVertical size={16} color="#A1A1AA" />
        </Pressable>
      </View>

      {/* 📌 Pinned Note Banner */}
      {exercise.pinnedNote && (
        <View className="mx-4 mb-2.5 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2 flex-row items-center gap-2">
          <Pin size={13} color="#F59E0B" />
          <Text className="text-amber-400 text-xs flex-1 font-medium leading-4">
            {exercise.pinnedNote}
          </Text>
        </View>
      )}

      {/* Exercise Instance Note Banner */}
      {exercise.notes && (
        <View className="mx-4 mb-2.5 bg-surface border border-border rounded-xl px-3 py-2 flex-row items-center gap-2">
          <FileText size={13} color="#A1A1AA" />
          <Text className="text-text-secondary text-xs flex-1 italic leading-4">
            {exercise.notes}
          </Text>
        </View>
      )}

      {/* Column headers */}
      <View className="flex-row items-center px-4 pb-1.5 pt-1">
        <View className="w-7">
          <Text className="text-text-muted text-xs text-center font-semibold">Set</Text>
        </View>
        <View className="w-16">
          <Text className="text-text-muted text-xs text-center font-semibold">Prev</Text>
        </View>
        {exercise.exerciseType !== 'bodyweight' && exercise.exerciseType !== 'duration' && (
          <View className="flex-1">
            <Text className="text-text-muted text-xs text-center font-semibold">kg</Text>
          </View>
        )}
        <View className="flex-1">
          <Text className="text-text-muted text-xs text-center font-semibold">
            {exercise.exerciseType === 'duration' ? 'Time' : 'Reps'}
          </Text>
        </View>
        <View className="w-9" />
      </View>

      {/* Sets */}
      <View className="px-3">
        {exercise.sets.map((set, i) => (
          <SetRow
            key={set.id}
            set={set}
            index={i}
            previousSets={previousSets}
            exerciseType={exercise.exerciseType}
            onWeightChange={(v) => onUpdateWeight(set.id, v)}
            onRepsChange={(v) => onUpdateReps(set.id, v)}
            onComplete={() => onCompleteSet(set.id)}
            onDelete={() => onDeleteSet(set.id)}
            onAdjustWeight={(delta) => onAdjustWeight(set.id, delta)}
            onAdjustReps={(delta) => onAdjustReps(set.id, delta)}
            onToggleSetType={() => onToggleSetType(set.id)}
          />
        ))}
      </View>

      {/* Add set button */}
      <Pressable
        onPress={onAddSet}
        className="mx-4 mb-4 mt-2 border border-dashed border-border rounded-xl py-2.5 flex-row items-center justify-center gap-2 active:opacity-70"
      >
        <Plus size={15} color="#71717A" />
        <Text className="text-text-tertiary text-sm font-medium">Add Set</Text>
      </Pressable>
    </View>
  );
}

// ─── Main Active Workout Screen ───────────────────────────────────────────────

export default function ActiveWorkoutScreen() {
  const params = useLocalSearchParams<{
    empty?: string;
    routineId?: string;
    routineName?: string;
    repeatWorkoutId?: string;
  }>();

  const { startTimer } = useTimerStore();
  const store = useWorkoutStore();
  const isStartingRef = useRef(false);
  const [isStarting, setIsStarting] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [previousPerformances, setPreviousPerformances] = useState<
    Record<string, { weight: number | null; reps: number | null }[]>
  >({});
  const [visiblePr, setVisiblePr] = useState<PrResult | null>(null);
  const [plateCalcWeight, setPlateCalcWeight] = useState<number | null>(null);

  // Modals & Menus State
  const [showWorkoutMenu, setShowWorkoutMenu] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [tempWorkoutName, setTempWorkoutName] = useState('');
  const [showWorkoutNoteModal, setShowWorkoutNoteModal] = useState(false);
  const [tempWorkoutNote, setTempWorkoutNote] = useState('');

  // Exercise Menu state
  const [selectedExercise, setSelectedExercise] = useState<ActiveExercise | null>(null);
  const [showExerciseMenu, setShowExerciseMenu] = useState(false);
  const [showExerciseNoteModal, setShowExerciseNoteModal] = useState(false);
  const [tempExerciseNote, setTempExerciseNote] = useState('');
  const [showPinnedNoteModal, setShowPinnedNoteModal] = useState(false);
  const [tempPinnedNote, setTempPinnedNote] = useState('');
  const [showRestTimeModal, setShowRestTimeModal] = useState(false);

  // Elapsed workout timer — accurate epoch calculation
  useEffect(() => {
    const getElapsed = () => {
      const s = useWorkoutStore.getState().startedAt;
      if (!s) return 0;
      return Math.floor((Date.now() - new Date(s).getTime()) / 1000);
    };
    setElapsedSeconds(getElapsed());
    const id = setInterval(() => setElapsedSeconds(getElapsed()), 1000);
    return () => clearInterval(id);
  }, []);

  // Initialize workout
  useEffect(() => {
    if (store.isActive || isStartingRef.current) return;
    isStartingRef.current = true;
    setIsStarting(true);

    async function init() {
      try {
        const name = params.routineName
          ? decodeURIComponent(params.routineName)
          : 'Workout';

        await store.startWorkout(name, params.routineId);

        if (params.routineId) {
          const routineExs = await getRoutineExercises(params.routineId);
          for (const { re, exercise } of routineExs) {
            if (!exercise) continue;
            await store.addExercise({
              exerciseId: exercise.id,
              exerciseName: exercise.name,
              primaryMuscle: exercise.primaryMuscle,
              equipment: exercise.equipment,
              exerciseType: exercise.exerciseType,
              defaultSets: re.defaultSets,
              restSeconds: re.restSeconds ?? 120,
              pinnedNote: exercise.pinnedNote,
            });
          }
        } else if (params.repeatWorkoutId) {
          const workoutExs = await getWorkoutExercisesWithDetails(params.repeatWorkoutId);
          for (const { we, exercise } of workoutExs) {
            if (!exercise) continue;
            const prevSets = await getSetsForWorkoutExercise(we.id);
            const completedSets = prevSets.filter((s) => s.isCompleted);
            const count = completedSets.length > 0 ? completedSets.length : 3;

            await store.addExercise({
              exerciseId: exercise.id,
              exerciseName: exercise.name,
              primaryMuscle: exercise.primaryMuscle,
              equipment: exercise.equipment,
              exerciseType: exercise.exerciseType,
              defaultSets: count,
              restSeconds: we.restSeconds ?? 120,
              pinnedNote: exercise.pinnedNote,
            });

            const currentExercises = useWorkoutStore.getState().exercises;
            const addedEx = currentExercises[currentExercises.length - 1];
            if (addedEx && completedSets.length > 0) {
              for (let i = 0; i < addedEx.sets.length; i++) {
                const targetSet = addedEx.sets[i];
                const srcSet = completedSets[i] ?? completedSets[completedSets.length - 1];
                if (targetSet && srcSet) {
                  if (srcSet.weight !== null && srcSet.weight !== undefined) {
                    store.updateSetField(addedEx.workoutExerciseId, targetSet.id, 'weight', srcSet.weight);
                  }
                  if (srcSet.reps !== null && srcSet.reps !== undefined) {
                    store.updateSetField(addedEx.workoutExerciseId, targetSet.id, 'reps', srcSet.reps);
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to init active workout:', err);
        isStartingRef.current = false;
      } finally {
        setIsStarting(false);
      }
    }
    init();
  }, []);

  // Load previous performances automatically from SQLite
  useEffect(() => {
    async function loadPrev() {
      const perf: Record<string, { weight: number | null; reps: number | null }[]> = {};
      for (const ex of store.exercises) {
        const last = await getLastPerformance(ex.exerciseId, store.workoutId ?? undefined);
        if (last) {
          perf[ex.exerciseId] = last.sets.map((s) => ({ weight: s.weight, reps: s.reps }));
        } else {
          perf[ex.exerciseId] = [];
        }
      }
      setPreviousPerformances(perf);
    }
    if (store.exercises.length > 0) loadPrev();
  }, [store.exercises.length]);

  const handleCompleteSet = useCallback(
    async (exerciseName: string, workoutExerciseId: string, setId: string, restSeconds: number) => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const prs = await store.completeSet(workoutExerciseId, setId);
      if (prs && prs.length > 0) {
        setVisiblePr(prs[0]!);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
      startTimer(restSeconds, exerciseName);
    },
    [store, startTimer],
  );

  const handleToggleSetType = (workoutExerciseId: string, set: ActiveSet) => {
    const types: SetType[] = ['normal', 'warmup', 'drop', 'failure'];
    const curIdx = types.indexOf(set.setType);
    const nextType = types[(curIdx + 1) % types.length]!;
    store.updateSetType(workoutExerciseId, set.id, nextType);
  };

  const handleFinish = () => {
    const uncompletedCount = store.exercises.reduce(
      (acc, ex) => acc + ex.sets.filter((s) => !s.isCompleted).length,
      0,
    );

    const message =
      uncompletedCount > 0
        ? `You have ${uncompletedCount} uncompleted set${uncompletedCount > 1 ? 's' : ''}. Complete workout anyway?`
        : 'Are you sure you want to finish this workout?';

    Alert.alert('Finish Workout?', message, [
      { text: 'Keep Going', style: 'cancel' },
      {
        text: 'Finish',
        onPress: async () => {
          const summary = await store.finishWorkout();
          router.replace(
            `/workout/summary?workoutId=${summary.workoutId}&duration=${summary.durationSeconds}&volume=${summary.totalVolume}&sets=${summary.totalSets}&reps=${summary.totalReps}&prs=${summary.prCount}`,
          );
        },
      },
    ]);
  };

  const handleDiscard = () => {
    Alert.alert('Discard Workout?', 'Your current progress will be permanently deleted.', [
      { text: 'Keep Logging', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          store.discardWorkout();
          router.back();
        },
      },
    ]);
  };

  const handleSaveAsTemplate = () => {
    setShowWorkoutMenu(false);
    if (Alert.prompt) {
      Alert.prompt('Save as Routine', 'Enter template name:', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (text?: string) => {
            if (text && text.trim()) {
              await store.saveAsTemplate(text.trim());
              Alert.alert('Saved', `Template "${text.trim()}" created successfully.`);
            }
          },
        },
      ]);
    } else {
      (async () => {
        const name = store.workoutName || 'New Routine';
        await store.saveAsTemplate(name);
        Alert.alert('Saved', `Template "${name}" created successfully.`);
      })();
    }
  };

  const handleUpdateTemplate = async () => {
    setShowWorkoutMenu(false);
    if (!store.routineId) return;
    await store.updateTemplate(store.routineId);
    Alert.alert('Updated', 'Routine template updated with current workout exercises.');
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top bar */}
        <View className="flex-row items-center px-4 py-3 border-b border-border bg-card">
          <Pressable
            onPress={() => router.back()}
            className="w-8 h-8 items-center justify-center active:opacity-60"
          >
            <ChevronDown size={22} color="#FFFFFF" />
          </Pressable>

          <Pressable
            onPress={() => {
              setTempWorkoutName(store.workoutName);
              setShowRenameModal(true);
            }}
            className="flex-1 items-center px-2"
          >
            <View className="flex-row items-center gap-1.5">
              <Text className="text-text-primary font-bold text-base" numberOfLines={1}>
                {store.workoutName}
              </Text>
              <Edit3 size={13} color="#71717A" />
            </View>
            <Text className="text-accent font-semibold text-xs tabular-nums mt-0.5">
              {formatDuration(elapsedSeconds)}
            </Text>
          </Pressable>

          {/* Workout Menu Button */}
          <Pressable
            onPress={() => setShowWorkoutMenu(true)}
            className="w-8 h-8 items-center justify-center active:opacity-60 mr-2"
          >
            <MoreVertical size={20} color="#FFFFFF" />
          </Pressable>

          <Pressable
            onPress={handleFinish}
            className="bg-accent px-4 py-1.5 rounded-full active:opacity-85 shadow-md"
          >
            <Text className="text-white font-bold text-sm">Finish</Text>
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Rest Timer */}
          <RestTimerBar />

          {/* PR Alert */}
          {visiblePr && (
            <PrBadge
              pr={visiblePr}
              onDismiss={() => {
                setVisiblePr(null);
                store.clearPrs();
              }}
            />
          )}

          {/* Workout-level note banner if set */}
          {store.workoutNotes && (
            <Pressable
              onPress={() => {
                setTempWorkoutNote(store.workoutNotes ?? '');
                setShowWorkoutNoteModal(true);
              }}
              className="mx-4 mb-3 bg-surface border border-border rounded-2xl p-3 flex-row items-center gap-2.5 active:opacity-80"
            >
              <FileText size={15} color="#F97316" />
              <Text className="text-text-secondary text-xs flex-1 italic leading-4">
                {store.workoutNotes}
              </Text>
            </Pressable>
          )}

          {/* Exercise list */}
          {store.exercises.map((exercise) => (
            <ExerciseCard
              key={exercise.workoutExerciseId}
              exercise={exercise}
              previousSets={previousPerformances[exercise.exerciseId] ?? []}
              onAddSet={() => store.addSet(exercise.workoutExerciseId)}
              onCompleteSet={(setId) =>
                handleCompleteSet(
                  exercise.exerciseName,
                  exercise.workoutExerciseId,
                  setId,
                  exercise.restSeconds,
                )
              }
              onUpdateWeight={(setId, v) => {
                const num = parseFloat(v);
                store.updateSetField(
                  exercise.workoutExerciseId,
                  setId,
                  'weight',
                  isNaN(num) ? null : num,
                );
              }}
              onUpdateReps={(setId, v) => {
                const num = parseInt(v, 10);
                store.updateSetField(
                  exercise.workoutExerciseId,
                  setId,
                  'reps',
                  isNaN(num) ? null : num,
                );
              }}
              onAdjustWeight={(setId, delta) => {
                const s = exercise.sets.find((set) => set.id === setId);
                const cur = s?.weight ?? 0;
                store.updateSetField(
                  exercise.workoutExerciseId,
                  setId,
                  'weight',
                  Math.max(0, cur + delta),
                );
              }}
              onAdjustReps={(setId, delta) => {
                const s = exercise.sets.find((set) => set.id === setId);
                const cur = s?.reps ?? 0;
                store.updateSetField(
                  exercise.workoutExerciseId,
                  setId,
                  'reps',
                  Math.max(0, cur + delta),
                );
              }}
              onDeleteSet={(setId) => store.deleteSet(exercise.workoutExerciseId, setId)}
              onToggleSetType={(setId) => {
                const s = exercise.sets.find((set) => set.id === setId);
                if (s) handleToggleSetType(exercise.workoutExerciseId, s);
              }}
              onOpenPlateCalc={(w) => setPlateCalcWeight(w)}
              onOpenExerciseMenu={() => {
                setSelectedExercise(exercise);
                setShowExerciseMenu(true);
              }}
            />
          ))}

          {/* Add Exercise button */}
          <Pressable
            onPress={() => router.push('/exercise/picker')}
            className="mx-4 border border-dashed border-border rounded-2xl py-4 flex-row items-center justify-center gap-2 active:opacity-70 bg-card/30"
          >
            <Dumbbell size={18} color="#F97316" />
            <Text className="text-accent font-semibold text-base">Add Exercise</Text>
          </Pressable>

          {/* Discard Workout button at bottom */}
          <Pressable
            onPress={handleDiscard}
            className="mx-4 mt-6 py-3 items-center justify-center active:opacity-60"
          >
            <Text className="text-red-400 font-semibold text-sm">Cancel Workout</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ─── Workout Menu Modal ─── */}
      <Modal visible={showWorkoutMenu} transparent animationType="fade">
        <Pressable
          onPress={() => setShowWorkoutMenu(false)}
          className="flex-1 bg-black/60 justify-end"
        >
          <View className="bg-card border-t border-border rounded-t-3xl p-5 pb-8">
            <View className="w-12 h-1 bg-border rounded-full self-center mb-4" />
            <Text className="text-text-primary font-bold text-lg mb-4">Workout Options</Text>

            <Pressable
              onPress={() => {
                setShowWorkoutMenu(false);
                router.push('/exercise/picker');
              }}
              className="flex-row items-center gap-3 py-3.5 border-b border-border/60 active:opacity-70"
            >
              <Dumbbell size={18} color="#F97316" />
              <Text className="text-text-primary text-base font-medium">Add Exercise</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setShowWorkoutMenu(false);
                setTempWorkoutNote(store.workoutNotes ?? '');
                setShowWorkoutNoteModal(true);
              }}
              className="flex-row items-center gap-3 py-3.5 border-b border-border/60 active:opacity-70"
            >
              <FileText size={18} color="#3B82F6" />
              <Text className="text-text-primary text-base font-medium">Workout Note</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setShowWorkoutMenu(false);
                setTempWorkoutName(store.workoutName);
                setShowRenameModal(true);
              }}
              className="flex-row items-center gap-3 py-3.5 border-b border-border/60 active:opacity-70"
            >
              <Edit3 size={18} color="#8B5CF6" />
              <Text className="text-text-primary text-base font-medium">Rename Workout</Text>
            </Pressable>

            <Pressable
              onPress={handleSaveAsTemplate}
              className="flex-row items-center gap-3 py-3.5 border-b border-border/60 active:opacity-70"
            >
              <Sparkles size={18} color="#F59E0B" />
              <Text className="text-text-primary text-base font-medium">Save as Routine</Text>
            </Pressable>

            {store.routineId && (
              <Pressable
                onPress={handleUpdateTemplate}
                className="flex-row items-center gap-3 py-3.5 border-b border-border/60 active:opacity-70"
              >
                <RefreshCw size={18} color="#10B981" />
                <Text className="text-text-primary text-base font-medium">Update Routine Template</Text>
              </Pressable>
            )}

            <Pressable
              onPress={() => {
                setShowWorkoutMenu(false);
                handleDiscard();
              }}
              className="flex-row items-center gap-3 py-3.5 active:opacity-70"
            >
              <Trash2 size={18} color="#EF4444" />
              <Text className="text-red-400 text-base font-medium">Cancel / Discard Workout</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* ─── Exercise Context Menu Modal ─── */}
      <Modal visible={showExerciseMenu} transparent animationType="fade">
        <Pressable
          onPress={() => setShowExerciseMenu(false)}
          className="flex-1 bg-black/60 justify-end"
        >
          <View className="bg-card border-t border-border rounded-t-3xl p-5 pb-8 max-h-[85%]">
            <View className="w-12 h-1 bg-border rounded-full self-center mb-3" />
            <Text className="text-text-primary font-bold text-lg mb-4">
              {selectedExercise?.exerciseName}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Add Note */}
              <Pressable
                onPress={() => {
                  setShowExerciseMenu(false);
                  setTempExerciseNote(selectedExercise?.notes ?? '');
                  setShowExerciseNoteModal(true);
                }}
                className="flex-row items-center gap-3 py-3.5 border-b border-border/60 active:opacity-70"
              >
                <FileText size={18} color="#3B82F6" />
                <Text className="text-text-primary text-base font-medium">Add / Edit Note</Text>
              </Pressable>

              {/* 📌 Pinned Note */}
              <Pressable
                onPress={() => {
                  setShowExerciseMenu(false);
                  setTempPinnedNote(selectedExercise?.pinnedNote ?? '');
                  setShowPinnedNoteModal(true);
                }}
                className="flex-row items-center gap-3 py-3.5 border-b border-border/60 active:opacity-70"
              >
                <Pin size={18} color="#F59E0B" />
                <Text className="text-text-primary text-base font-medium">
                  {selectedExercise?.pinnedNote ? 'Edit Pinned Reminder 📌' : 'Add Pinned Reminder 📌'}
                </Text>
              </Pressable>

              {/* Add Warm-up Sets */}
              <Pressable
                onPress={() => {
                  if (selectedExercise) store.addWarmupSets(selectedExercise.workoutExerciseId, 2);
                  setShowExerciseMenu(false);
                }}
                className="flex-row items-center gap-3 py-3.5 border-b border-border/60 active:opacity-70"
              >
                <Sparkles size={18} color="#F97316" />
                <Text className="text-text-primary text-base font-medium">Add Warm-up Sets</Text>
              </Pressable>

              {/* Rest Timer Config */}
              <Pressable
                onPress={() => {
                  setShowExerciseMenu(false);
                  setShowRestTimeModal(true);
                }}
                className="flex-row items-center gap-3 py-3.5 border-b border-border/60 active:opacity-70"
              >
                <Clock size={18} color="#10B981" />
                <Text className="text-text-primary text-base font-medium">
                  Rest Timer ({Math.floor((selectedExercise?.restSeconds ?? 120) / 60)}:
                  {String((selectedExercise?.restSeconds ?? 120) % 60).padStart(2, '0')})
                </Text>
              </Pressable>

              {/* Replace Exercise */}
              <Pressable
                onPress={() => {
                  setShowExerciseMenu(false);
                  router.push(
                    `/exercise/picker?replaceWorkoutExerciseId=${selectedExercise?.workoutExerciseId}`,
                  );
                }}
                className="flex-row items-center gap-3 py-3.5 border-b border-border/60 active:opacity-70"
              >
                <RefreshCw size={18} color="#8B5CF6" />
                <Text className="text-text-primary text-base font-medium">Replace Exercise</Text>
              </Pressable>

              {/* Superset Toggle */}
              <Pressable
                onPress={() => {
                  if (selectedExercise) {
                    const nextGroup = selectedExercise.supersetGroupId ? null : 'A';
                    store.toggleSuperset(selectedExercise.workoutExerciseId, nextGroup);
                  }
                  setShowExerciseMenu(false);
                }}
                className="flex-row items-center gap-3 py-3.5 border-b border-border/60 active:opacity-70"
              >
                <Layers size={18} color="#C084FC" />
                <Text className="text-text-primary text-base font-medium">
                  {selectedExercise?.supersetGroupId ? 'Remove from Superset' : 'Group as Superset'}
                </Text>
              </Pressable>

              {/* Exercise Detail & History */}
              <Pressable
                onPress={() => {
                  setShowExerciseMenu(false);
                  if (selectedExercise) router.push(`/exercise/${selectedExercise.exerciseId}`);
                }}
                className="flex-row items-center gap-3 py-3.5 border-b border-border/60 active:opacity-70"
              >
                <Info size={18} color="#38BDF8" />
                <Text className="text-text-primary text-base font-medium">Exercise History & Records</Text>
              </Pressable>

              {/* Move Up */}
              <Pressable
                onPress={() => {
                  if (selectedExercise) store.reorderExercise(selectedExercise.workoutExerciseId, 'up');
                  setShowExerciseMenu(false);
                }}
                className="flex-row items-center gap-3 py-3.5 border-b border-border/60 active:opacity-70"
              >
                <ArrowUpDown size={18} color="#A1A1AA" />
                <Text className="text-text-primary text-base font-medium">Move Exercise Up</Text>
              </Pressable>

              {/* Move Down */}
              <Pressable
                onPress={() => {
                  if (selectedExercise) store.reorderExercise(selectedExercise.workoutExerciseId, 'down');
                  setShowExerciseMenu(false);
                }}
                className="flex-row items-center gap-3 py-3.5 border-b border-border/60 active:opacity-70"
              >
                <ArrowUpDown size={18} color="#A1A1AA" />
                <Text className="text-text-primary text-base font-medium">Move Exercise Down</Text>
              </Pressable>

              {/* Remove Exercise */}
              <Pressable
                onPress={() => {
                  setShowExerciseMenu(false);
                  if (selectedExercise) {
                    Alert.alert(
                      'Remove Exercise?',
                      `Remove ${selectedExercise.exerciseName} from this workout?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Remove',
                          style: 'destructive',
                          onPress: () => store.removeExercise(selectedExercise.workoutExerciseId),
                        },
                      ],
                    );
                  }
                }}
                className="flex-row items-center gap-3 py-3.5 active:opacity-70"
              >
                <Trash2 size={18} color="#EF4444" />
                <Text className="text-red-400 text-base font-medium">Remove Exercise</Text>
              </Pressable>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* ─── Rename Workout Modal ─── */}
      <Modal visible={showRenameModal} transparent animationType="fade">
        <View className="flex-1 bg-black/70 justify-center px-6">
          <View className="bg-card border border-border rounded-2xl p-5">
            <Text className="text-text-primary font-bold text-lg mb-3">Rename Workout</Text>
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 py-3 text-text-primary text-base mb-4"
              value={tempWorkoutName}
              onChangeText={setTempWorkoutName}
              placeholder="Workout name"
              placeholderTextColor="#71717A"
              autoFocus
            />
            <View className="flex-row justify-end gap-3">
              <Pressable
                onPress={() => setShowRenameModal(false)}
                className="px-4 py-2 rounded-xl active:opacity-70"
              >
                <Text className="text-text-secondary font-medium">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (tempWorkoutName.trim()) store.updateWorkoutName(tempWorkoutName.trim());
                  setShowRenameModal(false);
                }}
                className="bg-accent px-5 py-2 rounded-xl active:opacity-85"
              >
                <Text className="text-white font-bold">Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Workout Note Modal ─── */}
      <Modal visible={showWorkoutNoteModal} transparent animationType="fade">
        <View className="flex-1 bg-black/70 justify-center px-6">
          <View className="bg-card border border-border rounded-2xl p-5">
            <Text className="text-text-primary font-bold text-lg mb-3">Workout Note</Text>
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 py-3 text-text-primary text-base mb-4 min-h-[90px]"
              value={tempWorkoutNote}
              onChangeText={setTempWorkoutNote}
              placeholder="e.g. Felt great, focused on slow tempo..."
              placeholderTextColor="#71717A"
              multiline
              autoFocus
            />
            <View className="flex-row justify-end gap-3">
              <Pressable
                onPress={() => setShowWorkoutNoteModal(false)}
                className="px-4 py-2 rounded-xl active:opacity-70"
              >
                <Text className="text-text-secondary font-medium">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  store.updateWorkoutNotes(tempWorkoutNote.trim() || null);
                  setShowWorkoutNoteModal(false);
                }}
                className="bg-accent px-5 py-2 rounded-xl active:opacity-85"
              >
                <Text className="text-white font-bold">Save Note</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Exercise Note Modal ─── */}
      <Modal visible={showExerciseNoteModal} transparent animationType="fade">
        <View className="flex-1 bg-black/70 justify-center px-6">
          <View className="bg-card border border-border rounded-2xl p-5">
            <Text className="text-text-primary font-bold text-lg mb-1">
              {selectedExercise?.exerciseName} Note
            </Text>
            <Text className="text-text-muted text-xs mb-3">
              This note is saved for this workout instance.
            </Text>
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 py-3 text-text-primary text-base mb-4 min-h-[90px]"
              value={tempExerciseNote}
              onChangeText={setTempExerciseNote}
              placeholder="e.g. Grip width slightly wider today"
              placeholderTextColor="#71717A"
              multiline
              autoFocus
            />
            <View className="flex-row justify-end gap-3">
              <Pressable
                onPress={() => setShowExerciseNoteModal(false)}
                className="px-4 py-2 rounded-xl active:opacity-70"
              >
                <Text className="text-text-secondary font-medium">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (selectedExercise) {
                    store.updateExerciseNotes(
                      selectedExercise.workoutExerciseId,
                      tempExerciseNote.trim() || null,
                    );
                  }
                  setShowExerciseNoteModal(false);
                }}
                className="bg-accent px-5 py-2 rounded-xl active:opacity-85"
              >
                <Text className="text-white font-bold">Save Note</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Pinned Note Modal ─── */}
      <Modal visible={showPinnedNoteModal} transparent animationType="fade">
        <View className="flex-1 bg-black/70 justify-center px-6">
          <View className="bg-card border border-border rounded-2xl p-5">
            <View className="flex-row items-center gap-2 mb-1">
              <Pin size={16} color="#F59E0B" />
              <Text className="text-text-primary font-bold text-lg">
                Pinned Exercise Reminder
              </Text>
            </View>
            <Text className="text-text-muted text-xs mb-3">
              This note belongs to {selectedExercise?.exerciseName} and appears whenever you perform it.
            </Text>
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 py-3 text-text-primary text-base mb-4 min-h-[80px]"
              value={tempPinnedNote}
              onChangeText={setTempPinnedNote}
              placeholder="e.g. Pin 4 on incline bench, keep elbows tucked"
              placeholderTextColor="#71717A"
              multiline
              autoFocus
            />
            <View className="flex-row justify-end gap-3">
              <Pressable
                onPress={() => setShowPinnedNoteModal(false)}
                className="px-4 py-2 rounded-xl active:opacity-70"
              >
                <Text className="text-text-secondary font-medium">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (selectedExercise) {
                    store.updatePinnedNote(
                      selectedExercise.exerciseId,
                      tempPinnedNote.trim() || null,
                    );
                  }
                  setShowPinnedNoteModal(false);
                }}
                className="bg-amber-500 px-5 py-2 rounded-xl active:opacity-85"
              >
                <Text className="text-black font-bold">Save Pinned Note</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Rest Timer Duration Picker Modal ─── */}
      <Modal visible={showRestTimeModal} transparent animationType="fade">
        <Pressable
          onPress={() => setShowRestTimeModal(false)}
          className="flex-1 bg-black/60 justify-end"
        >
          <View className="bg-card border-t border-border rounded-t-3xl p-5 pb-8">
            <View className="w-12 h-1 bg-border rounded-full self-center mb-3" />
            <Text className="text-text-primary font-bold text-lg mb-4">
              Rest Timer Duration for {selectedExercise?.exerciseName}
            </Text>
            <View className="flex-row flex-wrap gap-3 mb-4">
              {[30, 45, 60, 90, 120, 150, 180, 240, 300].map((secs) => (
                <Pressable
                  key={secs}
                  onPress={() => {
                    if (selectedExercise) {
                      store.updateExerciseRestSeconds(selectedExercise.workoutExerciseId, secs);
                    }
                    setShowRestTimeModal(false);
                  }}
                  className={`px-4 py-3 rounded-xl border ${
                    selectedExercise?.restSeconds === secs
                      ? 'bg-accent border-accent'
                      : 'bg-surface border-border'
                  }`}
                >
                  <Text
                    className={`font-bold text-sm ${
                      selectedExercise?.restSeconds === secs ? 'text-white' : 'text-text-primary'
                    }`}
                  >
                    {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Plate Calculator Modal */}
      <PlateCalculatorModal
        visible={plateCalcWeight !== null}
        onClose={() => setPlateCalcWeight(null)}
        initialWeight={plateCalcWeight ?? 60}
      />
    </SafeAreaView>
  );
}
