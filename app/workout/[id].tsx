import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Clock, Dumbbell, Trophy, Zap, Play, Trash2, FileText } from 'lucide-react-native';
import {
  getWorkoutById,
  getWorkoutExercisesWithDetails,
  getSetsForWorkoutExercise,
  deleteWorkout,
} from '../../src/db/queries/workouts';
import { formatDuration } from '../../src/utils/calculations';
import { format } from 'date-fns';
import { useState } from 'react';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: workout, isLoading } = useQuery({
    queryKey: ['workout', id],
    queryFn: () => getWorkoutById(id!),
    enabled: !!id,
  });

  const { data: exercisesWithDetails = [] } = useQuery({
    queryKey: ['workout-exercises', id],
    queryFn: () => getWorkoutExercisesWithDetails(id!),
    enabled: !!id,
  });

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/history');
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Workout?', 'This workout and all its logged sets will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsDeleting(true);
            // Optimistically evict from caches
            queryClient.setQueryData<any[]>(['all-workouts'], (old) =>
              old ? old.filter((w) => w.id !== id) : [],
            );
            queryClient.setQueryData<any[]>(['recent-workouts'], (old) =>
              old ? old.filter((w) => w.id !== id) : [],
            );

            // Execute robust SQLite deletion
            await deleteWorkout(id!);

            // Navigate back immediately
            handleBack();

            // Background invalidate remaining aggregations
            queryClient.invalidateQueries({ queryKey: ['all-workouts'] });
            queryClient.invalidateQueries({ queryKey: ['recent-workouts'] });
            queryClient.invalidateQueries({ queryKey: ['week-workouts'] });
            queryClient.invalidateQueries({ queryKey: ['streak-stats'] });
            queryClient.invalidateQueries({ queryKey: ['recent-prs'] });
            queryClient.invalidateQueries({ queryKey: ['muscle-volume-breakdown-4w'] });
          } catch (err) {
            console.error('Failed to delete workout:', err);
            setIsDeleting(false);
            Alert.alert('Error', 'Could not delete workout. Please try again.');
          }
        },
      },
    ]);
  };

  const handlePerformAgain = () => {
    if (!workout) return;
    router.push({
      pathname: '/workout/active',
      params: {
        repeatWorkoutId: workout.id,
        routineName: encodeURIComponent(workout.name),
      },
    });
  };

  if (isLoading || isDeleting) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center px-4 py-3 border-b border-border">
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            className="w-8 h-8 items-center justify-center"
          >
            <ChevronLeft size={24} color="#FFFFFF" />
          </Pressable>
          <Text className="flex-1 text-center text-text-primary font-bold text-base">
            {isDeleting ? 'Deleting...' : 'Loading Workout...'}
          </Text>
          <View className="w-8" />
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F97316" />
          <Text className="text-text-secondary text-sm mt-3">
            {isDeleting ? 'Removing workout data...' : 'Loading workout details...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!workout) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center px-4 py-3 border-b border-border">
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            className="w-8 h-8 items-center justify-center"
          >
            <ChevronLeft size={24} color="#FFFFFF" />
          </Pressable>
          <Text className="flex-1 text-center text-text-primary font-bold text-base">
            Workout Details
          </Text>
          <View className="w-8" />
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-text-primary font-bold text-lg mb-2">Workout Not Found</Text>
          <Text className="text-text-muted text-sm text-center mb-6">
            This workout may have already been deleted.
          </Text>
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            className="bg-accent px-6 py-3 rounded-full"
          >
            <Text className="text-white font-bold text-sm">Return to History</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-border">
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          className="w-8 h-8 items-center justify-center"
        >
          <ChevronLeft size={24} color="#FFFFFF" />
        </Pressable>
        <View className="flex-1 items-center">
          <Text className="text-text-primary font-bold text-base" numberOfLines={1}>{workout.name}</Text>
          <Text className="text-text-tertiary text-xs">
            {format(new Date(workout.startedAt), 'EEEE, MMMM d, yyyy')}
          </Text>
        </View>
        <Pressable
          onPress={handleDelete}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          className="w-8 h-8 items-center justify-center"
        >
          <Trash2 size={18} color="#EF4444" />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Perform Again Call-to-action */}
        <Pressable
          onPress={handlePerformAgain}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
          className="bg-accent rounded-2xl py-3.5 px-4 mb-5 flex-row items-center justify-center gap-2"
        >
          <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
          <Text className="text-white font-bold text-base">Perform Again</Text>
        </Pressable>

        {/* Stats row */}
        <View className="flex-row gap-3 mb-4">
          {workout.durationSeconds ? (
            <View className="flex-1 bg-card border border-border rounded-xl p-3">
              <Clock size={16} color="#F97316" />
              <Text className="text-text-primary font-bold text-lg mt-1">{formatDuration(workout.durationSeconds)}</Text>
              <Text className="text-text-muted text-xs">Duration</Text>
            </View>
          ) : null}
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
              <Text className="text-amber-500 font-bold text-lg mt-1">{workout.prCount}</Text>
              <Text className="text-text-muted text-xs">PRs</Text>
            </View>
          )}
        </View>

        {/* Workout Note if present */}
        {workout.notes && (
          <View className="bg-card border border-border rounded-2xl p-4 mb-4 flex-row items-center gap-3">
            <FileText size={18} color="#F97316" />
            <Text className="text-text-secondary text-sm flex-1 italic leading-5">
              {workout.notes}
            </Text>
          </View>
        )}

        {/* Exercises */}
        {exercisesWithDetails.map(({ we, exercise }) => (
          <ExerciseDetailCard
            key={we.id}
            workoutExerciseId={we.id}
            exerciseId={exercise?.id ?? ''}
            exerciseName={exercise?.name ?? 'Unknown'}
            primaryMuscle={exercise?.primaryMuscle ?? ''}
            notes={we.notes}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function ExerciseDetailCard({
  workoutExerciseId,
  exerciseId,
  exerciseName,
  primaryMuscle,
  notes,
}: {
  workoutExerciseId: string;
  exerciseId: string;
  exerciseName: string;
  primaryMuscle: string;
  notes: string | null;
}) {
  const { data: sets = [] } = useQuery({
    queryKey: ['sets', workoutExerciseId],
    queryFn: () => getSetsForWorkoutExercise(workoutExerciseId),
  });

  const completedSets = sets.filter((s) => s.isCompleted);

  return (
    <View className="bg-card border border-border rounded-2xl mb-3 overflow-hidden">
      <Pressable
        onPress={() => {
          if (exerciseId) router.push(`/exercise/${exerciseId}`);
        }}
        style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
        className="px-4 py-3 border-b border-border flex-row items-center justify-between"
      >
        <Text className="text-text-primary font-bold text-base">{exerciseName}</Text>
        <Text className="text-accent text-xs capitalize font-semibold">{primaryMuscle.replace(/_/g, ' ')} →</Text>
      </Pressable>

      {notes && (
        <View className="px-4 pt-2.5 flex-row items-center gap-2">
          <FileText size={12} color="#71717A" />
          <Text className="text-text-muted text-xs italic">{notes}</Text>
        </View>
      )}

      <View className="p-4">
        {completedSets.map((s, i) => (
          <View key={s.id} className="flex-row items-center gap-4 py-1.5">
            <Text className="text-text-muted text-sm w-6 font-semibold">{i + 1}</Text>
            {s.setType === 'warmup' && (
              <View className="bg-amber-500/15 px-1.5 py-0.5 rounded">
                <Text className="text-amber-500 text-2xs font-bold">W</Text>
              </View>
            )}
            {s.setType === 'drop' && (
              <View className="bg-purple-500/15 px-1.5 py-0.5 rounded">
                <Text className="text-purple-400 text-2xs font-bold">D</Text>
              </View>
            )}
            {s.weight !== null && (
              <Text className="text-text-primary text-sm font-semibold">{s.weight} kg</Text>
            )}
            {s.reps !== null && (
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
