import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus, ChevronLeft, Save } from 'lucide-react-native';
import {
  getRoutineById,
  getRoutineExercises,
  updateRoutine,
  replaceRoutineExercises,
} from '../../src/db/queries/routines';
import { useRoutineFormStore, type RoutineFormExercise } from '../../src/store/routineFormStore';

export default function EditRoutineScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const qc = useQueryClient();
  const formStore = useRoutineFormStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) return;
      // If we're already in edit mode for this routine (e.g. returned from exercise picker), preserve form state
      if (formStore.mode === 'edit' && formStore.routineId === id) {
        setLoading(false);
        return;
      }

      try {
        const routine = await getRoutineById(id);
        if (!routine) {
          Alert.alert('Error', 'Routine not found');
          router.back();
          return;
        }

        const routineExs = await getRoutineExercises(id);
        const mapped: RoutineFormExercise[] = routineExs.map(({ re, exercise }) => ({
          id: re.id,
          exerciseId: re.exerciseId,
          exerciseName: exercise?.name ?? 'Unknown',
          primaryMuscle: exercise?.primaryMuscle ?? '',
          defaultSets: re.defaultSets,
          targetRepsMin: re.targetRepsMin ?? 8,
          targetRepsMax: re.targetRepsMax ?? 12,
          restSeconds: re.restSeconds ?? 120,
          notes: re.notes,
        }));

        formStore.initEdit(
          routine.id,
          routine.name,
          routine.description,
          routine.colorHex,
          mapped,
        );
      } catch (err) {
        console.error('Failed to load routine for editing:', err);
        Alert.alert('Error', 'Could not load routine');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!id || !formStore.name.trim()) throw new Error('Workout name is required');

      // Update routine details
      await updateRoutine(id, {
        name: formStore.name.trim(),
        description: formStore.description.trim() || null,
        colorHex: formStore.colorHex || '#F97316',
      });

      // Update routine exercises atomically
      await replaceRoutineExercises(id, formStore.exercises);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routines'] });
      qc.invalidateQueries({ queryKey: ['routine', id] });
      qc.invalidateQueries({ queryKey: ['routine-exercises', id] });
      formStore.reset();
      router.back();
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  const handleAddExercise = () => {
    router.push({
      pathname: '/exercise/picker',
      params: { mode: 'routine' },
    });
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="#F97316" size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-border">
        <Pressable
          onPress={() => {
            formStore.reset();
            router.back();
          }}
          className="w-8 h-8 items-center justify-center active:opacity-60"
        >
          <ChevronLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="flex-1 text-center text-text-primary font-bold text-base">Edit Workout</Text>
        <Pressable
          onPress={() => saveMutation.mutate()}
          className="w-8 h-8 items-center justify-center active:opacity-60"
          disabled={saveMutation.isPending || !formStore.name.trim()}
        >
          <Save size={20} color={!formStore.name.trim() ? '#52525B' : '#F97316'} />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Name */}
        <View className="mb-4">
          <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-2">
            Workout Name *
          </Text>
          <TextInput
            className="bg-card border border-border rounded-xl px-4 py-3.5 text-text-primary text-base font-semibold"
            placeholder="e.g. Push Day"
            placeholderTextColor="#52525B"
            value={formStore.name}
            onChangeText={formStore.setName}
          />
        </View>

        {/* Description */}
        <View className="mb-5">
          <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-2">
            Description (optional)
          </Text>
          <TextInput
            className="bg-card border border-border rounded-xl px-4 py-3 text-text-primary text-sm"
            placeholder="e.g. Chest, shoulders, triceps"
            placeholderTextColor="#52525B"
            value={formStore.description}
            onChangeText={formStore.setDescription}
          />
        </View>

        {/* Exercises */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest">
            Exercises ({formStore.exercises.length})
          </Text>
          <Pressable onPress={handleAddExercise} className="flex-row items-center gap-1">
            <Plus size={14} color="#F97316" />
            <Text className="text-accent text-xs font-semibold">Add Exercise</Text>
          </Pressable>
        </View>

        {formStore.exercises.map((ex, i) => (
          <View key={ex.id} className="bg-card border border-border rounded-2xl mb-3 overflow-hidden">
            <View className="flex-row items-center px-4 py-3 border-b border-border justify-between">
              <View className="flex-row items-center gap-2 flex-1 mr-2">
                <View className="w-6 h-6 rounded-full bg-accent/15 items-center justify-center">
                  <Text className="text-accent font-bold text-xs">{i + 1}</Text>
                </View>
                <Text className="text-text-primary font-bold text-sm" numberOfLines={1}>
                  {ex.exerciseName}
                </Text>
              </View>
              <Pressable onPress={() => formStore.removeExercise(ex.id)} className="p-1 active:opacity-60">
                <X size={16} color="#71717A" />
              </Pressable>
            </View>

            <View className="flex-row px-4 py-3 gap-2">
              <View className="flex-1">
                <Text className="text-text-muted text-2xs mb-1 text-center font-semibold">Sets</Text>
                <TextInput
                  className="bg-surface border border-border rounded-lg px-2 py-1.5 text-text-primary text-center font-bold text-sm"
                  keyboardType="number-pad"
                  value={ex.defaultSets.toString()}
                  onChangeText={(v) => formStore.updateExercise(ex.id, 'defaultSets', parseInt(v, 10) || 1)}
                />
              </View>
              <View className="flex-1">
                <Text className="text-text-muted text-2xs mb-1 text-center font-semibold">Min Reps</Text>
                <TextInput
                  className="bg-surface border border-border rounded-lg px-2 py-1.5 text-text-primary text-center font-bold text-sm"
                  keyboardType="number-pad"
                  value={ex.targetRepsMin.toString()}
                  onChangeText={(v) => formStore.updateExercise(ex.id, 'targetRepsMin', parseInt(v, 10) || 1)}
                />
              </View>
              <View className="flex-1">
                <Text className="text-text-muted text-2xs mb-1 text-center font-semibold">Max Reps</Text>
                <TextInput
                  className="bg-surface border border-border rounded-lg px-2 py-1.5 text-text-primary text-center font-bold text-sm"
                  keyboardType="number-pad"
                  value={ex.targetRepsMax.toString()}
                  onChangeText={(v) => formStore.updateExercise(ex.id, 'targetRepsMax', parseInt(v, 10) || 1)}
                />
              </View>
              <View className="flex-1">
                <Text className="text-text-muted text-2xs mb-1 text-center font-semibold">Rest (s)</Text>
                <TextInput
                  className="bg-surface border border-border rounded-lg px-2 py-1.5 text-text-primary text-center font-bold text-sm"
                  keyboardType="number-pad"
                  value={ex.restSeconds.toString()}
                  onChangeText={(v) => formStore.updateExercise(ex.id, 'restSeconds', parseInt(v, 10) || 60)}
                />
              </View>
            </View>
          </View>
        ))}

        {/* Add Exercise button */}
        <Pressable
          onPress={handleAddExercise}
          className="border border-dashed border-border rounded-2xl py-4 flex-row items-center justify-center gap-2 mb-6 active:opacity-70 bg-card/40"
        >
          <Plus size={18} color="#F97316" />
          <Text className="text-accent font-semibold">Add Exercise</Text>
        </Pressable>

        {/* Save */}
        <Pressable
          onPress={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !formStore.name.trim()}
          className={`rounded-2xl py-4 items-center ${
            !formStore.name.trim() ? 'bg-surface' : 'bg-accent active:opacity-85'
          }`}
        >
          <Text className={`font-bold text-base ${!formStore.name.trim() ? 'text-text-muted' : 'text-white'}`}>
            {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
