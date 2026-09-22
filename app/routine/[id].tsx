import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Edit3, Play, Dumbbell } from 'lucide-react-native';
import { getRoutineById, getRoutineExercises } from '../../src/db/queries/routines';

export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: routine } = useQuery({
    queryKey: ['routine', id],
    queryFn: () => getRoutineById(id!),
    enabled: !!id,
  });

  const { data: routineExercises = [] } = useQuery({
    queryKey: ['routine-exercises', id],
    queryFn: () => getRoutineExercises(id!),
    enabled: !!id,
  });

  if (!routine) {
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
        <Text className="flex-1 text-center text-text-primary font-bold text-base">{routine.name}</Text>
        <Pressable onPress={() => router.push(`/routine/edit?id=${id}`)} className="w-8 h-8 items-center justify-center active:opacity-60">
          <Edit3 size={20} color="#F97316" />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Start button */}
        <Pressable
          onPress={() =>
            router.push(
              `/workout/active?routineId=${routine.id}&routineName=${encodeURIComponent(routine.name)}`,
            )
          }
          className="bg-accent rounded-2xl py-4 flex-row items-center justify-center gap-2 mb-5 active:opacity-85"
        >
          <Play size={20} color="white" fill="white" />
          <Text className="text-white font-bold text-base">Start Workout</Text>
        </Pressable>

        {/* Exercise list */}
        <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-3">
          {routineExercises.length} Exercises
        </Text>

        {routineExercises.map(({ re, exercise }, i) => (
          <View key={re.id} className="bg-card border border-border rounded-xl mb-2 px-4 py-3 flex-row items-center gap-3">
            <View className="w-7 h-7 rounded-full bg-accent/10 items-center justify-center">
              <Text className="text-accent text-xs font-bold">{i + 1}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-text-primary font-semibold">{exercise?.name ?? 'Unknown'}</Text>
              <Text className="text-text-muted text-xs">
                {re.defaultSets} sets · {re.targetRepsMin}–{re.targetRepsMax} reps · {re.restSeconds}s rest
              </Text>
            </View>
            <Dumbbell size={16} color="#52525B" />
          </View>
        ))}

        {routineExercises.length === 0 && (
          <View className="items-center py-8">
            <Text className="text-text-tertiary text-sm">No exercises in this routine yet.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
