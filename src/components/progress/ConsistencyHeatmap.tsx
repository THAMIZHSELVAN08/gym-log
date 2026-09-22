import React, { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Flame, Calendar, Award } from 'lucide-react-native';
import type { Workout } from '../../db/schema';
import {
  format,
  subDays,
  eachDayOfInterval,
  isSameDay,
  differenceInCalendarDays,
  startOfWeek,
  endOfWeek,
} from 'date-fns';

import { useThemeStore } from '../../store/themeStore';

interface ConsistencyHeatmapProps {
  workouts: Workout[];
  weeksCount?: number;
}

export function ConsistencyHeatmap({ workouts, weeksCount = 24 }: ConsistencyHeatmapProps) {
  const { theme } = useThemeStore();
  const isLight = theme === 'light';

  // Aggregate workout volume/sets by date string 'yyyy-MM-dd'
  const workoutDaysMap = useMemo(() => {
    const map = new Map<string, { count: number; volume: number; sets: number }>();
    for (const w of workouts) {
      const dateKey = format(new Date(w.startedAt), 'yyyy-MM-dd');
      const prev = map.get(dateKey) || { count: 0, volume: 0, sets: 0 };
      map.set(dateKey, {
        count: prev.count + 1,
        volume: prev.volume + (w.totalVolume ?? 0),
        sets: prev.sets + (w.totalSets ?? 0),
      });
    }
    return map;
  }, [workouts]);

  // Compute Streak Statistics
  const { currentStreak, longestStreak, activeDaysCount } = useMemo(() => {
    const sortedUniqueDays = Array.from(workoutDaysMap.keys())
      .map((d) => new Date(d))
      .sort((a, b) => b.getTime() - a.getTime());

    let current = 0;
    let longest = 0;
    let tempStreak = 0;

    const today = new Date();
    const isTodayLogged = sortedUniqueDays.some((d) => isSameDay(d, today));
    const isYesterdayLogged = sortedUniqueDays.some((d) => isSameDay(d, subDays(today, 1)));

    // Calculate current streak
    if (isTodayLogged || isYesterdayLogged) {
      let checkDate = isTodayLogged ? today : subDays(today, 1);
      while (sortedUniqueDays.some((d) => isSameDay(d, checkDate))) {
        current += 1;
        checkDate = subDays(checkDate, 1);
      }
    }

    // Calculate longest consecutive streak
    if (sortedUniqueDays.length > 0) {
      tempStreak = 1;
      longest = 1;
      for (let i = 0; i < sortedUniqueDays.length - 1; i++) {
        const diff = differenceInCalendarDays(sortedUniqueDays[i]!, sortedUniqueDays[i + 1]!);
        if (diff === 1) {
          tempStreak += 1;
          if (tempStreak > longest) longest = tempStreak;
        } else if (diff > 1) {
          tempStreak = 1;
        }
      }
    }

    return {
      currentStreak: current,
      longestStreak: longest,
      activeDaysCount: sortedUniqueDays.length,
    };
  }, [workoutDaysMap]);

  // Generate grid days for N weeks ending this week
  const gridWeeks = useMemo(() => {
    const today = new Date();
    const end = endOfWeek(today, { weekStartsOn: 1 });
    const start = startOfWeek(subDays(end, weeksCount * 7 - 1), { weekStartsOn: 1 });

    const allDays = eachDayOfInterval({ start, end });
    const weeks: { date: Date; dateKey: string; data: { count: number; volume: number; sets: number } | undefined }[][] = [];

    for (let i = 0; i < allDays.length; i += 7) {
      const weekDays = allDays.slice(i, i + 7).map((d) => {
        const dateKey = format(d, 'yyyy-MM-dd');
        return {
          date: d,
          dateKey,
          data: workoutDaysMap.get(dateKey),
        };
      });
      weeks.push(weekDays);
    }
    return weeks;
  }, [workoutDaysMap, weeksCount]);

  const getColor = (data?: { sets: number; volume: number }) => {
    if (!data || data.sets === 0) return isLight ? '#E2E8F0' : '#18181B'; // empty tile
    if (data.sets < 6) return isLight ? '#FED7AA' : '#7C2D12'; // mild
    if (data.sets < 12) return isLight ? '#FB923C' : '#C2410C'; // medium
    if (data.sets < 20) return isLight ? '#F97316' : '#EA580C'; // heavy
    return '#EA580C'; // peak active
  };

  const dayLabels = ['M', '', 'W', '', 'F', '', 'S'];

  return (
    <View className="bg-card border border-border rounded-2xl p-4 mb-5">
      {/* Title and Streak Badges */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center gap-2">
          <Calendar size={18} color="#F97316" />
          <Text className="text-text-primary font-bold text-sm">Consistency Heatmap</Text>
        </View>

        <View className="flex-row items-center gap-1.5 bg-accent/15 border border-accent/30 px-2.5 py-1 rounded-full">
          <Flame size={14} color="#F97316" />
          <Text className="text-accent text-xs font-bold">{currentStreak} day streak</Text>
        </View>
      </View>

      {/* Heatmap Grid (Horizontal Scroll) */}
      <View className="flex-row items-start">
        {/* Day of week labels */}
        <View className="mr-2 pt-1 gap-1">
          {dayLabels.map((lbl, idx) => (
            <View key={idx} className="h-3.5 items-center justify-center">
              <Text className="text-text-muted text-3xs font-medium">{lbl}</Text>
            </View>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1">
          <View className="flex-row gap-1">
            {gridWeeks.map((week, weekIdx) => (
              <View key={weekIdx} className="gap-1">
                {week.map((day) => {
                  const bg = getColor(day.data);
                  return (
                    <View
                      key={day.dateKey}
                      className="w-3.5 h-3.5 rounded-xs"
                      style={{ backgroundColor: bg }}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Streak and Summary Footer */}
      <View className="flex-row items-center justify-between pt-3 mt-3 border-t border-border">
        <View className="flex-row items-center gap-1">
          <Award size={13} color="#A1A1AA" />
          <Text className="text-text-tertiary text-xs">
            Best streak: <Text className="text-text-primary font-semibold">{longestStreak} days</Text>
          </Text>
        </View>

        <View className="flex-row items-center gap-1">
          <Text className="text-text-muted text-2xs mr-1">Less</Text>
          <View className="w-2.5 h-2.5 rounded-2xs bg-[#18181B]" />
          <View className="w-2.5 h-2.5 rounded-2xs bg-[#7C2D12]" />
          <View className="w-2.5 h-2.5 rounded-2xs bg-[#C2410C]" />
          <View className="w-2.5 h-2.5 rounded-2xs bg-[#F97316]" />
          <Text className="text-text-muted text-2xs ml-1">More</Text>
        </View>
      </View>
    </View>
  );
}
