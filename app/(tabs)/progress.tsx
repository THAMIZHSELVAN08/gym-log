import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trophy, TrendingUp, Flame, Dumbbell, Zap, Calendar, PieChart, Activity } from 'lucide-react-native';
import { router } from 'expo-router';
import { getRecentPrs } from '../../src/db/queries/prs';
import {
  getAllWorkouts,
  getMuscleVolumeBreakdown,
  getStreakStats,
} from '../../src/db/queries/workouts';
import { getLatestMeasurement } from '../../src/db/queries/measurements';
import { subDays } from 'date-fns';
import { StrengthChart } from '../../src/components/progress/StrengthChart';
import { ConsistencyHeatmap } from '../../src/components/progress/ConsistencyHeatmap';
import { MuscleSplitChart } from '../../src/components/progress/MuscleSplitChart';
import { PrTimeline } from '../../src/components/progress/PrTimeline';
import { getAllExercises } from '../../src/db/queries/exercises';

type ProgressTab = 'strength' | 'consistency' | 'muscles' | 'prs';

export default function ProgressScreen() {
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<ProgressTab>('strength');

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['all-workouts'] }),
      qc.invalidateQueries({ queryKey: ['recent-prs'] }),
      qc.invalidateQueries({ queryKey: ['streak-stats'] }),
      qc.invalidateQueries({ queryKey: ['muscle-volume-breakdown-4w'] }),
      qc.invalidateQueries({ queryKey: ['body-weight'] }),
    ]);
    setRefreshing(false);
  };

  const { data: allWorkouts = [] } = useQuery({
    queryKey: ['all-workouts'],
    queryFn: getAllWorkouts,
  });

  const { data: recentPrs = [] } = useQuery({
    queryKey: ['recent-prs'],
    queryFn: () => getRecentPrs(30),
  });

  const { data: streakStats } = useQuery({
    queryKey: ['streak-stats'],
    queryFn: getStreakStats,
  });

  const { data: muscleStats = [] } = useQuery({
    queryKey: ['muscle-volume-breakdown-4w'],
    queryFn: () => {
      const end = new Date().toISOString();
      const start = subDays(new Date(), 28).toISOString();
      return getMuscleVolumeBreakdown(start, end);
    },
  });

  const { data: exercises = [] } = useQuery({
    queryKey: ['all-exercises'],
    queryFn: getAllExercises,
  });

  const { data: latestWeight } = useQuery({
    queryKey: ['body-weight'],
    queryFn: () => getLatestMeasurement('weight'),
    select: (d) => d ?? null,
  });

  const totalVolumeAllTime = allWorkouts.reduce((acc, w) => acc + (w.totalVolume ?? 0), 0);
  const totalSetsAllTime = allWorkouts.reduce((acc, w) => acc + (w.totalSets ?? 0), 0);
  const currentStreak = streakStats?.currentStreak ?? 0;
  const bestStreak = streakStats?.bestStreak ?? 0;

  const exerciseMap = new Map(exercises.map((e) => [e.id, e.name]));

  if (allWorkouts.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-8">
        <View className="w-16 h-16 rounded-full bg-surface border border-border items-center justify-center mb-4">
          <TrendingUp size={32} color="#F97316" />
        </View>
        <Text className="text-text-primary text-xl font-bold text-center mb-2">No progress data yet</Text>
        <Text className="text-text-muted text-sm text-center leading-5 mb-6">
          Complete your first workout to unlock strength progression charts, streak tracking, and muscle balance insights.
        </Text>
        <Pressable
          onPress={() => router.push('/workout/active?empty=1')}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
          className="bg-accent px-8 py-3.5 rounded-full shadow-lg"
        >
          <Text className="text-white font-bold text-base">Start Workout</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

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
        {/* Header */}
        <View className="px-5 pt-5 pb-3">
          <Text className="text-text-tertiary text-xs font-semibold uppercase tracking-wider">
            Analytics & Growth
          </Text>
          <Text className="text-text-primary text-2xl font-bold tracking-tight mt-0.5">
            Progress Hub
          </Text>
        </View>

        {/* ─── 4-Tile Key Metrics Grid ─────────────────────────────────── */}
        <View className="px-5 mb-5">
          <View className="flex-row gap-3 mb-3">
            {/* Total Volume */}
            <View className="flex-1 bg-card border border-border rounded-2xl p-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-text-muted text-xs font-semibold uppercase">Total Volume</Text>
                <TrendingUp size={15} color="#10B981" />
              </View>
              <Text className="text-text-primary text-2xl font-bold">
                {totalVolumeAllTime >= 1000
                  ? `${(totalVolumeAllTime / 1000).toFixed(1)} t`
                  : `${Math.round(totalVolumeAllTime)} kg`}
              </Text>
              <Text className="text-emerald-400 text-xs font-medium mt-0.5">Lifetime tonnage</Text>
            </View>

            {/* Total Workouts */}
            <View className="flex-1 bg-card border border-border rounded-2xl p-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-text-muted text-xs font-semibold uppercase">Workouts</Text>
                <Dumbbell size={15} color="#3B82F6" />
              </View>
              <Text className="text-text-primary text-2xl font-bold">{allWorkouts.length}</Text>
              <Text className="text-text-muted text-xs font-medium mt-0.5">
                {totalSetsAllTime} total sets
              </Text>
            </View>
          </View>

          <View className="flex-row gap-3">
            {/* Streak */}
            <View className="flex-1 bg-card border border-amber-500/25 rounded-2xl p-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-text-muted text-xs font-semibold uppercase">Streak</Text>
                <Flame size={15} color="#F97316" fill={currentStreak > 0 ? '#F97316' : 'transparent'} />
              </View>
              <Text className="text-amber-500 text-2xl font-bold">
                {currentStreak > 0 ? `${currentStreak}d` : '0d'}
              </Text>
              <Text className="text-text-muted text-xs font-medium mt-0.5">
                Best: {bestStreak} days
              </Text>
            </View>

            {/* Total PRs */}
            <View className="flex-1 bg-card border border-border rounded-2xl p-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-text-muted text-xs font-semibold uppercase">Records</Text>
                <Trophy size={15} color="#F59E0B" />
              </View>
              <Text className="text-text-primary text-2xl font-bold">{recentPrs.length}</Text>
              <Text className="text-text-muted text-xs font-medium mt-0.5">
                PRs documented
              </Text>
            </View>
          </View>
        </View>

        {/* ─── Interactive Section Tabs ────────────────────────────────── */}
        <View className="px-5 mb-4">
          <View className="flex-row bg-surface border border-border rounded-2xl p-1">
            {[
              { key: 'strength', label: 'Strength', icon: Activity },
              { key: 'consistency', label: 'Calendar', icon: Calendar },
              { key: 'muscles', label: 'Muscles', icon: PieChart },
              { key: 'prs', label: 'PRs', icon: Trophy },
            ].map((tab) => {
              const isSelected = activeTab === tab.key;
              const Icon = tab.icon;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key as ProgressTab)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
                  className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center gap-1.5 ${
                    isSelected ? 'bg-card border border-border' : ''
                  }`}
                >
                  <Icon
                    size={14}
                    color={isSelected ? '#F97316' : '#71717A'}
                  />
                  <Text
                    className={`text-xs font-bold ${
                      isSelected ? 'text-text-primary' : 'text-text-muted'
                    }`}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ─── TAB 1: STRENGTH PROGRESSION ─────────────────────────────── */}
        {activeTab === 'strength' && (
          <View className="px-5">
            <StrengthChart />
          </View>
        )}

        {/* ─── TAB 2: CONSISTENCY HEATMAP ──────────────────────────────── */}
        {activeTab === 'consistency' && (
          <View className="px-5">
            <ConsistencyHeatmap workouts={allWorkouts} weeksCount={16} />
          </View>
        )}

        {/* ─── TAB 3: MUSCLE BALANCE ───────────────────────────────────── */}
        {activeTab === 'muscles' && (
          <View className="px-5">
            <MuscleSplitChart stats={muscleStats} />
          </View>
        )}

        {/* ─── TAB 4: PR TIMELINE ──────────────────────────────────────── */}
        {activeTab === 'prs' && (
          <View className="px-5">
            <PrTimeline prs={recentPrs} exerciseMap={exerciseMap} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
