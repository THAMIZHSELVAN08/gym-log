import { Tabs, router } from 'expo-router';
import { View, Text, Pressable } from 'react-native';
import { Home, Dumbbell, Clock, TrendingUp, User } from 'lucide-react-native';
import { useWorkoutStore } from '../../src/store/workoutStore';

const TABS = [
  { name: 'index', label: 'Home', Icon: Home },
  { name: 'workouts', label: 'Workouts', Icon: Dumbbell },
  { name: 'history', label: 'History', Icon: Clock },
  { name: 'progress', label: 'Progress', Icon: TrendingUp },
  { name: 'profile', label: 'Profile', Icon: User },
];

type CustomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

function CustomTabBar({ state, navigation }: CustomTabBarProps) {
  const isActive = useWorkoutStore((s) => s.isActive);

  return (
    <View className="bg-surface border-t border-border">
      {/* Active workout banner */}
      {isActive && (
        <Pressable
          onPress={() => router.push('/workout/active')}
          className="bg-accent mx-3 mb-1 mt-2 rounded-xl px-4 py-2.5 flex-row items-center justify-between active:opacity-80"
        >
          <View className="flex-row items-center gap-2">
            <View className="w-2 h-2 rounded-full bg-white opacity-80" />
            <Text className="text-white font-semibold text-sm">Workout in progress</Text>
          </View>
          <Text className="text-white/80 text-xs">Tap to return →</Text>
        </Pressable>
      )}

      {/* Tab buttons */}
      <View className="flex-row px-2 pb-6 pt-2">
        {state.routes.map((route, index) => {
          const tabInfo = TABS.find((t) => t.name === route.name) ?? TABS[0]!;
          const { Icon } = tabInfo;
          const focused = state.index === index;
          const color = focused ? '#F97316' : '#71717A';

          return (
            <Pressable
              key={route.key}
              onPress={() => navigation.navigate(route.name)}
              className="flex-1 items-center justify-center py-1 gap-0.5"
            >
              <Icon size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
              <Text
                className="text-2xs font-medium"
                style={{ color }}
              >
                {tabInfo.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="workouts" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="progress" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
