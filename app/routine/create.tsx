import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus, ChevronLeft, Save } from 'lucide-react-native';
import { createRoutine, addExerciseToRoutine } from '../../src/db/queries/routines';
import { useRoutineFormStore } from '../../src/store/routineFormStore';

export default function CreateRoutineScreen() {
  const qc = useQueryClient();
  const formStore = useRoutineFormStore();

  useEffect(() => {
    // Only reset if we're not returning from exercise picker
    if (formStore.mode !== 'create') {
      formStore.initCreate();
    }
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!formStore.name.trim()) throw new Error('Workout name is required');
      const routine = await createRoutine({
        name: formStore.name.trim(),
        description: formStore.description.trim() || null,
        colorHex: formStore.colorHex || '#F97316',
      });

      for (let i = 0; i < formStore.exercises.length; i++) {
        const ex = formStore.exercises[i]!;
        await addExerciseToRoutine({
          routineId: routine.id,
          exerciseId: ex.exerciseId,
          position: i,
          defaultSets: ex.defaultSets,
          targetRepsMin: ex.targetRepsMin,
          targetRepsMax: ex.targetRepsMax,
          restSeconds: ex.restSeconds,
        });
      }
      return routine;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routines'] });
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
        <Text className="flex-1 text-center text-text-primary font-bold text-base">Create Workout</Text>
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
            autoFocus={formStore.exercises.length === 0 && !formStore.name}
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
            {saveMutation.isPending ? 'Saving...' : 'Save Workout'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
