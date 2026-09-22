import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Clock, Dumbbell, Trophy, Zap } from 'lucide-react-native';
import { getWorkoutById, getWorkoutExercisesWithDetails, getSetsForWorkoutExercise } from '../../src/db/queries/workouts';
import { formatDuration } from '../../src/utils/calculations';
import { format } from 'date-fns';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: workout } = useQuery({
    queryKey: ['workout', id],
    queryFn: () => getWorkoutById(id!),
    enabled: !!id,
  });

  const { data: exercisesWithDetails = [] } = useQuery({
    queryKey: ['workout-exercises', id],
    queryFn: () => getWorkoutExercisesWithDetails(id!),
    enabled: !!id,
  });

  if (!workout) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-text-secondary">Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-border">
        <Pressable onPress={() => router.back()} className="w-8 h-8 items-center justify-center active:opacity-60">
          <ChevronLeft size={24} color="#FFFFFF" />
        </Pressable>
        <View className="flex-1 items-center">
          <Text className="text-text-primary font-bold text-base">{workout.name}</Text>
          <Text className="text-text-tertiary text-xs">
            {format(new Date(workout.startedAt), 'EEEE, MMMM d, yyyy')}
          </Text>
        </View>
        <View className="w-8" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        <View className="flex-row gap-3 mb-5">
          {workout.durationSeconds && (
            <View className="flex-1 bg-card border border-border rounded-xl p-3">
              <Clock size={16} color="#F97316" />
              <Text className="text-text-primary font-bold text-lg mt-1">{formatDuration(workout.durationSeconds)}</Text>
              <Text className="text-text-muted text-xs">Duration</Text>
            </View>
          )}
          <View className="flex-1 bg-card border border-border rounded-xl p-3">
            <Dumbbell size={16} color="#3B82F6" />
            <Text className="text-text-primary font-bold text-lg mt-1">{workout.totalSets ?? 0}</Text>
            <Text className="text-text-muted text-xs">Sets</Text>
          </View>
          <View className="flex-1 bg-card border border-border rounded-xl p-3">
            <Zap size={16} color="#8B5CF6" />
            <Text className="text-text-primary font-bold text-lg mt-1">
              {Math.round(workout.totalVolume ?? 0)}kg
            </Text>
            <Text className="text-text-muted text-xs">Volume</Text>
          </View>
          {(workout.prCount ?? 0) > 0 && (
            <View className="flex-1 bg-card border border-border rounded-xl p-3">
              <Trophy size={16} color="#F59E0B" />
              <Text className="text-pr font-bold text-lg mt-1">{workout.prCount}</Text>
              <Text className="text-text-muted text-xs">PRs</Text>
            </View>
          )}
        </View>

        {/* Exercises */}
        {exercisesWithDetails.map(({ we, exercise }) => (
          <ExerciseDetailCard
            key={we.id}
            workoutExerciseId={we.id}
            exerciseName={exercise?.name ?? 'Unknown'}
            primaryMuscle={exercise?.primaryMuscle ?? ''}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function ExerciseDetailCard({
  workoutExerciseId,
  exerciseName,
  primaryMuscle,
}: {
  workoutExerciseId: string;
  exerciseName: string;
  primaryMuscle: string;
}) {
  const { data: sets = [] } = useQuery({
    queryKey: ['sets', workoutExerciseId],
    queryFn: () => getSetsForWorkoutExercise(workoutExerciseId),
  });

  const completedSets = sets.filter((s) => s.isCompleted);

  return (
    <View className="bg-card border border-border rounded-2xl mb-3 overflow-hidden">
      <View className="px-4 py-3 border-b border-border flex-row items-center justify-between">
        <Text className="text-text-primary font-bold">{exerciseName}</Text>
        <Text className="text-text-tertiary text-xs capitalize">{primaryMuscle.replace(/_/g, ' ')}</Text>
      </View>
      <View className="p-4">
        {completedSets.map((s, i) => (
          <View key={s.id} className="flex-row gap-4 py-1.5">
            <Text className="text-text-muted text-sm w-6">{i + 1}</Text>
            {s.weight != null && (
              <Text className="text-text-primary text-sm font-semibold">{s.weight} kg</Text>
            )}
            {s.reps != null && (
              <Text className="text-text-secondary text-sm">× {s.reps}</Text>
            )}
            {s.isPr && <Trophy size={14} color="#F59E0B" />}
          </View>
        ))}
        {completedSets.length === 0 && (
          <Text className="text-text-muted text-sm">No sets completed</Text>
        )}
      </View>
    </View>
  );
}
