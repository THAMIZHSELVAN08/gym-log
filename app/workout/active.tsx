import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  X,
  Plus,
  Check,
  ChevronDown,
  ChevronUp,
  Timer,
  Trophy,
  Dumbbell,
  Minus,
  Disc,
  Lightbulb,
} from 'lucide-react-native';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useTimerStore } from '../../src/store/timerStore';
import { getRoutineExercises } from '../../src/db/queries/routines';
import {
  getLastPerformance,
  getWorkoutExercisesWithDetails,
  getSetsForWorkoutExercise,
} from '../../src/db/queries/workouts';
import { formatDuration, getProgressionSuggestion } from '../../src/utils/calculations';
import { PlateCalculatorModal } from '../../src/components/tools/PlateCalculatorModal';
import type { ActiveExercise, ActiveSet } from '../../src/store/workoutStore';
import type { PrResult } from '../../src/services/prEngine';

// ─── Rest Timer Component ─────────────────────────────────────────────────────

function RestTimerBar() {
  const { isRunning, remainingSeconds, totalSeconds, pauseTimer, resumeTimer, skipTimer, adjustTimer } =
    useTimerStore();

  if (!isRunning && remainingSeconds === 0) return null;

  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;

  return (
    <View className="mx-4 mb-3 bg-card border border-border rounded-2xl overflow-hidden">
      {/* Progress bar */}
      <View className="h-1 bg-border">
        <View className="h-1 bg-accent" style={{ width: `${progress * 100}%` }} />
      </View>

      <View className="flex-row items-center px-4 py-3 gap-3">
        <Timer size={16} color="#F97316" />
        <Text className="text-accent font-bold text-xl flex-1 tabular-nums">
          {formatDuration(remainingSeconds)}
        </Text>

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
            onPress={isRunning ? pauseTimer : resumeTimer}
            className="w-8 h-8 rounded-full bg-surface items-center justify-center active:opacity-60"
          >
            <Text className="text-text-primary text-xs font-bold">{isRunning ? '⏸' : '▶'}</Text>
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
    <Pressable
      onPress={onDismiss}
      className="mx-4 mb-3 bg-pr/15 border border-pr/30 rounded-2xl px-4 py-3 flex-row items-center gap-3"
    >
      <Trophy size={20} color="#F59E0B" />
      <View className="flex-1">
        <Text className="text-pr font-bold text-sm">🏆 New Personal Record!</Text>
        <Text className="text-text-secondary text-xs">{pr.description}</Text>
      </View>
      <X size={16} color="#71717A" />
    </Pressable>
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
}: SetRowProps) {
  const prev = previousSets[index];

  return (
    <View
      className={`flex-row items-center gap-2 px-4 py-2.5 rounded-xl mb-1.5 ${
        set.isCompleted
          ? 'bg-success/10 border border-success/20'
          : 'bg-surface border border-border'
      }`}
    >
      {/* Set number */}
      <View className="w-8 items-center">
        {set.isPr ? (
          <Trophy size={14} color="#F59E0B" />
        ) : (
          <Text className="text-text-tertiary text-sm font-semibold">{index + 1}</Text>
        )}
      </View>

      {/* Previous */}
      <View className="w-16 items-center">
        {prev?.weight && prev?.reps ? (
          <Text className="text-text-muted text-xs text-center" numberOfLines={2}>
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
            className="flex-1 text-center text-text-primary font-bold text-base bg-transparent"
            placeholder={prev?.weight?.toString() ?? '0'}
            placeholderTextColor="#52525B"
            keyboardType="decimal-pad"
            value={set.weight?.toString() ?? ''}
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
          className="flex-1 text-center text-text-primary font-bold text-base bg-transparent"
          placeholder={prev?.reps?.toString() ?? (exerciseType === 'duration' ? '30s' : '0')}
          placeholderTextColor="#52525B"
          keyboardType="number-pad"
          value={set.reps?.toString() ?? ''}
          onChangeText={onRepsChange}
          editable={!set.isCompleted}
        />
        <Pressable onPress={() => onAdjustReps(1)} className="w-6 h-6 items-center justify-center active:opacity-60">
          <Plus size={12} color="#71717A" />
        </Pressable>
      </View>

      {/* Complete / Undo button */}
      <Pressable
        onPress={onComplete}
        className={`w-10 h-10 rounded-full items-center justify-center active:opacity-75 ${
          set.isCompleted ? 'bg-success' : 'bg-surface border border-border'
        }`}
      >
        <Check size={18} color={set.isCompleted ? 'white' : '#52525B'} />
      </Pressable>
    </View>
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
  onOpenPlateCalc: (weight: number) => void;
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
  onOpenPlateCalc,
}: ExerciseCardProps) {
  const [showPrev, setShowPrev] = useState(true);

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

  // Compute progressive overload suggestion
  const overloadSuggestion = useMemo(() => {
    if (!previousSets || previousSets.length === 0) return null;
    const topPrev = previousSets.find((s) => (s.weight ?? 0) > 0 && (s.reps ?? 0) > 0);
    if (!topPrev || !topPrev.weight || !topPrev.reps) return null;
    return getProgressionSuggestion(topPrev.weight, topPrev.reps, 8, 12);
  }, [previousSets]);

  const currentTopWeight = exercise.sets.find((s) => (s.weight ?? 0) > 0)?.weight ?? previousSets[0]?.weight ?? 60;

  return (
    <View className="mx-4 mb-4 bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <View className="px-4 py-3 flex-row items-center gap-3">
        <View className="flex-1">
          <Text className="text-text-primary font-bold text-lg">{exercise.exerciseName}</Text>
          <Text style={{ color: muscleColor }} className="text-xs font-semibold capitalize mt-0.5">
            {exercise.primaryMuscle.replace(/_/g, ' ')}
          </Text>
        </View>

        {/* Plate Calculator Button */}
        {exercise.exerciseType !== 'bodyweight' && exercise.exerciseType !== 'duration' && (
          <Pressable
            onPress={() => onOpenPlateCalc(currentTopWeight)}
            className="flex-row items-center gap-1 bg-surface border border-border rounded-lg px-2 py-1 active:opacity-60"
          >
            <Disc size={13} color="#F97316" />
            <Text className="text-text-secondary text-2xs font-semibold">Plates</Text>
          </Pressable>
        )}

        <Pressable
          onPress={() => setShowPrev((v) => !v)}
          className="flex-row items-center gap-1 active:opacity-60"
        >
          <Text className="text-text-muted text-xs">Prev</Text>
          {showPrev ? <ChevronUp size={14} color="#71717A" /> : <ChevronDown size={14} color="#71717A" />}
        </Pressable>
      </View>

      {/* Progressive Overload Suggestion */}
      {overloadSuggestion && (
        <View className="mx-4 mb-2.5 bg-accent/10 border border-accent/25 rounded-xl px-3 py-1.5 flex-row items-center gap-2">
          <Lightbulb size={13} color="#F97316" />
          <Text className="text-text-secondary text-2xs flex-1">
            Target: <Text className="text-accent font-bold">{overloadSuggestion.weight} kg</Text> × {overloadSuggestion.repsMin}-{overloadSuggestion.repsMax} reps
          </Text>
        </View>
      )}

      {/* Previous performance */}
      {showPrev && previousSets.length > 0 && (
        <View className="px-4 pb-2">
          <View className="flex-row gap-2 flex-wrap">
            {previousSets.map((s, i) => (
              <View key={i} className="bg-surface border border-border rounded-lg px-2 py-1">
                <Text className="text-text-secondary text-xs">
                  {s.weight ? `${s.weight}` : '—'}
                  {s.reps ? ` × ${s.reps}` : ''}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Column headers */}
      <View className="flex-row items-center px-4 pb-1.5">
        <View className="w-8">
          <Text className="text-text-muted text-xs text-center">Set</Text>
        </View>
        <View className="w-16">
          <Text className="text-text-muted text-xs text-center">Prev</Text>
        </View>
        {exercise.exerciseType !== 'bodyweight' && exercise.exerciseType !== 'duration' && (
          <View className="flex-1">
            <Text className="text-text-muted text-xs text-center">kg</Text>
          </View>
        )}
        <View className="flex-1">
          <Text className="text-text-muted text-xs text-center">Reps</Text>
        </View>
        <View className="w-10" />
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
          />
        ))}
      </View>

      {/* Add set */}
      <Pressable
        onPress={onAddSet}
        className="mx-4 mb-4 mt-1 border border-dashed border-border rounded-xl py-2.5 flex-row items-center justify-center gap-2 active:opacity-70"
      >
        <Plus size={16} color="#71717A" />
        <Text className="text-text-tertiary text-sm font-medium">Add Set</Text>
      </Pressable>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

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
  const [previousPerformances, setPreviousPerformances] = useState<Record<string, { weight: number | null; reps: number | null }[]>>({});
  const [visiblePr, setVisiblePr] = useState<PrResult | null>(null);
  const [plateCalcWeight, setPlateCalcWeight] = useState<number | null>(null);

  // Elapsed timer
  useEffect(() => {
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
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

        // If starting from a routine, load its exercises
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
            });
          }
        } else if (params.repeatWorkoutId) {
          // Repeat last workout: load previous exercises and prefill sets with previous weight & reps
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
            });

            // Populate prefilled weights & reps into store
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

  // Load previous performances for exercises
  useEffect(() => {
    async function loadPrev() {
      const perf: Record<string, { weight: number | null; reps: number | null }[]> = {};
      for (const ex of store.exercises) {
        const last = await getLastPerformance(ex.exerciseId);
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

  const handleCompleteSet = useCallback(async (exerciseName: string, workoutExerciseId: string, setId: string, restSeconds: number) => {
    const prs = await store.completeSet(workoutExerciseId, setId);
    if (prs && prs.length > 0) {
      setVisiblePr(prs[0]!);
    }
    startTimer(restSeconds, exerciseName);
  }, [store, startTimer]);

  const handleFinish = () => {
    Alert.alert('Finish Workout?', 'Your workout will be saved.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Finish',
        onPress: async () => {
          const summary = await store.finishWorkout();
          router.replace(`/workout/summary?workoutId=${summary.workoutId}&duration=${summary.durationSeconds}&volume=${summary.totalVolume}&sets=${summary.totalSets}&reps=${summary.totalReps}&prs=${summary.prCount}`);
        },
      },
    ]);
  };

  const handleDiscard = () => {
    Alert.alert('Discard Workout?', 'All progress will be lost.', [
      { text: 'Cancel', style: 'cancel' },
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

  const handleAddExercise = () => {
    router.push('/exercise/picker');
  };

  if (isStarting) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-accent font-bold text-lg">Starting workout...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top bar */}
        <View className="flex-row items-center px-4 py-3 border-b border-border">
          <Pressable onPress={handleDiscard} className="w-8 h-8 items-center justify-center active:opacity-60">
            <X size={22} color="#71717A" />
          </Pressable>
          <View className="flex-1 items-center">
            <Text className="text-text-primary font-bold text-base">{store.workoutName}</Text>
            <Text className="text-text-tertiary text-xs tabular-nums">{formatDuration(elapsedSeconds)}</Text>
          </View>
          <Pressable
            onPress={() => setPlateCalcWeight(60)}
            className="w-8 h-8 items-center justify-center bg-surface border border-border rounded-full mr-2 active:opacity-75"
          >
            <Disc size={16} color="#F97316" />
          </Pressable>
          <Pressable
            onPress={handleFinish}
            className="bg-accent px-4 py-2 rounded-full active:opacity-80"
          >
            <Text className="text-white font-bold text-sm">Finish</Text>
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Rest Timer */}
          <RestTimerBar />

          {/* PR Badge */}
          {visiblePr && (
            <PrBadge
              pr={visiblePr}
              onDismiss={() => {
                setVisiblePr(null);
                store.clearPrs();
              }}
            />
          )}

          {/* Exercise cards */}
          {store.exercises.map((exercise) => (
            <ExerciseCard
              key={exercise.workoutExerciseId}
              exercise={exercise}
              previousSets={previousPerformances[exercise.exerciseId] ?? []}
              onAddSet={() => store.addSet(exercise.workoutExerciseId)}
              onCompleteSet={(setId) =>
                handleCompleteSet(exercise.exerciseName, exercise.workoutExerciseId, setId, exercise.restSeconds)
              }
              onUpdateWeight={(setId, v) => {
                const num = parseFloat(v);
                store.updateSetField(exercise.workoutExerciseId, setId, 'weight', isNaN(num) ? null : num);
              }}
              onUpdateReps={(setId, v) => {
                const num = parseInt(v, 10);
                store.updateSetField(exercise.workoutExerciseId, setId, 'reps', isNaN(num) ? null : num);
              }}
              onAdjustWeight={(setId, delta) => {
                const s = exercise.sets.find((s) => s.id === setId);
                const cur = s?.weight ?? 0;
                store.updateSetField(exercise.workoutExerciseId, setId, 'weight', Math.max(0, cur + delta));
              }}
              onAdjustReps={(setId, delta) => {
                const s = exercise.sets.find((s) => s.id === setId);
                const cur = s?.reps ?? 0;
                store.updateSetField(exercise.workoutExerciseId, setId, 'reps', Math.max(0, cur + delta));
              }}
              onDeleteSet={(setId) => store.deleteSet(exercise.workoutExerciseId, setId)}
              onOpenPlateCalc={(w) => setPlateCalcWeight(w)}
            />
          ))}

          {/* Add exercise button */}
          <Pressable
            onPress={handleAddExercise}
            className="mx-4 border border-dashed border-border rounded-2xl py-4 flex-row items-center justify-center gap-2 active:opacity-70"
          >
            <Dumbbell size={18} color="#F97316" />
            <Text className="text-accent font-semibold">Add Exercise</Text>
          </Pressable>

          {/* Empty state */}
          {store.exercises.length === 0 && (
            <View className="items-center py-8 px-8">
              <Text className="text-text-tertiary text-sm text-center">
                No exercises yet. Tap &quot;Add Exercise&quot; to begin.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Plate Calculator Modal */}
      <PlateCalculatorModal
        visible={plateCalcWeight !== null}
        onClose={() => setPlateCalcWeight(null)}
        initialWeight={plateCalcWeight ?? 60}
      />
    </SafeAreaView>
  );
}
