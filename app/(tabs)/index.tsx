import { ScrollView, View, Text, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Play,
  Plus,
  RotateCcw,
  ChevronRight,
  Trophy,
  Flame,
  Dumbbell,
  Clock,
  TrendingUp,
  Zap,
} from 'lucide-react-native';
import {
  getRecentWorkouts,
  getWorkoutsInRange,
  getStreakStats,
} from '../../src/db/queries/workouts';
import { getRecentPrs } from '../../src/db/queries/prs';
import { getAllRoutines } from '../../src/db/queries/routines';
import { formatDuration } from '../../src/utils/calculations';
import { isToday, isYesterday, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay } from 'date-fns';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useState, useMemo } from 'react';

function formatWorkoutDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  const diff = Math.round((Date.now() - d.getTime()) / 86400000);
  if (diff < 7) return `${diff} days ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function getTimeGreeting(): { greeting: string; emoji: string } {
  const h = new Date().getHours();
  if (h >= 4 && h < 12) return { greeting: 'Good morning', emoji: '☀️' };
  if (h >= 12 && h < 17) return { greeting: 'Good afternoon', emoji: '⚡' };
  if (h >= 17 && h < 22) return { greeting: 'Good evening', emoji: '🔥' };
  return { greeting: 'Late night grind', emoji: '🌙' };
}

export default function HomeScreen() {
  const isWorkoutActive = useWorkoutStore((s) => s.isActive);
  const activeWorkoutName = useWorkoutStore((s) => s.workoutName);
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['recent-workouts'] }),
      qc.invalidateQueries({ queryKey: ['recent-prs'] }),
      qc.invalidateQueries({ queryKey: ['routines'] }),
      qc.invalidateQueries({ queryKey: ['week-workouts'] }),
      qc.invalidateQueries({ queryKey: ['streak-stats'] }),
    ]);
    setRefreshing(false);
  };

  const { data: recentWorkouts = [] } = useQuery({
    queryKey: ['recent-workouts'],
    queryFn: () => getRecentWorkouts(5),
  });

  const { data: recentPrs = [] } = useQuery({
    queryKey: ['recent-prs'],
    queryFn: () => getRecentPrs(1),
  });

  const { data: routines = [] } = useQuery({
    queryKey: ['routines'],
    queryFn: getAllRoutines,
  });

  const { data: streakStats } = useQuery({
    queryKey: ['streak-stats'],
    queryFn: getStreakStats,
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

  const lastWorkout = recentWorkouts[0] ?? null;
  const latestPr = recentPrs[0] ?? null;
  const currentStreak = streakStats?.currentStreak ?? 0;

  // Compute days of the current week (Mon-Sun)
  const weekDays = useMemo(() => {
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });

    return days.map((day) => {
      const hasWorkout = weekWorkouts.some((w) => isSameDay(new Date(w.startedAt), day));
      const isCurrentDay = isSameDay(day, now);
      return {
        label: format(day, 'EEEEE'), // M, T, W, T, F, S, S
        dayNumber: format(day, 'd'),
        hasWorkout,
        isCurrentDay,
      };
    });
  }, [weekWorkouts]);

  const handleStartRoutine = (routineId: string, routineName: string) => {
    router.push(`/workout/active?routineId=${routineId}&routineName=${encodeURIComponent(routineName)}`);
  };

  const handleStartEmpty = () => {
    router.push('/workout/active?empty=1');
  };

  const handleRepeatLast = () => {
    if (!lastWorkout) return;
    router.push(`/workout/active?repeatWorkoutId=${lastWorkout.id}&routineName=${encodeURIComponent(lastWorkout.name)}`);
  };

  const { greeting, emoji } = getTimeGreeting();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#F97316" />
        }
      >
        {/* ─── Hero Header ─────────────────────────────────────────────── */}
        <View className="px-5 pt-5 pb-3 flex-row items-center justify-between">
          <View>
            <Text className="text-text-tertiary text-xs font-semibold uppercase tracking-wider">
              {greeting} {emoji}
            </Text>
            <Text className="text-text-primary text-2xl font-bold tracking-tight mt-0.5">
              GymLog
            </Text>
          </View>

          {/* Streak pill */}
          <Pressable
            onPress={() => router.push('/(tabs)/progress')}
            style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
            className="flex-row items-center gap-1.5 bg-card border border-amber-500/30 px-3.5 py-1.5 rounded-full"
          >
            <Flame size={15} color="#F97316" fill={currentStreak > 0 ? '#F97316' : 'transparent'} />
            <Text className="text-text-primary font-bold text-xs">
              {currentStreak > 0 ? `${currentStreak}d Streak` : 'Start Streak'}
            </Text>
          </Pressable>
        </View>

        {/* ─── Weekly Momentum Tracker ─────────────────────────────────── */}
        <View className="mx-5 mb-5 bg-card border border-border rounded-2xl p-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider">
              Weekly Momentum
            </Text>
            <Text className="text-accent text-xs font-bold">
              {weekWorkouts.length} Session{weekWorkouts.length !== 1 ? 's' : ''}
            </Text>
          </View>

          <View className="flex-row justify-between items-center">
            {weekDays.map((item, idx) => (
              <View key={idx} className="items-center gap-1.5">
                <Text className="text-text-muted text-2xs font-semibold uppercase">
                  {item.label}
                </Text>
                <View
                  className={`w-9 h-9 rounded-full items-center justify-center border ${
                    item.hasWorkout
                      ? 'bg-accent border-accent shadow-sm'
                      : item.isCurrentDay
                      ? 'bg-surface border-accent/60'
                      : 'bg-surface border-border'
                  }`}
                >
                  {item.hasWorkout ? (
                    <Zap size={14} color="#FFFFFF" fill="#FFFFFF" />
                  ) : (
                    <Text
                      className={`text-xs font-bold ${
                        item.isCurrentDay ? 'text-accent' : 'text-text-tertiary'
                      }`}
                    >
                      {item.dayNumber}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ─── Active Workout Live Card ────────────────────────────────── */}
        {isWorkoutActive && (
          <Pressable
            onPress={() => router.push('/workout/active')}
            style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
            className="mx-5 mb-5 bg-accent rounded-2xl p-5 flex-row items-center justify-between shadow-lg"
          >
            <View className="flex-1 mr-3">
              <View className="flex-row items-center gap-2 mb-1">
                <View className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                <Text className="text-white/80 text-xs font-bold uppercase tracking-wider">
                  Workout In Progress
                </Text>
              </View>
              <Text className="text-white font-bold text-xl" numberOfLines={1}>
                {activeWorkoutName || 'Active Workout'}
              </Text>
            </View>
            <View className="bg-white px-4 py-2 rounded-xl">
              <Text className="text-accent font-bold text-sm">Resume →</Text>
            </View>
          </Pressable>
        )}

        {/* ─── Quick Start Hub ─────────────────────────────────────────── */}
        {!isWorkoutActive && (
          <View className="mb-5">
            <View className="px-5 mb-2.5 flex-row items-center justify-between">
              <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider">
                Quick Start
              </Text>
              <Pressable
                onPress={() => router.push('/(tabs)/workouts')}
                style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
              >
                <Text className="text-accent text-xs font-semibold">All Routines →</Text>
              </Pressable>
            </View>

            {/* Start Buttons */}
            <View className="px-5 flex-row gap-3 mb-3">
              <Pressable
                onPress={handleStartEmpty}
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                className="flex-1 bg-card border border-border rounded-2xl p-4 flex-row items-center gap-3"
              >
                <View className="w-10 h-10 rounded-xl bg-accent/15 items-center justify-center">
                  <Plus size={20} color="#F97316" />
                </View>
                <View className="flex-1">
                  <Text className="text-text-primary font-bold text-base">Empty</Text>
                  <Text className="text-text-muted text-xs">Custom log</Text>
                </View>
              </Pressable>

              {lastWorkout && (
                <Pressable
                  onPress={handleRepeatLast}
                  style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                  className="flex-1 bg-card border border-border rounded-2xl p-4 flex-row items-center gap-3"
                >
                  <View className="w-10 h-10 rounded-xl bg-blue-500/15 items-center justify-center">
                    <RotateCcw size={18} color="#3B82F6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-text-primary font-bold text-base">Repeat</Text>
                    <Text className="text-text-muted text-xs" numberOfLines={1}>
                      {lastWorkout.name}
                    </Text>
                  </View>
                </Pressable>
              )}
            </View>

            {/* Routine Chips Horizontal Carousel */}
            {routines.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
              >
                {routines.map((routine) => (
                  <Pressable
                    key={routine.id}
                    onPress={() => handleStartRoutine(routine.id, routine.name)}
                    style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
                    className="bg-card border border-border rounded-xl px-4 py-3 flex-row items-center gap-2.5"
                  >
                    <View
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: routine.colorHex || '#F97316' }}
                    />
                    <Text className="text-text-primary font-semibold text-sm">
                      {routine.name}
                    </Text>
                    <Play size={12} color="#A1A1AA" fill="#A1A1AA" />
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* ─── Last Workout Recap ──────────────────────────────────────── */}
        {lastWorkout && (
          <View className="px-5 mb-5">
            <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2.5">
              Recent Activity
            </Text>
            <Pressable
              onPress={() => router.push(`/workout/${lastWorkout.id}`)}
              style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
              className="bg-card border border-border rounded-2xl p-4"
            >
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-1 mr-2">
                  <Text className="text-text-primary font-bold text-lg mb-0.5">
                    {lastWorkout.name}
                  </Text>
                  <Text className="text-text-muted text-xs">
                    {formatWorkoutDate(lastWorkout.startedAt)}
                  </Text>
                </View>
                <ChevronRight size={18} color="#71717A" />
              </View>

              {/* Stats badges */}
              <View className="flex-row gap-2">
                {lastWorkout.durationSeconds ? (
                  <View className="bg-surface border border-border rounded-lg px-2.5 py-1.5 flex-row items-center gap-1.5">
                    <Clock size={12} color="#F97316" />
                    <Text className="text-text-secondary text-xs font-semibold">
                      {formatDuration(lastWorkout.durationSeconds)}
                    </Text>
                  </View>
                ) : null}

                <View className="bg-surface border border-border rounded-lg px-2.5 py-1.5 flex-row items-center gap-1.5">
                  <Dumbbell size={12} color="#3B82F6" />
                  <Text className="text-text-secondary text-xs font-semibold">
                    {lastWorkout.totalSets ?? 0} sets
                  </Text>
                </View>

                {lastWorkout.totalVolume ? (
                  <View className="bg-surface border border-border rounded-lg px-2.5 py-1.5 flex-row items-center gap-1.5">
                    <TrendingUp size={12} color="#10B981" />
                    <Text className="text-text-secondary text-xs font-semibold">
                      {lastWorkout.totalVolume >= 1000
                        ? `${(lastWorkout.totalVolume / 1000).toFixed(1)}t`
                        : `${Math.round(lastWorkout.totalVolume)} kg`}
                    </Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          </View>
        )}

        {/* ─── Recent PR Highlight ─────────────────────────────────────── */}
        {latestPr && (
          <View className="px-5 mb-4">
            <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2.5">
              Milestone Achievement
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)/progress')}
              style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
              className="bg-card border border-amber-500/25 rounded-2xl p-4 flex-row items-center gap-3.5"
            >
              <View className="w-11 h-11 rounded-2xl bg-amber-500/15 items-center justify-center">
                <Trophy size={22} color="#F59E0B" />
              </View>
              <View className="flex-1">
                <Text className="text-amber-500 font-bold text-xs uppercase tracking-wider">
                  Personal Record Broken
                </Text>
                <Text className="text-text-primary font-bold text-base mt-0.5">
                  {latestPr.weight ? `${latestPr.weight} kg` : ''}
                  {latestPr.reps ? ` × ${latestPr.reps} reps` : ''}
                </Text>
                <Text className="text-text-muted text-xs capitalize">
                  {latestPr.prType.replace(/_/g, ' ')}
                </Text>
              </View>
              <ChevronRight size={16} color="#71717A" />
            </Pressable>
          </View>
        )}

        {/* ─── Empty state ─────────────────────────────────────────────── */}
        {recentWorkouts.length === 0 && !isWorkoutActive && (
          <View className="px-8 items-center py-12">
            <View className="w-16 h-16 rounded-full bg-surface border border-border items-center justify-center mb-4">
              <Dumbbell size={28} color="#F97316" />
            </View>
            <Text className="text-text-primary text-xl font-bold text-center mb-2">
              Ready for your first workout?
            </Text>
            <Text className="text-text-muted text-sm text-center mb-6 leading-5">
              Log your exercises, track weights & reps, and break personal records.
            </Text>
            <Pressable
              onPress={handleStartEmpty}
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
              className="bg-accent px-8 py-3.5 rounded-full shadow-lg"
            >
              <Text className="text-white font-bold text-base">Start First Workout</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
