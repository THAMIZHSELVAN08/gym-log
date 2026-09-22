import React from 'react';
import { View, Text } from 'react-native';
import { ArrowLeftRight, TrendingUp, TrendingDown, Clock, Dumbbell, Repeat, BarChart2 } from 'lucide-react-native';
import type { PeriodStats } from '../../db/queries/workouts';

interface ThenVsNowCardProps {
  current: PeriodStats;
  previous: PeriodStats;
}

export function ThenVsNowCard({ current, previous }: ThenVsNowCardProps) {
  const formatVol = (v: number) => {
    if (v >= 1000) return `${(v / 1000).toFixed(1)}t`;
    return `${Math.round(v)}kg`;
  };

  const formatMin = (seconds: number) => {
    return `${Math.round(seconds / 60)}m`;
  };

  const getDelta = (curr: number, prev: number) => {
    if (prev === 0 && curr === 0) return { text: '0%', isPositive: true };
    if (prev === 0) return { text: '+100%', isPositive: true };
    const pct = ((curr - prev) / prev) * 100;
    const sign = pct >= 0 ? '+' : '';
    return {
      text: `${sign}${pct.toFixed(0)}%`,
      isPositive: pct >= 0,
    };
  };

  const metrics = [
    {
      label: 'Workouts',
      current: current.workoutsCount.toString(),
      previous: previous.workoutsCount.toString(),
      delta: getDelta(current.workoutsCount, previous.workoutsCount),
      Icon: Dumbbell,
    },
    {
      label: 'Volume',
      current: formatVol(current.totalVolume),
      previous: formatVol(previous.totalVolume),
      delta: getDelta(current.totalVolume, previous.totalVolume),
      Icon: BarChart2,
    },
    {
      label: 'Avg Duration',
      current: formatMin(current.avgDurationSeconds),
      previous: formatMin(previous.avgDurationSeconds),
      delta: getDelta(current.avgDurationSeconds, previous.avgDurationSeconds),
      Icon: Clock,
    },
    {
      label: 'Total Reps',
      current: current.totalReps.toLocaleString(),
      previous: previous.totalReps.toLocaleString(),
      delta: getDelta(current.totalReps, previous.totalReps),
      Icon: Repeat,
    },
  ];

  return (
    <View className="bg-card border border-border rounded-2xl p-4 mb-5">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center gap-2">
          <ArrowLeftRight size={18} color="#F97316" />
          <Text className="text-text-primary font-bold text-sm">Then vs Now</Text>
        </View>
        <Text className="text-text-tertiary text-xs">Past 30d vs Prior 30d</Text>
      </View>

      {/* Comparison Grid */}
      <View className="gap-3">
        {metrics.map((m, i) => {
          const { Icon, delta } = m;
          return (
            <View
              key={i}
              className="bg-surface/60 border border-border/50 rounded-xl p-3 flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-2.5 flex-1">
                <View className="w-7 h-7 rounded-lg bg-surface border border-border items-center justify-center">
                  <Icon size={14} color="#F97316" />
                </View>
                <Text className="text-text-secondary text-xs font-semibold">{m.label}</Text>
              </View>

              {/* Values Comparison */}
              <View className="flex-row items-center gap-3">
                <View className="items-end">
                  <Text className="text-text-muted text-2xs">Prior: {m.previous}</Text>
                  <Text className="text-text-primary text-sm font-bold">{m.current}</Text>
                </View>

                {/* Delta Pill */}
                <View
                  className={`px-2 py-0.5 rounded-full flex-row items-center gap-0.5 ${
                    delta.isPositive ? 'bg-success/15' : 'bg-error/15'
                  }`}
                >
                  {delta.isPositive ? (
                    <TrendingUp size={10} color="#22C55E" />
                  ) : (
                    <TrendingDown size={10} color="#EF4444" />
                  )}
                  <Text
                    className={`text-2xs font-bold ${
                      delta.isPositive ? 'text-success' : 'text-error'
                    }`}
                  >
                    {delta.text}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
