import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, G, Circle, Text as SvgText } from 'react-native-svg';
import { PieChart, AlertCircle } from 'lucide-react-native';
import type { MuscleVolumeStats } from '../../db/queries/workouts';

interface MuscleSplitChartProps {
  stats: MuscleVolumeStats[];
}

const MUSCLE_COLORS: Record<string, string> = {
  chest: '#F97316', // Orange
  back: '#3B82F6', // Blue
  legs: '#22C55E', // Green
  shoulders: '#A855F7', // Purple
  arms: '#EC4899', // Pink
  core: '#EAB308', // Yellow
  other: '#71717A', // Gray
};

export function MuscleSplitChart({ stats }: MuscleSplitChartProps) {
  const totalVolume = stats.reduce((acc, s) => acc + s.volume, 0);
  const totalSets = stats.reduce((acc, s) => acc + s.sets, 0);

  // SVG Donut dimensions
  const size = 160;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  // Compute SVG arc segments
  let cumulativeAngle = -90; // Start at 12 o'clock

  const segments = stats.map((stat) => {
    const fraction = totalVolume > 0 ? stat.volume / totalVolume : 0;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const rotation = cumulativeAngle;
    cumulativeAngle += fraction * 360;
    const color = MUSCLE_COLORS[stat.muscle.toLowerCase()] || '#F97316';

    return {
      muscle: stat.muscle,
      fraction,
      percentage: stat.percentage,
      volume: stat.volume,
      sets: stat.sets,
      strokeDasharray,
      rotation,
      color,
    };
  });

  // Identify neglected muscle group
  const neglectedMuscle = (() => {
    const majorMuscles = ['chest', 'back', 'legs', 'shoulders'];
    for (const m of majorMuscles) {
      const found = stats.find((s) => s.muscle.toLowerCase() === m);
      if (!found || found.percentage < 10) {
        return m;
      }
    }
    return null;
  })();

  return (
    <View className="bg-card border border-border rounded-2xl p-4 mb-5">
      {/* Title */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center gap-2">
          <PieChart size={18} color="#F97316" />
          <Text className="text-text-primary font-bold text-sm">Muscle Group Split</Text>
        </View>
        <Text className="text-text-tertiary text-xs">Last 4 Weeks</Text>
      </View>

      {stats.length > 0 ? (
        <View>
          <View className="flex-row items-center justify-between">
            {/* SVG Donut Chart */}
            <View className="items-center justify-center">
              <Svg width={size} height={size}>
                <G>
                  {/* Background Track */}
                  <Circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke="#18181B"
                    strokeWidth={strokeWidth}
                    fill="none"
                  />
                  {/* Segment arcs */}
                  {segments.map((seg, i) => (
                    <Circle
                      key={i}
                      cx={center}
                      cy={center}
                      r={radius}
                      stroke={seg.color}
                      strokeWidth={strokeWidth}
                      strokeDasharray={seg.strokeDasharray}
                      strokeLinecap="butt"
                      fill="none"
                      transform={`rotate(${seg.rotation} ${center} ${center})`}
                    />
                  ))}
                </G>
              </Svg>

              {/* Inner Center Label */}
              <View className="absolute items-center justify-center">
                <Text className="text-text-primary text-base font-bold">
                  {totalVolume > 1000 ? `${(totalVolume / 1000).toFixed(1)}t` : `${Math.round(totalVolume)}kg`}
                </Text>
                <Text className="text-text-muted text-3xs font-semibold">{totalSets} sets</Text>
              </View>
            </View>

            {/* Legend Breakdown */}
            <View className="flex-1 ml-4 gap-2">
              {stats.slice(0, 5).map((stat) => {
                const color = MUSCLE_COLORS[stat.muscle.toLowerCase()] || '#F97316';
                return (
                  <View key={stat.muscle} className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <Text className="text-text-secondary text-xs font-semibold capitalize">
                        {stat.muscle}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-1.5">
                      <Text className="text-text-muted text-2xs">{stat.sets}s</Text>
                      <Text className="text-text-primary text-xs font-bold w-9 text-right">
                        {stat.percentage}%
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Balance / Neglect Advice Callout */}
          {neglectedMuscle && (
            <View className="flex-row items-center gap-2 bg-surface border border-border/80 rounded-xl p-2.5 mt-4">
              <AlertCircle size={15} color="#EAB308" />
              <Text className="text-xs text-text-secondary flex-1">
                <Text className="font-semibold text-text-primary capitalize">{neglectedMuscle}</Text> volume is below 10% this month. Consider adding focus.
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View className="py-8 items-center justify-center">
          <Text className="text-text-tertiary text-sm">No volume data in this period.</Text>
        </View>
      )}
    </View>
  );
}
