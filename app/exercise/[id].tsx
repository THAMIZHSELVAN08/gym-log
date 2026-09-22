import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Trophy, TrendingUp, Calendar } from 'lucide-react-native';
import { getExerciseById } from '../../src/db/queries/exercises';
import { getExerciseHistory } from '../../src/db/queries/workouts';
import { getLatestPrForExercise } from '../../src/db/queries/prs';
import { calculateEpley1RM } from '../../src/utils/calculations';
import { format } from 'date-fns';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: exercise } = useQuery({
    queryKey: ['exercise', id],
    queryFn: () => getExerciseById(id!),
    enabled: !!id,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['exercise-history', id],
    queryFn: () => getExerciseHistory(id!, 10),
    enabled: !!id,
  });

  const { data: maxWeightPr } = useQuery({
    queryKey: ['pr-max-weight', id],
    queryFn: () => getLatestPrForExercise(id!, 'max_weight'),
    enabled: !!id,
  });

  const { data: e1rmPr } = useQuery({
    queryKey: ['pr-e1rm', id],
    queryFn: () => getLatestPrForExercise(id!, 'estimated_1rm'),
    enabled: !!id,
  });

  if (!exercise) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-text-secondary">Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-4 py-3 border-b border-border">
        <Pressable onPress={() => router.back()} className="w-8 h-8 items-center justify-center active:opacity-60">
          <ChevronLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="flex-1 text-center text-text-primary font-bold text-base">{exercise.name}</Text>
        <View className="w-8" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Exercise info */}
        <View className="bg-card border border-border rounded-2xl p-4 mb-4">
          <View className="flex-row flex-wrap gap-2">
            {[
              { label: exercise.primaryMuscle.replace(/_/g, ' '), color: '#F97316' },
              { label: exercise.equipment.replace(/_/g, ' '), color: '#3B82F6' },
              { label: exercise.movementType, color: '#8B5CF6' },
            ].map((tag) => (
              <View key={tag.label} className="px-2.5 py-1 rounded-full border" style={{ borderColor: tag.color + '40', backgroundColor: tag.color + '15' }}>
                <Text className="text-xs font-medium capitalize" style={{ color: tag.color }}>
                  {tag.label}
                </Text>
              </View>
            ))}
          </View>
          {exercise.instructions && (
            <Text className="text-text-secondary text-sm mt-3 leading-5">{exercise.instructions}</Text>
          )}
        </View>

        {/* PRs */}
        {(maxWeightPr || e1rmPr) && (
          <View className="mb-4">
            <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-3">
              Personal Records
            </Text>
            <View className="flex-row gap-3">
              {maxWeightPr?.weight && (
                <View className="flex-1 bg-pr/10 border border-pr/30 rounded-xl p-4">
                  <Trophy size={18} color="#F59E0B" />
                  <Text className="text-pr text-2xl font-bold mt-2">{maxWeightPr.weight} kg</Text>
                  <Text className="text-text-muted text-xs">× {maxWeightPr.reps} reps</Text>
                  <Text className="text-text-muted text-xs mt-1">Max Weight</Text>
                </View>
              )}
              {e1rmPr?.estimated1rm && (
                <View className="flex-1 bg-card border border-border rounded-xl p-4">
                  <TrendingUp size={18} color="#22C55E" />
                  <Text className="text-success text-2xl font-bold mt-2">{e1rmPr.estimated1rm.toFixed(1)} kg</Text>
                  <Text className="text-text-muted text-xs mt-1">Est. 1RM</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* History */}
        <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-3">
          History
        </Text>

        {history.length === 0 && (
          <View className="items-center py-8">
            <Calendar size={32} color="#3A3A3A" />
            <Text className="text-text-secondary text-sm mt-3">No history yet for this exercise.</Text>
          </View>
        )}

        {history.map((entry) => (
          <View key={entry.workoutId} className="bg-card border border-border rounded-xl mb-3 overflow-hidden">
            <View className="px-4 py-2.5 border-b border-border flex-row items-center justify-between">
              <Text className="text-text-secondary text-xs font-semibold">
                {format(new Date(entry.startedAt), 'MMM d, yyyy')}
              </Text>
              <Text className="text-text-muted text-xs">{entry.workoutName}</Text>
            </View>
            <View className="p-4">
              {entry.sets.map((s, i) => {
                const e1rm = s.weight && s.reps ? calculateEpley1RM(s.weight, s.reps) : null;
                return (
                  <View key={s.id} className="flex-row items-center gap-3 py-1">
                    <Text className="text-text-muted text-sm w-6">{i + 1}</Text>
                    {s.weight != null && (
                      <Text className="text-text-primary font-bold text-sm">{s.weight} kg</Text>
                    )}
                    {s.reps != null && (
                      <Text className="text-text-secondary text-sm">× {s.reps}</Text>
                    )}
                    {e1rm && (
                      <Text className="text-text-muted text-xs ml-auto">1RM ~{e1rm.toFixed(1)}</Text>
                    )}
                    {s.isPr && <Trophy size={12} color="#F59E0B" />}
                  </View>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
