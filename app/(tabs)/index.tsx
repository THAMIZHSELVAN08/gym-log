import { ScrollView, View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Play, Plus, Dumbbell, Trophy, Flame, ChevronRight, BarChart3 } from 'lucide-react-native';
import { getRecentWorkouts, getWorkoutsInRange } from '../../src/db/queries/workouts';
import { getLatestMeasurement } from '../../src/db/queries/measurements';
import { getRecentPrs } from '../../src/db/queries/prs';
import { getAllRoutines } from '../../src/db/queries/routines';
import { formatDuration } from '../../src/utils/calculations';
import { format, startOfWeek, endOfWeek, isToday, isYesterday } from 'date-fns';
import { useWorkoutStore } from '../../src/store/workoutStore';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatWorkoutDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d');
}

export default function HomeScreen() {
  const isWorkoutActive = useWorkoutStore((s) => s.isActive);
  const activeWorkoutName = useWorkoutStore((s) => s.workoutName);

  const { data: recentWorkouts = [] } = useQuery({
    queryKey: ['recent-workouts'],
    queryFn: () => getRecentWorkouts(5),
  });

  const { data: recentPrs = [] } = useQuery({
    queryKey: ['recent-prs'],
    queryFn: () => getRecentPrs(3),
  });

  const { data: bodyWeight } = useQuery({
    queryKey: ['body-weight'],
    queryFn: () => getLatestMeasurement('weight'),
  });

  const { data: routines = [] } = useQuery({
    queryKey: ['routines'],
    queryFn: getAllRoutines,
  });

  const { data: weekWorkouts = [] } = useQuery({
    queryKey: ['week-workouts'],
    queryFn: () => {
      const now = new Date();
      const start = startOfWeek(now, { weekStartsOn: 1 });
      const end = endOfWeek(now, { weekStartsOn: 1 });
      return getWorkoutsInRange(start.toISOString(), end.toISOString());
    },
  });

  const weekVolume = weekWorkouts.reduce((sum, w) => sum + (w.totalVolume ?? 0), 0);
  const weekPrs = weekWorkouts.reduce((sum, w) => sum + (w.prCount ?? 0), 0);
  const lastWorkout = recentWorkouts[0];

  // Workout streak (simple: consecutive days with at least one workout)
  const streak = (() => {
    if (recentWorkouts.length === 0) return 0;
    let count = 0;
    let checkDate = new Date();
    for (const w of recentWorkouts) {
      const wDate = new Date(w.startedAt);
      const diffDays = Math.floor((checkDate.getTime() - wDate.getTime()) / 86400000);
      if (diffDays <= 1) {
        count++;
        checkDate = wDate;
      } else break;
    }
    return count;
  })();

  const handleStartEmpty = async () => {
    router.push('/workout/active?empty=1');
  };

  const handleStartRoutine = (routineId: string, routineName: string) => {
    router.push(`/workout/active?routineId=${routineId}&routineName=${encodeURIComponent(routineName)}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-2">
          <Text className="text-text-tertiary text-sm">{getGreeting()} 👋</Text>
          <Text className="text-text-primary text-3xl font-bold mt-1 tracking-tight">GymLog</Text>
        </View>

        {/* Active workout banner */}
        {isWorkoutActive && (
          <Pressable
            onPress={() => router.push('/workout/active')}
            className="mx-4 mb-4 mt-2 bg-accent rounded-2xl px-5 py-4 flex-row items-center justify-between active:opacity-90"
          >
            <View>
              <Text className="text-white text-xs opacity-80 mb-0.5">ACTIVE WORKOUT</Text>
              <Text className="text-white text-lg font-bold">{activeWorkoutName || 'Workout'}</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
              <ChevronRight size={20} color="white" />
            </View>
          </Pressable>
        )}

        {/* Start Workout Section */}
        {!isWorkoutActive && (
          <View className="px-4 mb-5 mt-2">
            <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-3">
              Start Workout
            </Text>

            {/* Quick start: today's suggested routine */}
            {routines.length > 0 && (
              <Pressable
                onPress={() => handleStartRoutine(routines[0]!.id, routines[0]!.name)}
                className="bg-accent rounded-2xl px-5 py-4 mb-3 active:opacity-90"
              >
                <Text className="text-white/70 text-xs mb-1 uppercase tracking-widest">Today&#39;s Workout</Text>
                <Text className="text-white text-xl font-bold">{routines[0]!.name}</Text>
                <View className="flex-row items-center mt-3 gap-2">
                  <Play size={16} color="white" fill="white" />
                  <Text className="text-white font-semibold">Start Workout</Text>
                </View>
              </Pressable>
            )}

            {/* Empty workout */}
            <Pressable
              onPress={handleStartEmpty}
              className="bg-card border border-border rounded-2xl px-5 py-4 flex-row items-center justify-between active:opacity-80"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-accent/10 items-center justify-center">
                  <Plus size={20} color="#F97316" />
                </View>
                <View>
                  <Text className="text-text-primary font-semibold">Empty Workout</Text>
                  <Text className="text-text-tertiary text-xs">Choose exercises as you go</Text>
                </View>
              </View>
              <ChevronRight size={18} color="#71717A" />
            </Pressable>
          </View>
        )}

        {/* Weekly Stats */}
        <View className="px-4 mb-5">
          <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-3">
            This Week
          </Text>
          <View className="flex-row gap-3">
            <View className="flex-1 bg-card border border-border rounded-xl p-4">
              <Flame size={18} color="#F97316" />
              <Text className="text-text-primary text-2xl font-bold mt-2">{weekWorkouts.length}</Text>
              <Text className="text-text-tertiary text-xs mt-0.5">Workouts</Text>
            </View>
            <View className="flex-1 bg-card border border-border rounded-xl p-4">
              <Dumbbell size={18} color="#F97316" />
              <Text className="text-text-primary text-2xl font-bold mt-2">
                {weekVolume > 1000 ? `${(weekVolume / 1000).toFixed(1)}t` : `${Math.round(weekVolume)}kg`}
              </Text>
              <Text className="text-text-tertiary text-xs mt-0.5">Volume</Text>
            </View>
            <View className="flex-1 bg-card border border-border rounded-xl p-4">
              <Trophy size={18} color="#F59E0B" />
              <Text className="text-text-primary text-2xl font-bold mt-2">{weekPrs}</Text>
              <Text className="text-text-tertiary text-xs mt-0.5">PRs</Text>
            </View>
          </View>

          {/* Streak */}
          {streak > 0 && (
            <View className="mt-3 bg-accent/10 border border-accent/20 rounded-xl px-4 py-3 flex-row items-center gap-3">
              <Flame size={20} color="#F97316" />
              <Text className="text-accent font-semibold">{streak} day streak 🔥</Text>
            </View>
          )}
        </View>

        {/* Body Weight */}
        {bodyWeight && (
          <View className="px-4 mb-5">
            <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-3">
              Body Weight
            </Text>
            <View className="bg-card border border-border rounded-xl px-5 py-4">
              <Text className="text-text-primary text-3xl font-bold">{bodyWeight.value} <Text className="text-text-tertiary text-xl">{bodyWeight.unit}</Text></Text>
              <Text className="text-text-tertiary text-xs mt-1">Logged {formatWorkoutDate(bodyWeight.measuredAt)}</Text>
            </View>
          </View>
        )}

        {/* Recent PRs */}
        {recentPrs.length > 0 && (
          <View className="px-4 mb-5">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest">
                Recent PRs
              </Text>
              <Pressable onPress={() => router.push('/progress')}>
                <Text className="text-accent text-xs font-medium">See all</Text>
              </Pressable>
            </View>
            {recentPrs.map((pr) => (
              <View
                key={pr.id}
                className="bg-card border border-border rounded-xl px-4 py-3 mb-2 flex-row items-center gap-3"
              >
                <View className="w-8 h-8 rounded-full bg-pr/15 items-center justify-center">
                  <Trophy size={16} color="#F59E0B" />
                </View>
                <View className="flex-1">
                  <Text className="text-text-primary text-sm font-semibold">{pr.prType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</Text>
                  <Text className="text-text-tertiary text-xs">{pr.weight ? `${pr.weight} kg` : ''}{pr.reps ? ` × ${pr.reps}` : ''}</Text>
                </View>
                <Text className="text-text-muted text-xs">{formatWorkoutDate(pr.achievedAt)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Last Workout */}
        {lastWorkout && (
          <View className="px-4 mb-5">
            <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-3">
              Last Workout
            </Text>
            <Pressable
              onPress={() => router.push(`/workout/${lastWorkout.id}`)}
              className="bg-card border border-border rounded-xl px-5 py-4 active:opacity-80"
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-text-primary font-bold text-base">{lastWorkout.name}</Text>
                <Text className="text-text-muted text-xs">{formatWorkoutDate(lastWorkout.startedAt)}</Text>
              </View>
              <View className="flex-row gap-4">
                <View>
                  <Text className="text-text-primary font-semibold text-sm">{lastWorkout.totalSets}</Text>
                  <Text className="text-text-tertiary text-xs">Sets</Text>
                </View>
                <View>
                  <Text className="text-text-primary font-semibold text-sm">{Math.round(lastWorkout.totalVolume ?? 0)} kg</Text>
                  <Text className="text-text-tertiary text-xs">Volume</Text>
                </View>
                {lastWorkout.durationSeconds && (
                  <View>
                    <Text className="text-text-primary font-semibold text-sm">{formatDuration(lastWorkout.durationSeconds)}</Text>
                    <Text className="text-text-tertiary text-xs">Duration</Text>
                  </View>
                )}
              </View>
            </Pressable>
          </View>
        )}

        {/* My Routines quick access */}
        {routines.length > 0 && (
          <View className="px-4 mb-5">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest">My Routines</Text>
              <Pressable onPress={() => router.push('/workouts')}>
                <Text className="text-accent text-xs font-medium">See all</Text>
              </Pressable>
            </View>
            {routines.slice(0, 3).map((r) => (
              <Pressable
                key={r.id}
                onPress={() => handleStartRoutine(r.id, r.name)}
                className="bg-card border border-border rounded-xl px-4 py-3.5 mb-2 flex-row items-center justify-between active:opacity-80"
              >
                <View className="flex-row items-center gap-3">
                  <View className="w-8 h-8 rounded-full bg-accent/10 items-center justify-center">
                    <Dumbbell size={16} color="#F97316" />
                  </View>
                  <Text className="text-text-primary font-medium">{r.name}</Text>
                </View>
                <Play size={16} color="#F97316" fill="#F97316" />
              </Pressable>
            ))}
          </View>
        )}

        {/* Empty state if no workouts yet */}
        {recentWorkouts.length === 0 && !isWorkoutActive && (
          <View className="px-4 items-center py-8">
            <View className="w-20 h-20 rounded-full bg-card border border-border items-center justify-center mb-4">
              <BarChart3 size={36} color="#F97316" />
            </View>
            <Text className="text-text-primary text-xl font-bold text-center mb-2">Ready to start?</Text>
            <Text className="text-text-tertiary text-sm text-center mb-6 max-w-xs">
              Log your first workout and GymLog will track your progress and personal records.
            </Text>
            <Pressable
              onPress={handleStartEmpty}
              className="bg-accent px-8 py-3.5 rounded-full active:opacity-90"
            >
              <Text className="text-white font-bold text-base">Start First Workout</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
