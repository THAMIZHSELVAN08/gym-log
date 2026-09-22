import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Trophy, TrendingUp, BarChart3, Dumbbell } from 'lucide-react-native';
import { getRecentPrs } from '../../src/db/queries/prs';
import { getAllWorkouts } from '../../src/db/queries/workouts';
import { getAllExercises } from '../../src/db/queries/exercises';
import { format, endOfWeek, eachWeekOfInterval, subWeeks } from 'date-fns';
import { getWeightHistory } from '../../src/db/queries/measurements';

export default function ProgressScreen() {
  const { data: allWorkouts = [] } = useQuery({
    queryKey: ['all-workouts'],
    queryFn: getAllWorkouts,
  });

  const { data: recentPrs = [] } = useQuery({
    queryKey: ['recent-prs'],
    queryFn: () => getRecentPrs(20),
  });

  const { data: exercises = [] } = useQuery({
    queryKey: ['all-exercises'],
    queryFn: getAllExercises,
  });

  const { data: weightHistory = [] } = useQuery({
    queryKey: ['weight-history'],
    queryFn: () => getWeightHistory(12),
  });

  // Weekly volume for last 8 weeks
  const weeklyVolumeData = (() => {
    const now = new Date();
    const weeks = eachWeekOfInterval(
      { start: subWeeks(now, 7), end: now },
      { weekStartsOn: 1 },
    );
    return weeks.map((weekStart) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekWorkouts = allWorkouts.filter((w) => {
        const d = new Date(w.startedAt);
        return d >= weekStart && d <= weekEnd;
      });
      return {
        label: format(weekStart, 'MMM d'),
        volume: weekWorkouts.reduce((s, w) => s + (w.totalVolume ?? 0), 0),
        count: weekWorkouts.length,
      };
    });
  })();

  const maxVolume = Math.max(...weeklyVolumeData.map((w) => w.volume), 1);
  const totalPrs = recentPrs.length;
  const totalVolume = allWorkouts.reduce((s, w) => s + (w.totalVolume ?? 0), 0);

  const exerciseMap = new Map(exercises.map((e) => [e.id, e.name]));

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-4">
          <Text className="text-text-tertiary text-xs uppercase tracking-widest font-semibold">Your</Text>
          <Text className="text-text-primary text-3xl font-bold tracking-tight">Progress</Text>
        </View>

        {/* Summary stats */}
        <View className="px-4 mb-5">
          <View className="flex-row gap-3">
            <View className="flex-1 bg-card border border-border rounded-xl p-4">
              <Dumbbell size={18} color="#F97316" />
              <Text className="text-text-primary text-2xl font-bold mt-2">{allWorkouts.length}</Text>
              <Text className="text-text-tertiary text-xs">Total Workouts</Text>
            </View>
            <View className="flex-1 bg-card border border-border rounded-xl p-4">
              <TrendingUp size={18} color="#22C55E" />
              <Text className="text-text-primary text-2xl font-bold mt-2">
                {totalVolume > 1000 ? `${(totalVolume / 1000).toFixed(0)}t` : `${Math.round(totalVolume)}kg`}
              </Text>
              <Text className="text-text-tertiary text-xs">Total Volume</Text>
            </View>
            <View className="flex-1 bg-card border border-border rounded-xl p-4">
              <Trophy size={18} color="#F59E0B" />
              <Text className="text-text-primary text-2xl font-bold mt-2">{totalPrs}</Text>
              <Text className="text-text-tertiary text-xs">Total PRs</Text>
            </View>
          </View>
        </View>

        {/* Weekly Volume Chart */}
        <View className="px-4 mb-5">
          <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-3">
            Weekly Volume
          </Text>
          <View className="bg-card border border-border rounded-2xl p-4">
            <View className="flex-row items-end justify-between gap-1 h-28">
              {weeklyVolumeData.map((week, i) => {
                const height = maxVolume > 0 ? (week.volume / maxVolume) * 96 : 0;
                const isCurrentWeek = i === weeklyVolumeData.length - 1;
                return (
                  <View key={i} className="flex-1 items-center gap-1">
                    <View
                      className={`w-full rounded-sm ${isCurrentWeek ? 'bg-accent' : 'bg-border'}`}
                      style={{ height: Math.max(height, week.volume > 0 ? 4 : 0) }}
                    />
                    <Text className="text-text-muted text-2xs" numberOfLines={1}>
                      {week.label.split(' ')[1]}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Recent PRs */}
        {recentPrs.length > 0 && (
          <View className="px-4 mb-5">
            <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-3">
              Personal Records
            </Text>
            <View className="bg-card border border-border rounded-2xl overflow-hidden">
              {recentPrs.slice(0, 10).map((pr, i) => (
                <View
                  key={pr.id}
                  className={`px-4 py-3 flex-row items-center gap-3 ${i > 0 ? 'border-t border-border' : ''}`}
                >
                  <View className="w-8 h-8 rounded-full bg-pr/15 items-center justify-center">
                    <Trophy size={14} color="#F59E0B" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-text-primary text-sm font-semibold" numberOfLines={1}>
                      {exerciseMap.get(pr.exerciseId) ?? 'Exercise'}
                    </Text>
                    <Text className="text-text-tertiary text-xs">
                      {pr.prType === 'estimated_1rm'
                        ? `Est. 1RM: ${pr.estimated1rm?.toFixed(1)} kg`
                        : pr.prType === 'max_weight'
                        ? `${pr.weight} kg × ${pr.reps}`
                        : `Vol: ${pr.volume?.toFixed(0)} kg`}
                    </Text>
                  </View>
                  <Text className="text-text-muted text-xs">{format(new Date(pr.achievedAt), 'MMM d')}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Body Weight Chart */}
        {weightHistory.length > 0 && (
          <View className="px-4 mb-5">
            <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-3">
              Body Weight Trend
            </Text>
            <View className="bg-card border border-border rounded-2xl p-4">
              {/* Simple sparkline */}
              <View className="flex-row items-end gap-1 h-20 mb-2">
                {weightHistory
                  .slice()
                  .reverse()
                  .map((m, i) => {
                    const values = weightHistory.map((w) => w.value);
                    const min = Math.min(...values);
                    const max = Math.max(...values);
                    const range = max - min || 1;
                    const h = ((m.value - min) / range) * 64 + 8;
                    const isLast = i === weightHistory.length - 1;
                    return (
                      <View key={m.id} className="flex-1 items-center justify-end">
                        <View
                          className={`w-1.5 rounded-full ${isLast ? 'bg-accent' : 'bg-border'}`}
                          style={{ height: h }}
                        />
                      </View>
                    );
                  })}
              </View>
              <View className="flex-row justify-between">
                <Text className="text-text-muted text-xs">
                  {format(new Date(weightHistory[weightHistory.length - 1]!.measuredAt), 'MMM d')}
                </Text>
                <Text className="text-text-primary font-semibold text-sm">
                  {weightHistory[0]!.value} {weightHistory[0]!.unit}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Empty state */}
        {allWorkouts.length === 0 && (
          <View className="px-8 items-center py-8">
            <BarChart3 size={48} color="#3A3A3A" />
            <Text className="text-text-secondary text-base font-semibold mt-4 text-center">
              Log some workouts to see your progress
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
