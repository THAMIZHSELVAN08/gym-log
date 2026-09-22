import React from 'react';
import { View, Text } from 'react-native';
import { Trophy, Zap, Weight, Sparkles } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import type { PersonalRecord } from '../../db/schema';

interface PrTimelineProps {
  prs: PersonalRecord[];
  exerciseMap: Map<string, string>;
}

export function PrTimeline({ prs, exerciseMap }: PrTimelineProps) {
  const getPrBadge = (prType: string) => {
    switch (prType) {
      case 'estimated_1rm':
        return {
          label: 'Est. 1RM',
          color: '#F59E0B',
          bgColor: 'bg-amber-500/10',
          textColor: 'text-amber-500',
          Icon: Sparkles,
        };
      case 'max_weight':
        return {
          label: 'Max Weight',
          color: '#F97316',
          bgColor: 'bg-orange-500/10',
          textColor: 'text-orange-500',
          Icon: Weight,
        };
      default:
        return {
          label: 'Volume PR',
          color: '#3B82F6',
          bgColor: 'bg-blue-500/10',
          textColor: 'text-blue-500',
          Icon: Zap,
        };
    }
  };

  const getPrValueText = (pr: PersonalRecord) => {
    if (pr.prType === 'estimated_1rm') {
      return `${pr.estimated1rm?.toFixed(1)} kg`;
    }
    if (pr.prType === 'max_weight') {
      return `${pr.weight} kg × ${pr.reps} reps`;
    }
    return `${Math.round(pr.volume ?? 0)} kg total`;
  };

  return (
    <View className="bg-card border border-border rounded-2xl p-4 mb-5">
      {/* Title */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center gap-2">
          <Trophy size={18} color="#F59E0B" />
          <Text className="text-text-primary font-bold text-sm">PR Milestones</Text>
        </View>
        <Text className="text-text-tertiary text-xs">{prs.length} Records</Text>
      </View>

      {prs.length > 0 ? (
        <View className="gap-2.5">
          {prs.slice(0, 10).map((pr) => {
            const exerciseName = exerciseMap.get(pr.exerciseId) || 'Exercise';
            const badge = getPrBadge(pr.prType);
            const { Icon } = badge;
            const timeAgo = formatDistanceToNow(new Date(pr.achievedAt), { addSuffix: true });

            return (
              <View
                key={pr.id}
                className="bg-surface/70 border border-border/60 rounded-xl p-3 flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-3 flex-1 mr-2">
                  <View className={`w-8 h-8 rounded-full ${badge.bgColor} items-center justify-center`}>
                    <Icon size={16} color={badge.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-text-primary text-sm font-semibold" numberOfLines={1}>
                      {exerciseName}
                    </Text>
                    <Text className="text-text-tertiary text-2xs">{timeAgo}</Text>
                  </View>
                </View>

                <View className="items-end">
                  <Text className="text-text-primary font-bold text-sm">{getPrValueText(pr)}</Text>
                  <View className={`px-1.5 py-0.5 rounded-md ${badge.bgColor} mt-0.5`}>
                    <Text className={`text-3xs font-bold uppercase ${badge.textColor}`}>{badge.label}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View className="py-8 items-center justify-center">
          <Text className="text-text-tertiary text-sm">No personal records logged yet.</Text>
        </View>
      )}
    </View>
  );
}
