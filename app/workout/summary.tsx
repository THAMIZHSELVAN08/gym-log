import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Trophy } from 'lucide-react-native';
import { formatDuration } from '../../src/utils/calculations';

export default function WorkoutSummaryScreen() {
  const params = useLocalSearchParams<{
    workoutId?: string;
    duration?: string;
    volume?: string;
    sets?: string;
    reps?: string;
    prs?: string;
  }>();

  const duration = parseInt(params.duration ?? '0', 10);
  const volume = parseFloat(params.volume ?? '0');
  const sets = parseInt(params.sets ?? '0', 10);
  const prCount = parseInt(params.prs ?? '0', 10);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-center px-6">
        {/* Title */}
        <Text className="text-text-tertiary text-xs font-semibold uppercase tracking-widest mb-2 text-center">
          Workout Complete
        </Text>
        <Text className="text-text-primary text-3xl font-bold text-center mb-8">
          Nice work 💪
        </Text>

        {/* 3 primary stats — horizontal */}
        <View className="flex-row justify-center gap-8 mb-8">
          <View className="items-center">
            <Text className="text-text-primary text-2xl font-bold">{formatDuration(duration)}</Text>
            <Text className="text-text-tertiary text-xs mt-0.5">Duration</Text>
          </View>
          <View className="w-px bg-border" />
          <View className="items-center">
            <Text className="text-text-primary text-2xl font-bold">{sets}</Text>
            <Text className="text-text-tertiary text-xs mt-0.5">Sets</Text>
          </View>
          <View className="w-px bg-border" />
          <View className="items-center">
            <Text className="text-text-primary text-2xl font-bold">
              {volume >= 1000 ? `${(volume / 1000).toFixed(1)}t` : `${Math.round(volume)}kg`}
            </Text>
            <Text className="text-text-tertiary text-xs mt-0.5">Volume</Text>
          </View>
        </View>

        {/* PR banner — only if earned */}
        {prCount > 0 && (
          <View className="bg-amber-500/10 border border-amber-500/25 rounded-2xl px-5 py-4 mb-8 flex-row items-center gap-3">
            <Trophy size={22} color="#F59E0B" />
            <Text className="text-amber-500 font-bold text-base">
              {prCount} Personal Record{prCount > 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View className="gap-3">
          {params.workoutId && (
            <Pressable
              onPress={() => router.replace(`/workout/${params.workoutId}`)}
              className="border border-border rounded-2xl py-4 items-center active:opacity-75"
            >
              <Text className="text-text-secondary font-semibold">View Breakdown</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => router.replace('/(tabs)')}
            className="bg-accent rounded-2xl py-4 items-center active:opacity-85"
          >
            <Text className="text-white font-bold text-base">Done</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
