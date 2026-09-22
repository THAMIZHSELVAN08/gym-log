import { ScrollView, View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Play,
  Plus,
  Dumbbell,
  Trophy,
  Flame,
  ChevronRight,
  BarChart3,
  RotateCcw,
  Clock,
  Layers,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Zap,
  Activity,
} from 'lucide-react-native';
import {
  getRecentWorkouts,
  getWorkoutsInRange,
  getLastWorkoutMuscles,
  getMusclesRecovery,
  getStreakStats,
} from '../../src/db/queries/workouts';
import { getLatestMeasurement, getWeightHistory } from '../../src/db/queries/measurements';
import { getRecentPrs } from '../../src/db/queries/prs';
import { getAllRoutines } from '../../src/db/queries/routines';
import { formatDuration } from '../../src/utils/calculations';
import { format, startOfWeek, endOfWeek, isToday, isYesterday } from 'date-fns';
import { useWorkoutStore } from '../../src/store/workoutStore';

function formatWorkoutDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d');
}

const MOTIVATIONAL_QUOTES = [
  "Thamizh, the barbell never lies — 1% better every single day.",
  "Heavy weights, quiet mind. Lock in today, Thamizh.",
  "No bad workouts, Thamizh. Showing up is already half the battle.",
  "Progress isn't given, Thamizh. It's earned set by set.",
  "Discipline beats motivation every single time. Let's work, Thamizh.",
  "Today's soreness is tomorrow's strength. Keep building, Thamizh.",
  "Stay hungry, stay consistent. Greatness is in the reps, Thamizh.",
  "The only bad workout is the one that didn't happen. Let's get it, Thamizh!",
];

function getDailyQuote(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length]!;
}

function getSmartGreeting(
  streak: number,
  daysSinceLast: number | null,
  hasTrainedToday: boolean,
  hasWorkouts: boolean
): { title: string; subtitle: string; timeTag: string } {
  const h = new Date().getHours();
  let timeGreeting = '';
  let timeTag = 'Morning';

  if (h >= 4 && h < 12) {
    timeGreeting = 'Good morning, Thamizh 🌅';
    timeTag = 'Morning Focus';
  } else if (h >= 12 && h < 17) {
    timeGreeting = 'Good afternoon, Thamizh ☀️';
    timeTag = 'Afternoon Grind';
  } else if (h >= 17 && h < 22) {
    timeGreeting = 'Good evening, Thamizh 🌆';
    timeTag = 'Evening Session';
  } else {
    timeGreeting = 'Late-night beast mode, Thamizh 🌙';
    timeTag = 'Night Warrior';
  }

  let subtitle = '';
  if (!hasWorkouts) {
    subtitle = 'Welcome to GymLog! Ready for Day 1? 🚀';
  } else if (hasTrainedToday) {
    subtitle = 'Session logged today! Rest up and fuel the gains 🏆';
  } else if (streak > 1) {
    subtitle = `You're on a ${streak} day streak 🔥 — don't break the momentum!`;
  } else if (streak === 1) {
    subtitle = "1 day streak started 🔥 — let's keep the chain going!";
  } else if (daysSinceLast !== null && daysSinceLast >= 2) {
    subtitle = "Missed yesterday — perfect day to bounce back 💪";
  } else {
    subtitle = "Ready to crush today's session? Let's get after it ⚡";
  }

  return { title: timeGreeting, subtitle, timeTag };
}

function getStreakTheme(streak: number) {
  if (streak >= 7) {
    return {
      container: 'bg-yellow-500/10 border-yellow-500/30',
      badge: 'bg-yellow-500/20 text-yellow-500',
      bar: '#EAB308',
      iconColor: '#EAB308',
      textColor: 'text-yellow-500',
      tag: '🏆 Gold Milestone',
    };
  }
  if (streak >= 4) {
    return {
      container: 'bg-amber-500/10 border-amber-500/30',
      badge: 'bg-amber-500/20 text-amber-500',
      bar: '#F59E0B',
      iconColor: '#F59E0B',
      textColor: 'text-amber-500',
      tag: '🔥 On Fire',
    };
  }
  return {
    container: 'bg-accent/10 border-accent/25',
    badge: 'bg-accent/20 text-accent',
    bar: '#F97316',
    iconColor: '#F97316',
    textColor: 'text-accent',
    tag: '⚡ Building Streak',
  };
}

export default function HomeScreen() {
  const isWorkoutActive = useWorkoutStore((s) => s.isActive);
  const activeWorkoutName = useWorkoutStore((s) => s.workoutName);

  const { data: recentWorkouts = [] } = useQuery({
    queryKey: ['recent-workouts'],
    queryFn: () => getRecentWorkouts(5),
  });

  const { data: streakStats } = useQuery({
    queryKey: ['streak-stats'],
    queryFn: getStreakStats,
  });

  const { data: recentPrs = [] } = useQuery({
    queryKey: ['recent-prs'],
    queryFn: () => getRecentPrs(3),
  });

  const { data: bodyWeight } = useQuery({
    queryKey: ['body-weight'],
    queryFn: () => getLatestMeasurement('weight'),
  });

  const { data: weightHistory = [] } = useQuery({
    queryKey: ['weight-history'],
    queryFn: () => getWeightHistory(7),
  });

  const { data: routines = [] } = useQuery({
    queryKey: ['routines'],
    queryFn: getAllRoutines,
  });

  const { data: recoveryList = [] } = useQuery({
    queryKey: ['muscles-recovery'],
    queryFn: getMusclesRecovery,
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

  const lastWorkout = recentWorkouts[0];

  const { data: lastWorkoutMuscles = [] } = useQuery({
    queryKey: ['last-workout-muscles', lastWorkout?.id],
    queryFn: () => (lastWorkout ? getLastWorkoutMuscles(lastWorkout.id) : Promise.resolve([])),
    enabled: !!lastWorkout,
  });

  // Week metrics
  const weekVolume = weekWorkouts.reduce((sum, w) => sum + (w.totalVolume ?? 0), 0);
  const weekSets = weekWorkouts.reduce((sum, w) => sum + (w.totalSets ?? 0), 0);
  const weekDurations = weekWorkouts.map((w) => w.durationSeconds ?? 0).filter((d) => d > 0);
  const weekAvgDuration =
    weekDurations.length > 0
      ? Math.round(weekDurations.reduce((a, b) => a + b, 0) / weekDurations.length)
      : 0;

  // Streak values
  const currentStreak = streakStats?.currentStreak ?? 0;
  const bestStreak = streakStats?.bestStreak ?? currentStreak;
  const daysSinceLast = streakStats?.daysSinceLastWorkout ?? null;
  const hasTrainedToday = streakStats?.hasTrainedToday ?? false;

  const greeting = getSmartGreeting(
    currentStreak,
    daysSinceLast,
    hasTrainedToday,
    recentWorkouts.length > 0
  );
  const streakTheme = getStreakTheme(currentStreak);
  const streakProgress = Math.min(100, Math.round((currentStreak / Math.max(bestStreak, 1)) * 100));

  // Up Next muscle suggestion
  const upNextSuggestion = (() => {
    if (recoveryList.length === 0) return null;
    const sorted = [...recoveryList].sort((a, b) => {
      if (a.daysAgo === null && b.daysAgo === null) return 0;
      if (a.daysAgo === null) return -1;
      if (b.daysAgo === null) return 1;
      return b.daysAgo - a.daysAgo;
    });
    const target = sorted[0];
    if (!target) return null;

    const name = target.muscle.charAt(0).toUpperCase() + target.muscle.slice(1);
    if (target.daysAgo === null) {
      return {
        muscle: name,
        message: `Haven't logged ${name} yet — time to attack it!`,
        tag: 'Fresh',
      };
    }
    if (target.daysAgo >= 4) {
      return {
        muscle: name,
        message: `Haven't trained ${name} in ${target.daysAgo} days — fully recovered!`,
        tag: `${target.daysAgo}d Rested`,
      };
    }
    return {
      muscle: name,
      message: `${name} is rested and ready for progressive overload.`,
      tag: 'Ready',
    };
  })();

  // Weight sparkline delta
  const weightDelta =
    weightHistory.length >= 2 && weightHistory[0] && weightHistory[1]
      ? Math.round((weightHistory[0].value - weightHistory[1].value) * 10) / 10
      : null;

  const handleStartEmpty = () => {
    router.push('/workout/active?empty=1');
  };

  const handleRepeatLast = () => {
    if (!lastWorkout) return;
    router.push(
      `/workout/active?repeatWorkoutId=${lastWorkout.id}&routineName=${encodeURIComponent(lastWorkout.name)}`
    );
  };

  const handleStartRoutine = (routineId: string, routineName: string) => {
    router.push(`/workout/active?routineId=${routineId}&routineName=${encodeURIComponent(routineName)}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── 1. Smart Greeting Header ────────────────────────────────────────── */}
        <View className="px-5 pt-4 pb-2">
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-row items-center gap-1.5">
              <Zap size={14} color="#F97316" />
              <Text className="text-accent text-xs font-bold uppercase tracking-wider">
                {greeting.timeTag}
              </Text>
            </View>
            <View className="bg-surface border border-border px-2.5 py-0.5 rounded-full">
              <Text className="text-text-muted text-2xs font-semibold">Thamizh</Text>
            </View>
          </View>
          <Text className="text-text-primary text-2xl font-bold tracking-tight">
            {greeting.title}
          </Text>
          <Text className="text-text-secondary text-sm mt-1 leading-snug">
            {greeting.subtitle}
          </Text>
        </View>

        {/* ─── 2. Active Workout Banner ───────────────────────────────────────── */}
        {isWorkoutActive && (
          <Pressable
            onPress={() => router.push('/workout/active')}
            className="mx-4 mb-4 mt-2 bg-accent rounded-2xl px-5 py-4 flex-row items-center justify-between active:opacity-90 shadow-md shadow-accent/20"
          >
            <View className="flex-1 mr-3">
              <View className="flex-row items-center gap-2 mb-0.5">
                <View className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                <Text className="text-white text-xs font-bold uppercase tracking-widest">
                  Active Workout In Progress
                </Text>
              </View>
              <Text className="text-white text-lg font-bold" numberOfLines={1}>
                {activeWorkoutName || 'Workout'}
              </Text>
            </View>
            <View className="bg-white/20 rounded-xl px-3 py-1.5 flex-row items-center gap-1">
              <Text className="text-white text-xs font-bold">Resume</Text>
              <ChevronRight size={16} color="white" />
            </View>
          </Pressable>
        )}

        {/* ─── 3. Rich Streak Banner ──────────────────────────────────────────── */}
        {currentStreak > 0 && (
          <View className={`mx-4 mb-4 mt-1 border rounded-2xl p-4 ${streakTheme.container}`}>
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-2">
                <Flame size={20} color={streakTheme.iconColor} />
                <Text className={`font-bold text-base ${streakTheme.textColor}`}>
                  {currentStreak} Day Streak 🔥
                </Text>
              </View>
              <View className="bg-surface/80 border border-border px-2.5 py-1 rounded-lg">
                <Text className="text-text-secondary text-xs font-semibold">
                  Best: <Text className="text-text-primary font-bold">{bestStreak}d</Text>
                </Text>
              </View>
            </View>

            {/* Progress bar to best streak */}
            <View className="h-2 bg-surface rounded-full overflow-hidden mb-2">
              <View
                className="h-full rounded-full"
                style={{ width: `${Math.max(8, streakProgress)}%`, backgroundColor: streakTheme.bar }}
              />
            </View>

            <View className="flex-row items-center justify-between">
              <Text className="text-text-tertiary text-2xs font-medium">
                {currentStreak >= bestStreak
                  ? '👑 All-time record streak! Keep dominating.'
                  : `${bestStreak - currentStreak} days to match your all-time record`}
              </Text>
              <View className="flex-row items-center gap-1">
                <ShieldCheck size={12} color="#71717A" />
                <Text className="text-text-muted text-2xs">Streak Insurance 🛡️</Text>
              </View>
            </View>
          </View>
        )}

        {/* ─── 4. Quick Start Improvements ────────────────────────────────────── */}
        {!isWorkoutActive && (
          <View className="px-4 mb-5 mt-1">
            <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-3">
              Quick Start
            </Text>

            <View className="flex-row gap-3 mb-3">
              {/* Empty Workout */}
              <Pressable
                onPress={handleStartEmpty}
                className="flex-1 bg-card border border-border rounded-2xl p-4 active:opacity-80 justify-between"
              >
                <View className="w-10 h-10 rounded-xl bg-accent/10 items-center justify-center mb-3">
                  <Plus size={20} color="#F97316" />
                </View>
                <View>
                  <Text className="text-text-primary font-bold text-base">Empty Workout</Text>
                  <Text className="text-text-tertiary text-xs mt-0.5">Choose as you go</Text>
                </View>
              </Pressable>

              {/* Repeat Last Workout */}
              {lastWorkout ? (
                <Pressable
                  onPress={handleRepeatLast}
                  className="flex-1 bg-accent/10 border border-accent/25 rounded-2xl p-4 active:opacity-80 justify-between"
                >
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="w-10 h-10 rounded-xl bg-accent items-center justify-center shadow-sm">
                      <RotateCcw size={18} color="white" />
                    </View>
                    <View className="bg-accent/20 px-2 py-0.5 rounded-full">
                      <Text className="text-accent text-2xs font-bold">1-TAP</Text>
                    </View>
                  </View>
                  <View>
                    <Text className="text-text-primary font-bold text-base" numberOfLines={1}>
                      Repeat Last
                    </Text>
                    <Text className="text-accent text-xs font-medium mt-0.5" numberOfLines={1}>
                      {lastWorkout.name}
                    </Text>
                  </View>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => router.push('/workouts')}
                  className="flex-1 bg-card border border-border rounded-2xl p-4 active:opacity-80 justify-between"
                >
                  <View className="w-10 h-10 rounded-xl bg-blue-500/10 items-center justify-center mb-3">
                    <Dumbbell size={20} color="#3B82F6" />
                  </View>
                  <View>
                    <Text className="text-text-primary font-bold text-base">Templates</Text>
                    <Text className="text-text-tertiary text-xs mt-0.5">Explore routines</Text>
                  </View>
                </Pressable>
              )}
            </View>

            {/* Routine quick chips */}
            {routines.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
              >
                {routines.map((r) => (
                  <Pressable
                    key={r.id}
                    onPress={() => handleStartRoutine(r.id, r.name)}
                    className="bg-card border border-border rounded-xl px-3.5 py-2.5 flex-row items-center gap-2 active:opacity-75"
                  >
                    <Play size={13} color="#F97316" fill="#F97316" />
                    <Text className="text-text-primary font-semibold text-xs">{r.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* ─── 5. Up Next Muscle Suggestion ───────────────────────────────────── */}
        {upNextSuggestion && (
          <View className="px-4 mb-5">
            <View className="bg-card border border-border rounded-2xl p-4">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-2">
                  <Activity size={16} color="#F97316" />
                  <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider">
                    Up Next Focus
                  </Text>
                </View>
                <View className="bg-surface border border-border px-2 py-0.5 rounded-md">
                  <Text className="text-accent text-2xs font-bold">{upNextSuggestion.tag}</Text>
                </View>
              </View>

              <Text className="text-text-primary font-bold text-base mb-1">
                {upNextSuggestion.muscle} Day
              </Text>
              <Text className="text-text-tertiary text-xs mb-3">
                {upNextSuggestion.message}
              </Text>

              <Pressable
                onPress={handleStartEmpty}
                className="bg-surface border border-border rounded-xl py-2 px-3 flex-row items-center justify-between active:opacity-70"
              >
                <Text className="text-text-primary text-xs font-semibold">Start {upNextSuggestion.muscle} Workout</Text>
                <ChevronRight size={14} color="#71717A" />
              </Pressable>
            </View>
          </View>
        )}

        {/* ─── 6. "This Week" 4-Stat Grid (Clickable) ─────────────────────────── */}
        <View className="px-4 mb-5">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest">
              This Week
            </Text>
            <Pressable onPress={() => router.push('/progress')} className="flex-row items-center gap-1">
              <Text className="text-accent text-xs font-medium">Full Analytics</Text>
              <ChevronRight size={14} color="#F97316" />
            </Pressable>
          </View>

          <View className="flex-row flex-wrap gap-2.5">
            {/* 1. Workouts */}
            <Pressable
              onPress={() => router.push('/progress')}
              className="flex-1 min-w-[46%] bg-card border border-border rounded-xl p-3.5 active:opacity-80"
            >
              <View className="flex-row items-center justify-between mb-1.5">
                <Flame size={16} color="#F97316" />
                <ChevronRight size={12} color="#71717A" />
              </View>
              <Text className="text-text-primary text-2xl font-bold">
                {weekWorkouts.length}<Text className="text-text-tertiary text-base font-normal">/5</Text>
              </Text>
              <Text className="text-text-tertiary text-xs mt-0.5">Workouts Target</Text>
            </Pressable>

            {/* 2. Volume */}
            <Pressable
              onPress={() => router.push('/progress')}
              className="flex-1 min-w-[46%] bg-card border border-border rounded-xl p-3.5 active:opacity-80"
            >
              <View className="flex-row items-center justify-between mb-1.5">
                <Dumbbell size={16} color="#F97316" />
                <ChevronRight size={12} color="#71717A" />
              </View>
              <Text className="text-text-primary text-2xl font-bold">
                {weekVolume > 1000 ? `${(weekVolume / 1000).toFixed(1)}t` : `${Math.round(weekVolume)}kg`}
              </Text>
              <Text className="text-text-tertiary text-xs mt-0.5">Total Volume</Text>
            </Pressable>

            {/* 3. Total Sets */}
            <Pressable
              onPress={() => router.push('/progress')}
              className="flex-1 min-w-[46%] bg-card border border-border rounded-xl p-3.5 active:opacity-80"
            >
              <View className="flex-row items-center justify-between mb-1.5">
                <Layers size={16} color="#F97316" />
                <ChevronRight size={12} color="#71717A" />
              </View>
              <Text className="text-text-primary text-2xl font-bold">{weekSets}</Text>
              <Text className="text-text-tertiary text-xs mt-0.5">Total Sets</Text>
            </Pressable>

            {/* 4. Avg Duration */}
            <Pressable
              onPress={() => router.push('/progress')}
              className="flex-1 min-w-[46%] bg-card border border-border rounded-xl p-3.5 active:opacity-80"
            >
              <View className="flex-row items-center justify-between mb-1.5">
                <Clock size={16} color="#F97316" />
                <ChevronRight size={12} color="#71717A" />
              </View>
              <Text className="text-text-primary text-2xl font-bold">
                {weekAvgDuration > 0 ? formatDuration(weekAvgDuration) : '—'}
              </Text>
              <Text className="text-text-tertiary text-xs mt-0.5">Avg Duration</Text>
            </Pressable>
          </View>
        </View>

        {/* ─── 7. Body Weight + Mini Sparkline ─────────────────────────────────── */}
        {bodyWeight && (
          <View className="px-4 mb-5">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest">
                Body Weight
              </Text>
              <Pressable onPress={() => router.push('/profile')}>
                <Text className="text-accent text-xs font-medium">Log weight</Text>
              </Pressable>
            </View>

            <View className="bg-card border border-border rounded-2xl p-4">
              <View className="flex-row items-end justify-between">
                <View>
                  <Text className="text-text-primary text-3xl font-bold">
                    {bodyWeight.value}{' '}
                    <Text className="text-text-tertiary text-lg font-normal">{bodyWeight.unit}</Text>
                  </Text>
                  <Text className="text-text-tertiary text-xs mt-1">
                    Logged {formatWorkoutDate(bodyWeight.measuredAt)}
                  </Text>
                </View>

                {weightDelta !== null && (
                  <View
                    className={`flex-row items-center gap-1 px-2.5 py-1 rounded-lg ${
                      weightDelta <= 0 ? 'bg-emerald-500/10' : 'bg-accent/10'
                    }`}
                  >
                    <TrendingUp size={12} color={weightDelta <= 0 ? '#10B981' : '#F97316'} />
                    <Text
                      className={`text-xs font-bold ${
                        weightDelta <= 0 ? 'text-emerald-500' : 'text-accent'
                      }`}
                    >
                      {weightDelta > 0 ? `+${weightDelta}` : `${weightDelta}`} {bodyWeight.unit}
                    </Text>
                  </View>
                )}
              </View>

              {/* Mini Sparkline Bar Visualization */}
              {weightHistory.length > 1 && (
                <View className="mt-4 pt-3 border-t border-border/60">
                  <View className="flex-row items-end justify-between h-8 gap-1.5 px-1">
                    {[...weightHistory].reverse().map((entry, idx) => {
                      const allVals = weightHistory.map((w) => w.value);
                      const min = Math.min(...allVals);
                      const max = Math.max(...allVals);
                      const range = max - min || 1;
                      const heightPercent = Math.max(25, Math.round(((entry.value - min) / range) * 100));
                      const isLast = idx === weightHistory.length - 1;

                      return (
                        <View key={entry.id} className="flex-1 items-center justify-end h-full">
                          <View
                            className={`w-full rounded-sm ${isLast ? 'bg-accent' : 'bg-surface'}`}
                            style={{ height: `${heightPercent}%` }}
                          />
                        </View>
                      );
                    })}
                  </View>
                  <View className="flex-row justify-between mt-1 px-1">
                    <Text className="text-text-muted text-2xs">Earlier</Text>
                    <Text className="text-accent text-2xs font-semibold">Latest</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ─── 8. Last Workout Card with Muscle Tags ───────────────────────────── */}
        {lastWorkout && (
          <View className="px-4 mb-5">
            <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-3">
              Last Workout
            </Text>
            <Pressable
              onPress={() => router.push(`/workout/${lastWorkout.id}`)}
              className="bg-card border border-border rounded-2xl p-4 active:opacity-80"
            >
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-text-primary font-bold text-lg">{lastWorkout.name}</Text>
                <Text className="text-text-muted text-xs">{formatWorkoutDate(lastWorkout.startedAt)}</Text>
              </View>

              {/* Muscle Group Chips */}
              {lastWorkoutMuscles.length > 0 && (
                <View className="flex-row items-center gap-1.5 mb-3 flex-wrap">
                  {lastWorkoutMuscles.map((muscle) => (
                    <View
                      key={muscle}
                      className="bg-surface border border-border px-2 py-0.5 rounded-md"
                    >
                      <Text className="text-accent text-2xs font-semibold capitalize">
                        {muscle.replace(/_/g, ' ')}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <View className="flex-row gap-5 pt-2 border-t border-border/50">
                <View>
                  <Text className="text-text-primary font-bold text-sm">{lastWorkout.totalSets}</Text>
                  <Text className="text-text-tertiary text-2xs">Sets</Text>
                </View>
                <View>
                  <Text className="text-text-primary font-bold text-sm">
                    {Math.round(lastWorkout.totalVolume ?? 0)} kg
                  </Text>
                  <Text className="text-text-tertiary text-2xs">Volume</Text>
                </View>
                {lastWorkout.durationSeconds ? (
                  <View>
                    <Text className="text-text-primary font-bold text-sm">
                      {formatDuration(lastWorkout.durationSeconds)}
                    </Text>
                    <Text className="text-text-tertiary text-2xs">Duration</Text>
                  </View>
                ) : null}
              </View>

              <View className="flex-row items-center justify-end mt-2 pt-2 gap-1">
                <Text className="text-accent text-xs font-semibold">View breakdown</Text>
                <ChevronRight size={14} color="#F97316" />
              </View>
            </Pressable>
          </View>
        )}

        {/* ─── 9. Recent PRs ─────────────────────────────────────────────────── */}
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
                  <Text className="text-text-primary text-sm font-semibold">
                    {pr.prType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </Text>
                  <Text className="text-text-tertiary text-xs">
                    {pr.weight ? `${pr.weight} kg` : ''}
                    {pr.reps ? ` × ${pr.reps}` : ''}
                  </Text>
                </View>
                <Text className="text-text-muted text-xs">{formatWorkoutDate(pr.achievedAt)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ─── 10. Quote / Quirk of the Day ───────────────────────────────────── */}
        <View className="px-4 mb-3">
          <View className="bg-surface border border-border rounded-2xl p-4 flex-row items-start gap-3">
            <Sparkles size={18} color="#F97316" className="mt-0.5" />
            <View className="flex-1">
              <Text className="text-text-secondary text-2xs font-bold uppercase tracking-wider mb-1">
                Daily Motivation • Thamizh
              </Text>
              <Text className="text-text-primary text-xs italic leading-relaxed">
                &ldquo;{getDailyQuote()}&rdquo;
              </Text>
            </View>
          </View>
        </View>

        {/* ─── Empty state if brand new ──────────────────────────────────────── */}
        {recentWorkouts.length === 0 && !isWorkoutActive && (
          <View className="px-4 items-center py-8">
            <View className="w-20 h-20 rounded-full bg-card border border-border items-center justify-center mb-4">
              <BarChart3 size={36} color="#F97316" />
            </View>
            <Text className="text-text-primary text-xl font-bold text-center mb-2">
              Welcome, Thamizh!
            </Text>
            <Text className="text-text-tertiary text-sm text-center mb-6 max-w-xs">
              Log your first workout to start tracking your streak, volume, and personal records.
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
