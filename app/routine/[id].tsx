import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Edit3, Play, Dumbbell, Copy, Trash2 } from 'lucide-react-native';
import {
  getRoutineById,
  getRoutineExercises,
  deleteRoutine,
  duplicateRoutine,
} from '../../src/db/queries/routines';

export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();

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

  const deleteMutation = useMutation({
    mutationFn: (routineId: string) => deleteRoutine(routineId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routines'] });
      router.back();
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: (routineId: string) => duplicateRoutine(routineId),
    onSuccess: (newRoutine) => {
      qc.invalidateQueries({ queryKey: ['routines'] });
      Alert.alert('Duplicated', `Created "${newRoutine.name}"`, [
        {
          text: 'View',
          onPress: () => router.replace(`/routine/${newRoutine.id}`),
        },
        { text: 'OK' },
      ]);
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  const handleDelete = () => {
    if (!routine) return;
    Alert.alert(
      `Delete "${routine.name}"?`,
      'This will not delete your completed workout history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(routine.id),
        },
      ],
    );
  };

  const handleDuplicate = () => {
    if (!routine) return;
    duplicateMutation.mutate(routine.id);
  };

  if (!routine) {
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
        <Text className="flex-1 text-center text-text-primary font-bold text-base" numberOfLines={1}>
          {routine.name}
        </Text>
        <Pressable
          onPress={() => router.push(`/routine/edit?id=${id}`)}
          className="w-8 h-8 items-center justify-center active:opacity-60"
        >
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
          className="bg-accent rounded-2xl py-4 flex-row items-center justify-center gap-2 mb-4 active:opacity-85 shadow-sm"
        >
          <Play size={20} color="white" fill="white" />
          <Text className="text-white font-bold text-base">Start Workout</Text>
        </Pressable>

        {/* Action buttons (Duplicate & Delete) */}
        <View className="flex-row gap-2 mb-6">
          <Pressable
            onPress={handleDuplicate}
            className="flex-1 bg-card border border-border rounded-xl py-2.5 flex-row items-center justify-center gap-2 active:opacity-75"
          >
            <Copy size={16} color="#A1A1AA" />
            <Text className="text-text-secondary font-semibold text-xs">Duplicate</Text>
          </Pressable>
          <Pressable
            onPress={handleDelete}
            className="flex-1 bg-card border border-border rounded-xl py-2.5 flex-row items-center justify-center gap-2 active:opacity-75"
          >
            <Trash2 size={16} color="#EF4444" />
            <Text className="text-error font-semibold text-xs">Delete</Text>
          </Pressable>
        </View>

        {/* Exercise list */}
        <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-3">
          {routineExercises.length} Exercises
        </Text>

        {routineExercises.map(({ re, exercise }, i) => (
          <View key={re.id} className="bg-card border border-border rounded-xl mb-2.5 px-4 py-3.5 flex-row items-center gap-3">
            <View className="w-7 h-7 rounded-full bg-accent/10 items-center justify-center">
              <Text className="text-accent text-xs font-bold">{i + 1}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-text-primary font-semibold text-sm">{exercise?.name ?? 'Unknown'}</Text>
              <Text className="text-text-muted text-xs mt-0.5">
                {re.defaultSets} sets · {re.targetRepsMin}–{re.targetRepsMax} reps · {re.restSeconds}s rest
              </Text>
            </View>
            <Dumbbell size={16} color="#52525B" />
          </View>
        ))}

        {routineExercises.length === 0 && (
          <View className="items-center py-8">
            <Text className="text-text-tertiary text-sm">No exercises in this routine yet.</Text>
            <Pressable
              onPress={() => router.push(`/routine/edit?id=${id}`)}
              className="mt-3 px-4 py-2 bg-card border border-border rounded-xl"
            >
              <Text className="text-accent text-xs font-semibold">Add Exercises</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
