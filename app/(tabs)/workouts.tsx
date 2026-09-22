import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Play, Edit3, Dumbbell, MoreHorizontal } from 'lucide-react-native';
import { getAllRoutines, deleteRoutine } from '../../src/db/queries/routines';
import { format } from 'date-fns';

export default function WorkoutsScreen() {
  const qc = useQueryClient();

  const { data: routines = [], isLoading } = useQuery({
    queryKey: ['routines'],
    queryFn: getAllRoutines,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRoutine,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['routines'] }),
  });

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      `Delete "${name}"?`,
      'This will not affect your completed workout history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(id),
        },
      ],
    );
  };

  const handleMore = (id: string, name: string) => {
    Alert.alert(name, '', [
      { text: 'Edit', onPress: () => router.push(`/routine/${id}`) },
      { text: 'Delete', style: 'destructive', onPress: () => handleDelete(id, name) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-5 flex-row items-center justify-between">
          <View>
            <Text className="text-text-tertiary text-xs uppercase tracking-widest font-semibold">My</Text>
            <Text className="text-text-primary text-3xl font-bold tracking-tight">Workouts</Text>
          </View>
          <Pressable
            onPress={() => router.push('/routine/create')}
            className="w-10 h-10 rounded-full bg-accent items-center justify-center active:opacity-80"
          >
            <Plus size={22} color="white" />
          </Pressable>
        </View>

        {/* Empty state */}
        {!isLoading && routines.length === 0 && (
          <View className="px-4 items-center py-12">
            <View className="w-20 h-20 rounded-full bg-card border border-border items-center justify-center mb-4">
              <Dumbbell size={36} color="#F97316" />
            </View>
            <Text className="text-text-primary text-xl font-bold text-center mb-2">No workouts yet</Text>
            <Text className="text-text-tertiary text-sm text-center mb-6 max-w-xs">
              Create a workout template to quickly start training sessions.
            </Text>
            <Pressable
              onPress={() => router.push('/routine/create')}
              className="bg-accent px-8 py-3.5 rounded-full active:opacity-90"
            >
              <Text className="text-white font-bold text-base">Create Workout</Text>
            </Pressable>
          </View>
        )}

        {/* Routines list */}
        <View className="px-4 gap-3">
          {routines.map((routine) => (
            <View key={routine.id} className="bg-card border border-border rounded-2xl overflow-hidden">
              {/* Color accent bar */}
              <View className="h-0.5 bg-accent" />

              <View className="px-5 py-4">
                <View className="flex-row items-start justify-between mb-3">
                  <View className="flex-1">
                    <Text className="text-text-primary text-lg font-bold">{routine.name}</Text>
                    {routine.description && (
                      <Text className="text-text-tertiary text-xs mt-0.5" numberOfLines={1}>
                        {routine.description}
                      </Text>
                    )}
                    {routine.lastPerformedAt && (
                      <Text className="text-text-muted text-xs mt-1">
                        Last: {format(new Date(routine.lastPerformedAt), 'MMM d')}
                      </Text>
                    )}
                  </View>
                  <Pressable
                    onPress={() => handleMore(routine.id, routine.name)}
                    className="w-8 h-8 items-center justify-center -mt-1 -mr-2 active:opacity-60"
                  >
                    <MoreHorizontal size={20} color="#71717A" />
                  </Pressable>
                </View>

                {/* Actions */}
                <View className="flex-row gap-2 mt-1">
                  <Pressable
                    onPress={() =>
                      router.push(
                        `/workout/active?routineId=${routine.id}&routineName=${encodeURIComponent(routine.name)}`,
                      )
                    }
                    className="flex-1 bg-accent rounded-xl py-2.5 flex-row items-center justify-center gap-2 active:opacity-85"
                  >
                    <Play size={16} color="white" fill="white" />
                    <Text className="text-white font-semibold text-sm">Start</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => router.push(`/routine/${routine.id}`)}
                    className="w-10 h-10 bg-surface border border-border rounded-xl items-center justify-center active:opacity-70"
                  >
                    <Edit3 size={16} color="#A1A1AA" />
                  </Pressable>
                </View>
              </View>
            </View>
          ))}

          {/* Create new button at bottom */}
          {routines.length > 0 && (
            <Pressable
              onPress={() => router.push('/routine/create')}
              className="border border-dashed border-border rounded-2xl py-4 flex-row items-center justify-center gap-2 active:opacity-70"
            >
              <Plus size={18} color="#71717A" />
              <Text className="text-text-tertiary font-medium">Create Workout</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
