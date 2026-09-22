import { View, Text, Pressable, ScrollView, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Play, MoreHorizontal, Dumbbell } from 'lucide-react-native';
import { getAllRoutines, deleteRoutine } from '../../src/db/queries/routines';
import { isToday, isYesterday } from 'date-fns';
import { useState } from 'react';

function formatLastDone(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  const diff = Math.round((Date.now() - d.getTime()) / 86400000);
  if (diff < 7) return `${diff} days ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function WorkoutsScreen() {
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: routines = [], isLoading } = useQuery({
    queryKey: ['routines'],
    queryFn: getAllRoutines,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ['routines'] });
    setRefreshing(false);
  };

  const deleteMutation = useMutation({
    mutationFn: deleteRoutine,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['routines'] }),
  });

  const handleMore = (id: string, name: string) => {
    Alert.alert(name, '', [
      { text: 'Edit', onPress: () => router.push(`/routine/${id}`) },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          Alert.alert(`Delete "${name}"?`, 'This will not affect your completed workouts.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#F97316" />
        }
      >
        {/* Header */}
        <View className="px-5 pt-5 pb-4 flex-row items-center justify-between">
          <Text className="text-text-primary text-2xl font-bold tracking-tight">Workouts</Text>
          <Pressable
            onPress={() => router.push('/routine/create')}
            className="w-9 h-9 rounded-full bg-accent items-center justify-center active:opacity-80"
          >
            <Plus size={20} color="white" />
          </Pressable>
        </View>

        <View className="px-4">
          {/* Always-visible: Start Empty Workout */}
          <Pressable
            onPress={() => router.push('/workout/active?empty=1')}
            className="flex-row items-center py-4 border-b border-border active:opacity-70"
          >
            <View className="w-9 h-9 rounded-full bg-surface border border-border items-center justify-center mr-4">
              <Plus size={17} color="#F97316" />
            </View>
            <Text className="text-text-primary font-semibold text-base flex-1">Empty Workout</Text>
            <Text className="text-text-muted text-xs">Start now</Text>
          </Pressable>

          {/* Routines list */}
          {!isLoading && routines.length === 0 && (
            <View className="items-center py-12">
              <Dumbbell size={32} color="#3A3A3A" />
              <Text className="text-text-secondary text-base font-semibold mt-4 mb-2">
                No routines yet
              </Text>
              <Text className="text-text-tertiary text-sm text-center mb-6">
                Create a routine to quickly start a workout.
              </Text>
              <Pressable
                onPress={() => router.push('/routine/create')}
                className="bg-accent px-6 py-3 rounded-full active:opacity-90"
              >
                <Text className="text-white font-bold">Create Routine</Text>
              </Pressable>
            </View>
          )}

          {routines.map((routine, i) => (
            <Pressable
              key={routine.id}
              onPress={() =>
                router.push(`/workout/active?routineId=${routine.id}&routineName=${encodeURIComponent(routine.name)}`)
              }
              className={`flex-row items-center py-4 active:opacity-70 ${
                i < routines.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              {/* Color dot */}
              <View
                className="w-2.5 h-2.5 rounded-full mr-4"
                style={{ backgroundColor: routine.colorHex ?? '#F97316' }}
              />

              <View className="flex-1">
                <Text className="text-text-primary font-semibold text-base">{routine.name}</Text>
                <Text className="text-text-tertiary text-xs mt-0.5">
                  {routine.lastPerformedAt
                    ? formatLastDone(routine.lastPerformedAt)
                    : 'Never performed'}
                </Text>
              </View>

              <View className="flex-row items-center gap-3">
                <Pressable
                  onPress={() =>
                    router.push(`/workout/active?routineId=${routine.id}&routineName=${encodeURIComponent(routine.name)}`)
                  }
                  className="w-8 h-8 rounded-full bg-accent/10 items-center justify-center active:opacity-75"
                >
                  <Play size={13} color="#F97316" fill="#F97316" />
                </Pressable>
                <Pressable
                  onPress={() => handleMore(routine.id, routine.name)}
                  className="w-8 h-8 items-center justify-center active:opacity-60"
                >
                  <MoreHorizontal size={18} color="#71717A" />
                </Pressable>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
