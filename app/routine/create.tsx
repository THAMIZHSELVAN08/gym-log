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
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus, GripVertical, ChevronLeft, Save } from 'lucide-react-native';
import { createRoutine, addExerciseToRoutine } from '../../src/db/queries/routines';

interface RoutineExerciseItem {
  id: string;
  exerciseId: string;
  exerciseName: string;
  primaryMuscle: string;
  defaultSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  restSeconds: number;
}

export default function CreateRoutineScreen() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState<RoutineExerciseItem[]>([]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Name required');
      const routine = await createRoutine({ name: name.trim(), description: description.trim() || null });
      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i]!;
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
      router.back();
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  const handleAddExercise = () => {
    router.push({
      pathname: '/exercise/picker',
      params: { mode: 'routine', returnTo: 'routine/create' },
    });
  };

  const removeExercise = (id: string) => {
    setExercises((prev) => prev.filter((e) => e.id !== id));
  };

  const updateExercise = (id: string, field: keyof RoutineExerciseItem, value: string | number) => {
    setExercises((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-border">
        <Pressable onPress={() => router.back()} className="w-8 h-8 items-center justify-center active:opacity-60">
          <ChevronLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="flex-1 text-center text-text-primary font-bold text-base">Create Workout</Text>
        <Pressable
          onPress={() => saveMutation.mutate()}
          className="w-8 h-8 items-center justify-center active:opacity-60"
          disabled={saveMutation.isPending}
        >
          <Save size={20} color="#F97316" />
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
            Workout Name
          </Text>
          <TextInput
            className="bg-card border border-border rounded-xl px-4 py-3.5 text-text-primary text-base"
            placeholder="e.g. Push Day"
            placeholderTextColor="#52525B"
            value={name}
            onChangeText={setName}
            autoFocus
          />
        </View>

        {/* Description */}
        <View className="mb-5">
          <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-2">
            Description (optional)
          </Text>
          <TextInput
            className="bg-card border border-border rounded-xl px-4 py-3.5 text-text-primary text-base"
            placeholder="e.g. Chest, shoulders, triceps"
            placeholderTextColor="#52525B"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Exercises */}
        <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-3">
          Exercises
        </Text>

        {exercises.map((ex, i) => (
          <View key={ex.id} className="bg-card border border-border rounded-2xl mb-3 overflow-hidden">
            <View className="flex-row items-center px-4 py-3 border-b border-border">
              <GripVertical size={16} color="#52525B" />
              <Text className="flex-1 text-text-primary font-semibold ml-2">{ex.exerciseName}</Text>
              <Pressable onPress={() => removeExercise(ex.id)} className="active:opacity-60">
                <X size={18} color="#71717A" />
              </Pressable>
            </View>
            <View className="flex-row px-4 py-3 gap-3">
              <View className="flex-1">
                <Text className="text-text-muted text-xs mb-1">Sets</Text>
                <TextInput
                  className="bg-surface border border-border rounded-lg px-3 py-2 text-text-primary text-center font-bold"
                  keyboardType="number-pad"
                  value={ex.defaultSets.toString()}
                  onChangeText={(v) => updateExercise(ex.id, 'defaultSets', parseInt(v) || 3)}
                />
              </View>
              <View className="flex-1">
                <Text className="text-text-muted text-xs mb-1">Min Reps</Text>
                <TextInput
                  className="bg-surface border border-border rounded-lg px-3 py-2 text-text-primary text-center font-bold"
                  keyboardType="number-pad"
                  value={ex.targetRepsMin.toString()}
                  onChangeText={(v) => updateExercise(ex.id, 'targetRepsMin', parseInt(v) || 8)}
                />
              </View>
              <View className="flex-1">
                <Text className="text-text-muted text-xs mb-1">Max Reps</Text>
                <TextInput
                  className="bg-surface border border-border rounded-lg px-3 py-2 text-text-primary text-center font-bold"
                  keyboardType="number-pad"
                  value={ex.targetRepsMax.toString()}
                  onChangeText={(v) => updateExercise(ex.id, 'targetRepsMax', parseInt(v) || 12)}
                />
              </View>
              <View className="flex-1">
                <Text className="text-text-muted text-xs mb-1">Rest (s)</Text>
                <TextInput
                  className="bg-surface border border-border rounded-lg px-3 py-2 text-text-primary text-center font-bold"
                  keyboardType="number-pad"
                  value={ex.restSeconds.toString()}
                  onChangeText={(v) => updateExercise(ex.id, 'restSeconds', parseInt(v) || 120)}
                />
              </View>
            </View>
          </View>
        ))}

        {/* Add Exercise */}
        <Pressable
          onPress={handleAddExercise}
          className="border border-dashed border-border rounded-2xl py-4 flex-row items-center justify-center gap-2 mb-5 active:opacity-70"
        >
          <Plus size={18} color="#F97316" />
          <Text className="text-accent font-semibold">Add Exercise</Text>
        </Pressable>

        {/* Save */}
        <Pressable
          onPress={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !name.trim()}
          className={`rounded-2xl py-4 items-center ${!name.trim() ? 'bg-surface' : 'bg-accent active:opacity-85'}`}
        >
          <Text className={`font-bold text-base ${!name.trim() ? 'text-text-muted' : 'text-white'}`}>
            {saveMutation.isPending ? 'Saving...' : 'Save Workout'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
