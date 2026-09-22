import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Trophy, TrendingUp, BarChart3, Dumbbell, Calendar, PieChart, Activity, X, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { getRecentPrs } from '../../src/db/queries/prs';
import {
  getAllWorkouts,
  getMuscleVolumeBreakdown,
  getPeriodComparison,
} from '../../src/db/queries/workouts';
import { getAllExercises } from '../../src/db/queries/exercises';
import { getWeightHistory } from '../../src/db/queries/measurements';
import { format, endOfWeek, eachWeekOfInterval, subWeeks, subDays } from 'date-fns';

import { StrengthChart } from '../../src/components/progress/StrengthChart';
import { ConsistencyHeatmap } from '../../src/components/progress/ConsistencyHeatmap';
import { MuscleSplitChart } from '../../src/components/progress/MuscleSplitChart';
import { ThenVsNowCard } from '../../src/components/progress/ThenVsNowCard';
import { PrTimeline } from '../../src/components/progress/PrTimeline';

type TabView = 'overview' | 'strength' | 'muscle' | 'prs';

export default function ProgressScreen() {
  const [activeTab, setActiveTab] = useState<TabView>('overview');
  const [selectedWeekModal, setSelectedWeekModal] = useState<{
    label: string;
    volume: number;
    workouts: typeof allWorkouts;
  } | null>(null);

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

  // Past 4 weeks muscle breakdown
  const { data: muscleStats = [] } = useQuery({
    queryKey: ['muscle-volume-breakdown-4w'],
    queryFn: () => {
      const end = new Date().toISOString();
      const start = subDays(new Date(), 28).toISOString();
      return getMuscleVolumeBreakdown(start, end);
    },
  });

  // Then vs Now 30-day period comparison
  const { data: periodComparison = {
    current: { workoutsCount: 0, totalVolume: 0, totalSets: 0, totalReps: 0, avgDurationSeconds: 0 },
    previous: { workoutsCount: 0, totalVolume: 0, totalSets: 0, totalReps: 0, avgDurationSeconds: 0 },
  } } = useQuery({
    queryKey: ['then-vs-now-comparison'],
    queryFn: () => {
      const now = new Date();
      const currentEnd = now.toISOString();
      const currentStart = subDays(now, 30).toISOString();
      const prevEnd = subDays(now, 30).toISOString();
      const prevStart = subDays(now, 60).toISOString();
      return getPeriodComparison(currentStart, currentEnd, prevStart, prevEnd);
    },
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
        workouts: weekWorkouts,
      };
    });
  })();

  const maxVolume = Math.max(...weeklyVolumeData.map((w) => w.volume), 1);
  const totalPrs = recentPrs.length;
  const totalVolume = allWorkouts.reduce((s, w) => s + (w.totalVolume ?? 0), 0);

  const exerciseMap = new Map(exercises.map((e) => [e.id, e.name]));

  const tabs: { id: TabView; label: string; Icon: any }[] = [
    { id: 'overview', label: 'Overview', Icon: Activity },
    { id: 'strength', label: 'Strength', Icon: TrendingUp },
    { id: 'muscle', label: 'Muscles', Icon: PieChart },
    { id: 'prs', label: 'Milestones', Icon: Trophy },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-3">
          <Text className="text-text-tertiary text-xs uppercase tracking-widest font-semibold">Your</Text>
          <Text className="text-text-primary text-3xl font-bold tracking-tight">Progress & Vanity</Text>
        </View>

        {/* Top Segment Tabs */}
        <View className="px-4 mb-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            <View className="flex-row bg-surface border border-border rounded-xl p-1 gap-1">
              {tabs.map((tab) => {
                const isSelected = activeTab === tab.id;
                const { Icon } = tab;
                return (
                  <Pressable
                    key={tab.id}
                    onPress={() => setActiveTab(tab.id)}
                    className={`flex-row items-center gap-1.5 px-3 py-2 rounded-lg ${
                      isSelected ? 'bg-accent' : 'bg-transparent'
                    }`}
                  >
                    <Icon size={14} color={isSelected ? '#FFFFFF' : '#A1A1AA'} />
                    <Text
                      className={`text-xs font-semibold ${
                        isSelected ? 'text-white' : 'text-text-secondary'
                      }`}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Global Summary stats banner */}
        <View className="px-4 mb-5">
          <View className="flex-row gap-3">
            <View className="flex-1 bg-card border border-border rounded-xl p-3.5">
              <Dumbbell size={16} color="#F97316" />
              <Text className="text-text-primary text-2xl font-bold mt-1.5">{allWorkouts.length}</Text>
              <Text className="text-text-tertiary text-2xs">Workouts</Text>
            </View>
            <View className="flex-1 bg-card border border-border rounded-xl p-3.5">
              <TrendingUp size={16} color="#22C55E" />
              <Text className="text-text-primary text-2xl font-bold mt-1.5">
                {totalVolume > 1000 ? `${(totalVolume / 1000).toFixed(0)}t` : `${Math.round(totalVolume)}kg`}
              </Text>
              <Text className="text-text-tertiary text-2xs">Total Volume</Text>
            </View>
            <View className="flex-1 bg-card border border-border rounded-xl p-3.5">
              <Trophy size={16} color="#F59E0B" />
              <Text className="text-text-primary text-2xl font-bold mt-1.5">{totalPrs}</Text>
              <Text className="text-text-tertiary text-2xs">Total PRs</Text>
            </View>
          </View>
        </View>

        {/* ─── TAB: OVERVIEW ────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <View className="px-4">
            {/* Consistency Heatmap */}
            <ConsistencyHeatmap workouts={allWorkouts} weeksCount={24} />

            {/* Then vs Now 30d Comparison */}
            <ThenVsNowCard current={periodComparison.current} previous={periodComparison.previous} />

            {/* Interactive Weekly Volume Chart */}
            <View className="bg-card border border-border rounded-2xl p-4 mb-5">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-text-primary font-bold text-sm">Weekly Volume</Text>
                <Text className="text-text-muted text-2xs">Tap bar to view workouts</Text>
              </View>

              <View className="flex-row items-end justify-between gap-1 h-28">
                {weeklyVolumeData.map((week, i) => {
                  const height = maxVolume > 0 ? (week.volume / maxVolume) * 96 : 0;
                  const isCurrentWeek = i === weeklyVolumeData.length - 1;
                  return (
                    <Pressable
                      key={i}
                      onPress={() => {
                        if (week.count > 0) {
                          setSelectedWeekModal({
                            label: week.label,
                            volume: week.volume,
                            workouts: week.workouts,
                          });
                        }
                      }}
                      className="flex-1 items-center gap-1 active:opacity-75"
                    >
                      <View
                        className={`w-full rounded-sm ${
                          isCurrentWeek ? 'bg-accent' : week.volume > 0 ? 'bg-accent/40' : 'bg-border'
                        }`}
                        style={{ height: Math.max(height, week.volume > 0 ? 6 : 0) }}
                      />
                      <Text className="text-text-muted text-2xs" numberOfLines={1}>
                        {week.label.split(' ')[1]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Body Weight Trend */}
            {weightHistory.length > 0 && (
              <View className="bg-card border border-border rounded-2xl p-4 mb-5">
                <Text className="text-text-primary font-bold text-sm mb-3">Body Weight Trend</Text>
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
            )}
          </View>
        )}

        {/* ─── TAB: STRENGTH PROGRESSION ──────────────────────────────── */}
        {activeTab === 'strength' && (
          <View className="px-4">
            <StrengthChart />
            <PrTimeline prs={recentPrs} exerciseMap={exerciseMap} />
          </View>
        )}

        {/* ─── TAB: MUSCLE SPLIT ──────────────────────────────────────── */}
        {activeTab === 'muscle' && (
          <View className="px-4">
            <MuscleSplitChart stats={muscleStats} />
            <ConsistencyHeatmap workouts={allWorkouts} weeksCount={16} />
          </View>
        )}

        {/* ─── TAB: PR MILESTONES ─────────────────────────────────────── */}
        {activeTab === 'prs' && (
          <View className="px-4">
            <PrTimeline prs={recentPrs} exerciseMap={exerciseMap} />
            <StrengthChart />
          </View>
        )}

        {/* Empty state when no workouts logged */}
        {allWorkouts.length === 0 && (
          <View className="px-8 items-center py-8">
            <BarChart3 size={48} color="#3A3A3A" />
            <Text className="text-text-secondary text-base font-semibold mt-4 text-center">
              Log workouts to unlock strength curves, vanity metrics, and volume heatmaps.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Week Drill-Down Modal */}
      <Modal visible={!!selectedWeekModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/80 justify-end">
          <View className="bg-card border-t border-border rounded-t-3xl max-h-[70%] p-5 pb-8">
            <View className="flex-row items-center justify-between pb-3 border-b border-border">
              <View>
                <Text className="text-text-primary text-base font-bold">
                  Week of {selectedWeekModal?.label}
                </Text>
                <Text className="text-text-tertiary text-xs">
                  {selectedWeekModal?.workouts.length} workout(s) • Total Volume: {Math.round(selectedWeekModal?.volume ?? 0)} kg
                </Text>
              </View>
              <Pressable
                onPress={() => setSelectedWeekModal(null)}
                className="w-8 h-8 rounded-full bg-surface items-center justify-center"
              >
                <X size={16} color="#A1A1AA" />
              </Pressable>
            </View>

            <ScrollView className="mt-4">
              {selectedWeekModal?.workouts.map((w) => (
                <Pressable
                  key={w.id}
                  onPress={() => {
                    setSelectedWeekModal(null);
                    router.push(`/workout/${w.id}`);
                  }}
                  className="bg-surface border border-border rounded-xl p-3 mb-2 flex-row items-center justify-between active:bg-border"
                >
                  <View>
                    <Text className="text-text-primary text-sm font-semibold">{w.name}</Text>
                    <Text className="text-text-tertiary text-2xs">
                      {format(new Date(w.startedAt), 'EEE, MMM d • h:mm a')}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <View className="items-end">
                      <Text className="text-accent text-xs font-bold">
                        {Math.round(w.totalVolume ?? 0)} kg
                      </Text>
                      <Text className="text-text-muted text-3xs">{w.totalSets} sets</Text>
                    </View>
                    <ChevronRight size={14} color="#71717A" />
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
