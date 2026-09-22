import {
  View,
  Text,
  Pressable,
  TextInput,
  SectionList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X, ChevronLeft, Plus } from 'lucide-react-native';
import { getAllExercises } from '../../src/db/queries/exercises';
import { useWorkoutStore } from '../../src/store/workoutStore';
import type { Exercise } from '../../src/db/schema';

const MUSCLE_COLORS: Record<string, string> = {
  chest: '#F97316',
  back: '#3B82F6',
  shoulders: '#8B5CF6',
  biceps: '#06B6D4',
  triceps: '#10B981',
  legs: '#F59E0B',
  quads: '#F59E0B',
  hamstrings: '#F59E0B',
  core: '#EC4899',
  glutes: '#84CC16',
  calves: '#06B6D4',
  full_body: '#A1A1AA',
  forearms: '#A1A1AA',
};

const MUSCLE_ORDER = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'quads', 'hamstrings', 'glutes', 'calves', 'core', 'full_body',
];

function groupByMuscle(exercises: Exercise[]): { title: string; data: Exercise[] }[] {
  const groups: Record<string, Exercise[]> = {};
  for (const ex of exercises) {
    if (!groups[ex.primaryMuscle]) groups[ex.primaryMuscle] = [];
    groups[ex.primaryMuscle]!.push(ex);
  }
  return MUSCLE_ORDER
    .filter((m) => groups[m] && groups[m]!.length > 0)
    .map((m) => ({
      title: m.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      data: groups[m]!,
    }));
}

export default function ExercisePickerScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const store = useWorkoutStore();
  const [search, setSearch] = useState('');

  const { data: exercises = [] } = useQuery({
    queryKey: ['all-exercises'],
    queryFn: getAllExercises,
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return exercises;
    const q = search.toLowerCase();
    return exercises.filter(
      (e) => e.name.toLowerCase().includes(q) || e.primaryMuscle.includes(q),
    );
  }, [exercises, search]);

  const sections = useMemo(() => {
    if (search.trim()) {
      return filtered.length > 0 ? [{ title: 'Results', data: filtered }] : [];
    }
    return groupByMuscle(filtered);
  }, [filtered, search]);

  const handleSelect = async (exercise: Exercise) => {
    if (params.mode !== 'routine') {
      // Add to active workout
      await store.addExercise({
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        primaryMuscle: exercise.primaryMuscle,
        equipment: exercise.equipment,
        exerciseType: exercise.exerciseType,
        defaultSets: 3,
        restSeconds: 120,
      });
      router.back();
    } else {
      // Return to routine create with selected exercise data
      router.back();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-border gap-3">
        <Pressable onPress={() => router.back()} className="w-8 h-8 items-center justify-center active:opacity-60">
          <ChevronLeft size={24} color="#FFFFFF" />
        </Pressable>
        <View className="flex-1 flex-row items-center bg-card border border-border rounded-xl px-3 py-2 gap-2">
          <Search size={16} color="#71717A" />
          <TextInput
            className="flex-1 text-text-primary text-sm"
            placeholder="Search exercises..."
            placeholderTextColor="#52525B"
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <X size={16} color="#71717A" />
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={() => router.push('/exercise/create')}
          className="w-8 h-8 items-center justify-center active:opacity-60"
        >
          <Plus size={22} color="#F97316" />
        </Pressable>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        renderSectionHeader={({ section }) => (
          <View className="py-2 mt-2">
            <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest">
              {section.title}
            </Text>
          </View>
        )}
        renderItem={({ item: exercise }) => {
          const muscleColor = MUSCLE_COLORS[exercise.primaryMuscle] ?? '#A1A1AA';
          return (
            <Pressable
              onPress={() => handleSelect(exercise)}
              className="bg-card border border-border rounded-xl px-4 py-3.5 mb-2 flex-row items-center gap-3 active:opacity-80"
            >
              <View
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: muscleColor }}
              />
              <View className="flex-1">
                <Text className="text-text-primary font-semibold">{exercise.name}</Text>
                <Text className="text-text-muted text-xs capitalize">
                  {exercise.equipment.replace(/_/g, ' ')} · {exercise.movementType}
                </Text>
              </View>
              {exercise.isCustom && (
                <View className="bg-accent/15 px-2 py-0.5 rounded-full">
                  <Text className="text-accent text-xs font-medium">Custom</Text>
                </View>
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={() => (
          <View className="items-center py-12">
            <Text className="text-text-secondary text-sm">No exercises found</Text>
            <Pressable
              onPress={() => router.push('/exercise/create')}
              className="mt-4 flex-row items-center gap-2"
            >
              <Plus size={16} color="#F97316" />
              <Text className="text-accent font-medium">Create custom exercise</Text>
            </Pressable>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
