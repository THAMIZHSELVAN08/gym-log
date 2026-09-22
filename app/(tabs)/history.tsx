import { View, Text, Pressable, SectionList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Clock, Trophy } from 'lucide-react-native';
import { getAllWorkouts } from '../../src/db/queries/workouts';
import { formatDuration } from '../../src/utils/calculations';
import { format, isToday, isYesterday } from 'date-fns';

type Workout = Awaited<ReturnType<typeof getAllWorkouts>>[0];

interface WorkoutSection {
  title: string;
  data: Workout[];
}

function groupWorkoutsByDate(workouts: Workout[]): WorkoutSection[] {
  const groups: Record<string, Workout[]> = {};
  for (const w of workouts) {
    const d = new Date(w.startedAt);
    const key = format(d, 'yyyy-MM-dd');
    if (!groups[key]) groups[key] = [];
    groups[key]!.push(w);
  }
  return Object.entries(groups).map(([dateKey, items]) => {
    const d = new Date(dateKey);
    let title: string;
    if (isToday(d)) title = 'Today';
    else if (isYesterday(d)) title = 'Yesterday';
    else title = format(d, 'EEEE, MMMM d');
    return { title, data: items };
  });
}

export default function HistoryScreen() {
  const { data: allWorkouts = [], isLoading } = useQuery({
    queryKey: ['all-workouts'],
    queryFn: getAllWorkouts,
  });

  const sections = groupWorkoutsByDate(allWorkouts);

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-5 pt-4 pb-4">
        <Text className="text-text-tertiary text-xs uppercase tracking-widest font-semibold">Your</Text>
        <Text className="text-text-primary text-3xl font-bold tracking-tight">History</Text>
      </View>

      {!isLoading && allWorkouts.length === 0 && (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 rounded-full bg-card border border-border items-center justify-center mb-4">
            <Clock size={36} color="#F97316" />
          </View>
          <Text className="text-text-primary text-xl font-bold text-center mb-2">No workouts yet</Text>
          <Text className="text-text-tertiary text-sm text-center">
            Complete your first workout and it will appear here.
          </Text>
        </View>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        renderSectionHeader={({ section }) => (
          <View className="py-2 mt-2">
            <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest">
              {section.title}
            </Text>
          </View>
        )}
        renderItem={({ item: workout }) => (
          <Pressable
            onPress={() => router.push(`/workout/${workout.id}`)}
            className="bg-card border border-border rounded-2xl px-5 py-4 mb-3 active:opacity-80"
          >
            <View className="flex-row items-start justify-between mb-3">
              <View className="flex-1">
                <Text className="text-text-primary font-bold text-base">{workout.name}</Text>
                <Text className="text-text-tertiary text-xs mt-0.5">
                  {format(new Date(workout.startedAt), 'h:mm a')}
                  {workout.durationSeconds ? ` · ${formatDuration(workout.durationSeconds)}` : ''}
                </Text>
              </View>
              <ChevronRight size={16} color="#52525B" />
            </View>

            {/* Stats row */}
            <View className="flex-row gap-5">
              <View>
                <Text className="text-text-primary font-semibold text-sm">{workout.totalSets ?? 0}</Text>
                <Text className="text-text-muted text-xs">Sets</Text>
              </View>
              <View>
                <Text className="text-text-primary font-semibold text-sm">{workout.totalReps ?? 0}</Text>
                <Text className="text-text-muted text-xs">Reps</Text>
              </View>
              <View>
                <Text className="text-text-primary font-semibold text-sm">
                  {Math.round(workout.totalVolume ?? 0)} kg
                </Text>
                <Text className="text-text-muted text-xs">Volume</Text>
              </View>
              {(workout.prCount ?? 0) > 0 && (
                <View className="flex-row items-center gap-1">
                  <Trophy size={12} color="#F59E0B" />
                  <Text className="text-pr font-semibold text-sm">{workout.prCount}</Text>
                  <Text className="text-text-muted text-xs">PRs</Text>
                </View>
              )}
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
