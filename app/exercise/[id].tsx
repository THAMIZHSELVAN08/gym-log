import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import {
  ChevronLeft,
  Trophy,
  TrendingUp,
  Calendar,
  Pin,
  Flame,
  Activity,
  Zap,
} from 'lucide-react-native';
import { getExerciseById, updatePinnedNote } from '../../src/db/queries/exercises';
import { getExerciseHistory, getExerciseProgression } from '../../src/db/queries/workouts';
import { calculateEpley1RM } from '../../src/utils/calculations';
import { format } from 'date-fns';

type TabType = 'history' | 'records' | 'charts';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('history');
  const [isEditingPinned, setIsEditingPinned] = useState(false);
  const [pinnedText, setPinnedText] = useState('');

  const { data: exercise } = useQuery({
    queryKey: ['exercise', id],
    queryFn: () => getExerciseById(id!),
    enabled: !!id,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['exercise-history', id],
    queryFn: () => getExerciseHistory(id!, 50),
    enabled: !!id,
  });

  const { data: progression = [] } = useQuery({
    queryKey: ['exercise-progression', id],
    queryFn: () => getExerciseProgression(id!),
    enabled: !!id,
  });

  const updatePinnedMutation = useMutation({
    mutationFn: (note: string | null) => updatePinnedNote(id!, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise', id] });
      setIsEditingPinned(false);
    },
  });

  // Calculate comprehensive records from history
  const records = useMemo(() => {
    let maxWeight = 0;
    let maxWeightReps = 0;
    let maxReps = 0;
    let maxRepsWeight = 0;
    let maxSetVolume = 0;
    let maxEstimated1RM = 0;
    let best5RepsWeight = 0;
    let best8RepsWeight = 0;
    let best10RepsWeight = 0;

    for (const entry of history) {
      for (const s of entry.sets) {
        const w = s.weight ?? 0;
        const r = s.reps ?? 0;
        const setVol = w * r;

        if (w > maxWeight) {
          maxWeight = w;
          maxWeightReps = r;
        }

        if (r > maxReps) {
          maxReps = r;
          maxRepsWeight = w;
        }

        if (setVol > maxSetVolume) {
          maxSetVolume = setVol;
        }

        if (w > 0 && r > 0) {
          const e1rm = calculateEpley1RM(w, r);
          if (e1rm > maxEstimated1RM) {
            maxEstimated1RM = e1rm;
          }
        }

        if (r >= 5 && w > best5RepsWeight) best5RepsWeight = w;
        if (r >= 8 && w > best8RepsWeight) best8RepsWeight = w;
        if (r >= 10 && w > best10RepsWeight) best10RepsWeight = w;
      }
    }

    return {
      maxWeight,
      maxWeightReps,
      maxReps,
      maxRepsWeight,
      maxSetVolume,
      maxEstimated1RM: Math.round(maxEstimated1RM * 10) / 10,
      best5RepsWeight,
      best8RepsWeight,
      best10RepsWeight,
    };
  }, [history]);

  if (!exercise) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-text-secondary">Loading exercise...</Text>
      </SafeAreaView>
    );
  }

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/workouts');
    }
  };

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
        <Text className="flex-1 text-center text-text-primary font-bold text-base" numberOfLines={1}>
          {exercise.name}
        </Text>
        <View className="w-8" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Exercise Tags & Summary */}
        <View className="bg-card border border-border rounded-2xl p-4 mb-4">
          <View className="flex-row flex-wrap gap-2">
            {[
              { label: exercise.primaryMuscle.replace(/_/g, ' '), color: '#F97316' },
              { label: exercise.equipment.replace(/_/g, ' '), color: '#3B82F6' },
              { label: exercise.movementType, color: '#8B5CF6' },
            ].map((tag) => (
              <View
                key={tag.label}
                className="px-2.5 py-1 rounded-full border"
                style={{ borderColor: tag.color + '40', backgroundColor: tag.color + '15' }}
              >
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

        {/* 📌 Persistent Pinned Note Section */}
        <View className="bg-card border border-amber-500/25 rounded-2xl p-4 mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2">
              <Pin size={15} color="#F59E0B" />
              <Text className="text-amber-500 font-bold text-xs uppercase tracking-wider">
                Pinned Reminder
              </Text>
            </View>
            <Pressable
              onPress={() => {
                if (!isEditingPinned) {
                  setPinnedText(exercise.pinnedNote ?? '');
                  setIsEditingPinned(true);
                }
              }}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <Text className="text-accent text-xs font-semibold">
                {isEditingPinned ? '' : exercise.pinnedNote ? 'Edit' : '+ Add'}
              </Text>
            </Pressable>
          </View>

          {isEditingPinned ? (
            <View>
              <TextInput
                className="bg-surface border border-border rounded-xl px-3 py-2 text-text-primary text-sm mb-3"
                value={pinnedText}
                onChangeText={setPinnedText}
                placeholder="e.g. Set seat height to notch 3, narrow grip"
                placeholderTextColor="#71717A"
                multiline
                autoFocus
              />
              <View className="flex-row justify-end gap-2">
                <Pressable
                  onPress={() => setIsEditingPinned(false)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                  className="px-3 py-1.5 rounded-lg"
                >
                  <Text className="text-text-muted text-xs">Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => updatePinnedMutation.mutate(pinnedText.trim() || null)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                  className="bg-amber-500 px-4 py-1.5 rounded-lg"
                >
                  <Text className="text-black text-xs font-bold">Save</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Text className="text-text-secondary text-sm leading-5">
              {exercise.pinnedNote || 'No pinned reminder. Add one to show automatically on every workout.'}
            </Text>
          )}
        </View>

        {/* Tabs: History | Records | Charts */}
        <View className="flex-row bg-surface border border-border rounded-xl p-1 mb-4">
          {(['history', 'records', 'charts'] as TabType[]).map((tab) => {
            const isSelected = activeTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                className={`flex-1 py-2 rounded-lg items-center ${
                  isSelected ? 'bg-card border border-border' : ''
                }`}
              >
                <Text
                  className={`text-xs font-bold capitalize ${
                    isSelected ? 'text-accent' : 'text-text-muted'
                  }`}
                >
                  {tab}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* TAB 1: HISTORY */}
        {activeTab === 'history' && (
          <View>
            {history.length === 0 ? (
              <View className="items-center py-12">
                <Calendar size={32} color="#52525B" />
                <Text className="text-text-muted text-sm mt-3 text-center">
                  No workout history yet for this exercise.
                </Text>
              </View>
            ) : (
              history.map((entry) => (
                <View
                  key={entry.workoutId}
                  className="bg-card border border-border rounded-xl mb-3 overflow-hidden"
                >
                  <View className="px-4 py-2.5 border-b border-border flex-row items-center justify-between bg-surface/50">
                    <Text className="text-text-primary text-xs font-bold">
                      {format(new Date(entry.startedAt), 'MMM d, yyyy')}
                    </Text>
                    <Text className="text-text-muted text-xs">{entry.workoutName}</Text>
                  </View>
                  <View className="p-4">
                    {entry.sets.map((s, i) => {
                      const e1rm =
                        s.weight && s.reps ? calculateEpley1RM(s.weight, s.reps) : null;
                      return (
                        <View key={s.id} className="flex-row items-center gap-3 py-1">
                          <Text className="text-text-muted text-xs font-semibold w-5">{i + 1}</Text>
                          {s.weight !== null && (
                            <Text className="text-text-primary font-bold text-sm">
                              {s.weight} kg
                            </Text>
                          )}
                          {s.reps !== null && (
                            <Text className="text-text-secondary text-sm">× {s.reps}</Text>
                          )}
                          {s.setType === 'warmup' && (
                            <View className="bg-amber-500/15 px-1.5 py-0.5 rounded">
                              <Text className="text-amber-500 text-2xs font-bold">WARMUP</Text>
                            </View>
                          )}
                          {e1rm && (
                            <Text className="text-text-muted text-xs ml-auto">
                              1RM ~{e1rm.toFixed(1)}kg
                            </Text>
                          )}
                          {s.isPr && <Trophy size={13} color="#F59E0B" />}
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 2: RECORDS */}
        {activeTab === 'records' && (
          <View className="gap-3">
            <View className="flex-row gap-3">
              <View className="flex-1 bg-card border border-amber-500/25 rounded-2xl p-4">
                <Trophy size={18} color="#F59E0B" />
                <Text className="text-amber-500 text-2xl font-bold mt-2">
                  {records.maxWeight > 0 ? `${records.maxWeight} kg` : '—'}
                </Text>
                <Text className="text-text-muted text-xs">
                  {records.maxWeightReps > 0 ? `× ${records.maxWeightReps} reps` : 'Max Weight'}
                </Text>
              </View>

              <View className="flex-1 bg-card border border-emerald-500/25 rounded-2xl p-4">
                <TrendingUp size={18} color="#10B981" />
                <Text className="text-emerald-400 text-2xl font-bold mt-2">
                  {records.maxEstimated1RM > 0 ? `${records.maxEstimated1RM} kg` : '—'}
                </Text>
                <Text className="text-text-muted text-xs">Estimated 1RM</Text>
              </View>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1 bg-card border border-border rounded-2xl p-4">
                <Zap size={18} color="#3B82F6" />
                <Text className="text-text-primary text-2xl font-bold mt-2">
                  {records.maxReps > 0 ? `${records.maxReps}` : '—'}
                </Text>
                <Text className="text-text-muted text-xs">
                  {records.maxRepsWeight > 0 ? `Max Reps @ ${records.maxRepsWeight}kg` : 'Max Reps'}
                </Text>
              </View>

              <View className="flex-1 bg-card border border-border rounded-2xl p-4">
                <Flame size={18} color="#8B5CF6" />
                <Text className="text-text-primary text-2xl font-bold mt-2">
                  {records.maxSetVolume > 0 ? `${Math.round(records.maxSetVolume)} kg` : '—'}
                </Text>
                <Text className="text-text-muted text-xs">Best Set Volume</Text>
              </View>
            </View>

            {/* Rep range records */}
            <View className="bg-card border border-border rounded-2xl p-4 mt-1">
              <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-3">
                Best Weight by Reps
              </Text>
              <View className="gap-2.5">
                <View className="flex-row justify-between items-center py-1 border-b border-border/50">
                  <Text className="text-text-secondary text-sm">Best 5 Reps</Text>
                  <Text className="text-text-primary font-bold text-sm">
                    {records.best5RepsWeight > 0 ? `${records.best5RepsWeight} kg` : '—'}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center py-1 border-b border-border/50">
                  <Text className="text-text-secondary text-sm">Best 8 Reps</Text>
                  <Text className="text-text-primary font-bold text-sm">
                    {records.best8RepsWeight > 0 ? `${records.best8RepsWeight} kg` : '—'}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center py-1">
                  <Text className="text-text-secondary text-sm">Best 10 Reps</Text>
                  <Text className="text-text-primary font-bold text-sm">
                    {records.best10RepsWeight > 0 ? `${records.best10RepsWeight} kg` : '—'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* TAB 3: CHARTS */}
        {activeTab === 'charts' && (
          <View>
            {progression.length === 0 ? (
              <View className="items-center py-12">
                <Activity size={32} color="#52525B" />
                <Text className="text-text-muted text-sm mt-3 text-center">
                  Not enough historical sessions to plot progression.
                </Text>
              </View>
            ) : (
              <View className="bg-card border border-border rounded-2xl p-4">
                <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-3">
                  Progression Over Time ({progression.length} sessions)
                </Text>
                <View className="gap-3">
                  {progression.slice(-8).map((point, idx) => (
                    <View key={idx} className="bg-surface border border-border rounded-xl p-3">
                      <View className="flex-row justify-between items-center mb-1">
                        <Text className="text-text-primary text-xs font-bold">
                          {format(new Date(point.date), 'MMM d, yyyy')}
                        </Text>
                        <Text className="text-accent text-xs font-bold">
                          1RM: {point.estimated1rm} kg
                        </Text>
                      </View>
                      <View className="flex-row justify-between text-xs">
                        <Text className="text-text-muted text-xs">
                          Top: {point.maxWeight}kg × {point.maxReps}
                        </Text>
                        <Text className="text-text-muted text-xs">
                          Vol: {Math.round(point.volume)}kg
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
