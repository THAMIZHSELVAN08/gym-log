import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Trophy, Clock, Dumbbell, Zap, CheckCircle, Home } from 'lucide-react-native';
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
  const reps = parseInt(params.reps ?? '0', 10);
  const prCount = parseInt(params.prs ?? '0', 10);

  const stats = [
    { icon: Clock, label: 'Duration', value: formatDuration(duration), color: '#F97316' },
    { icon: Dumbbell, label: 'Sets', value: sets.toString(), color: '#3B82F6' },
    { icon: Zap, label: 'Reps', value: reps.toString(), color: '#8B5CF6' },
    {
      icon: Dumbbell,
      label: 'Volume',
      value: volume >= 1000 ? `${(volume / 1000).toFixed(1)}t` : `${Math.round(volume)}kg`,
      color: '#22C55E',
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48, paddingTop: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Celebration header */}
        <View className="items-center mb-8">
          <View className="w-20 h-20 rounded-full bg-accent/20 border-2 border-accent items-center justify-center mb-4">
            <CheckCircle size={40} color="#F97316" />
          </View>
          <Text className="text-text-primary text-3xl font-bold text-center">Workout Complete!</Text>
          <Text className="text-text-tertiary text-sm mt-2 text-center">Great session 💪</Text>
        </View>

        {/* PR Banner */}
        {prCount > 0 && (
          <View className="bg-pr/15 border border-pr/30 rounded-2xl px-5 py-4 mb-5 flex-row items-center gap-3">
            <Trophy size={28} color="#F59E0B" />
            <View>
              <Text className="text-pr font-bold text-lg">
                {prCount} Personal Record{prCount > 1 ? 's' : ''}!
              </Text>
              <Text className="text-text-secondary text-xs">New all-time bests achieved</Text>
            </View>
          </View>
        )}

        {/* Stats grid */}
        <View className="flex-row flex-wrap gap-3 mb-6">
          {stats.map((stat) => (
            <View key={stat.label} className="flex-1 min-w-[40%] bg-card border border-border rounded-2xl p-4">
              <stat.icon size={20} color={stat.color} />
              <Text className="text-text-primary text-2xl font-bold mt-2">{stat.value}</Text>
              <Text className="text-text-tertiary text-xs mt-0.5">{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View className="gap-3">
          {params.workoutId && (
            <Pressable
              onPress={() => router.replace(`/workout/${params.workoutId}`)}
              className="bg-card border border-border rounded-2xl py-4 items-center active:opacity-80"
            >
              <Text className="text-text-primary font-semibold">View Workout Details</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => router.replace('/(tabs)')}
            className="bg-accent rounded-2xl py-4 flex-row items-center justify-center gap-2 active:opacity-85"
          >
            <Home size={18} color="white" />
            <Text className="text-white font-bold text-base">Back to Home</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
