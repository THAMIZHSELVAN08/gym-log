import { View, Text, Pressable, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Save } from 'lucide-react-native';
import { createExercise } from '../../src/db/queries/exercises';
import { MuscleGroups, EquipmentTypes } from '../../src/db/schema';

type SelectProps = {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
};

function SelectChips({ label, options, value, onChange }: SelectProps) {
  return (
    <View className="mb-5">
      <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-2">{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
        <View className="flex-row gap-2 px-1">
          {options.map((opt) => (
            <Pressable
              key={opt}
              onPress={() => onChange(opt)}
              className={`px-3 py-1.5 rounded-full border ${
                value === opt
                  ? 'bg-accent border-accent'
                  : 'bg-card border-border'
              } active:opacity-80`}
            >
              <Text
                className={`text-xs font-medium capitalize ${
                  value === opt ? 'text-white' : 'text-text-secondary'
                }`}
              >
                {opt.replace(/_/g, ' ')}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

export default function CreateExerciseScreen() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [primaryMuscle, setPrimaryMuscle] = useState('chest');
  const [equipment, setEquipment] = useState('barbell');
  const [movementType, setMovementType] = useState('compound');
  const [exerciseType, setExerciseType] = useState('weight_reps');
  const [instructions, setInstructions] = useState('');

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!name.trim()) throw new Error('Name is required');
      return createExercise({
        name: name.trim(),
        primaryMuscle,
        secondaryMuscles: '[]',
        equipment,
        movementType,
        exerciseType,
        instructions: instructions.trim() || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-exercises'] });
      router.back();
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-4 py-3 border-b border-border">
        <Pressable onPress={() => router.back()} className="w-8 h-8 items-center justify-center active:opacity-60">
          <ChevronLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="flex-1 text-center text-text-primary font-bold text-base">Create Exercise</Text>
        <Pressable
          onPress={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !name.trim()}
          className="w-8 h-8 items-center justify-center active:opacity-60"
        >
          <Save size={20} color={!name.trim() ? '#52525B' : '#F97316'} />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Name */}
        <View className="mb-5">
          <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-2">
            Exercise Name
          </Text>
          <TextInput
            className="bg-card border border-border rounded-xl px-4 py-3.5 text-text-primary text-base"
            placeholder="e.g. Machine Chest Press"
            placeholderTextColor="#52525B"
            value={name}
            onChangeText={setName}
            autoFocus
          />
        </View>

        <SelectChips
          label="Primary Muscle"
          options={MuscleGroups}
          value={primaryMuscle}
          onChange={setPrimaryMuscle}
        />

        <SelectChips
          label="Equipment"
          options={EquipmentTypes}
          value={equipment}
          onChange={setEquipment}
        />

        <SelectChips
          label="Movement Type"
          options={['compound', 'isolation']}
          value={movementType}
          onChange={setMovementType}
        />

        <SelectChips
          label="Exercise Type"
          options={['weight_reps', 'bodyweight', 'duration', 'assisted_bodyweight']}
          value={exerciseType}
          onChange={setExerciseType}
        />

        {/* Instructions */}
        <View className="mb-6">
          <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-2">
            Instructions (optional)
          </Text>
          <TextInput
            className="bg-card border border-border rounded-xl px-4 py-3.5 text-text-primary text-sm"
            placeholder="Describe how to perform this exercise..."
            placeholderTextColor="#52525B"
            value={instructions}
            onChangeText={setInstructions}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Save */}
        <Pressable
          onPress={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !name.trim()}
          className={`rounded-2xl py-4 items-center ${!name.trim() ? 'bg-surface' : 'bg-accent active:opacity-85'}`}
        >
          <Text className={`font-bold text-base ${!name.trim() ? 'text-text-muted' : 'text-white'}`}>
            {saveMutation.isPending ? 'Saving...' : 'Save Exercise'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
