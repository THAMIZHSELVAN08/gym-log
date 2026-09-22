import { View, Text, ScrollView, Pressable, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ruler, Download, ChevronRight, Moon, Sun, Disc, Plus } from 'lucide-react-native';
import { getWeightHistory, getLatestMeasurement, addMeasurement } from '../../src/db/queries/measurements';
import { getAllWorkouts } from '../../src/db/queries/workouts';
import { exportWorkouts } from '../../src/utils/export';
import { PlateCalculatorModal } from '../../src/components/tools/PlateCalculatorModal';
import { useThemeStore } from '../../src/store/themeStore';
import { format } from 'date-fns';
import { useState } from 'react';

export default function ProfileScreen() {
  const qc = useQueryClient();
  const [weightInput, setWeightInput] = useState('');
  const [showWeightInput, setShowWeightInput] = useState(false);
  const [showPlateCalc, setShowPlateCalc] = useState(false);
  const { theme, setTheme } = useThemeStore();

  const { data: latestWeight } = useQuery({
    queryKey: ['body-weight'],
    queryFn: () => getLatestMeasurement('weight'),
    select: (d) => d ?? null,
  });

  const { data: weightHistory = [] } = useQuery({
    queryKey: ['weight-history'],
    queryFn: () => getWeightHistory(5),
  });

  // Only used for export — not shown as stats
  const { data: allWorkouts = [] } = useQuery({
    queryKey: ['all-workouts'],
    queryFn: getAllWorkouts,
  });

  const addWeightMutation = useMutation({
    mutationFn: (value: number) =>
      addMeasurement({
        type: 'weight',
        value,
        unit: 'kg',
        measuredAt: new Date().toISOString(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['body-weight'] });
      qc.invalidateQueries({ queryKey: ['weight-history'] });
      setWeightInput('');
      setShowWeightInput(false);
    },
  });

  const handleLogWeight = () => {
    const val = parseFloat(weightInput);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Invalid weight', 'Please enter a valid weight value.');
      return;
    }
    addWeightMutation.mutate(val);
  };

  const settingsRows = [
    {
      label: 'Plate Calculator',
      value: 'Barbell tool',
      icon: Disc,
      onPress: () => setShowPlateCalc(true),
    },
    {
      label: 'Units',
      value: 'kg / cm',
      icon: Ruler,
      onPress: () => Alert.alert('Units', 'Metric system (kg / cm) is currently active.'),
    },
    {
      label: 'Theme',
      value: theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System',
      icon: theme === 'dark' ? Moon : Sun,
      onPress: () => {
        Alert.alert('Choose Theme', '', [
          { text: 'Cancel', style: 'cancel' },
          { text: '🌙 Dark', onPress: () => setTheme('dark') },
          { text: '☀️ Light', onPress: () => setTheme('light') },
          { text: '⚙️ System', onPress: () => setTheme('system') },
        ]);
      },
    },
    {
      label: 'Export Data',
      value: 'CSV / JSON',
      icon: Download,
      onPress: () => {
        Alert.alert('Export Workouts', 'Choose format:', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'CSV', onPress: () => exportWorkouts(allWorkouts, 'csv') },
          { text: 'JSON', onPress: () => exportWorkouts(allWorkouts, 'json') },
        ]);
      },
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-5 pt-5 pb-4">
          <Text className="text-text-primary text-2xl font-bold tracking-tight">Profile</Text>
          <Text className="text-text-tertiary text-sm mt-0.5">
            {allWorkouts.length} workout{allWorkouts.length !== 1 ? 's' : ''} logged
          </Text>
        </View>

        {/* ─── Body Weight ─────────────────────────────────────────────── */}
        <View className="px-5 mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest">
              Body Weight
            </Text>
            <Pressable
              onPress={() => setShowWeightInput((v) => !v)}
              className="flex-row items-center gap-1 active:opacity-60"
            >
              <Plus size={14} color="#F97316" />
              <Text className="text-accent text-xs font-medium">Log weight</Text>
            </Pressable>
          </View>

          {/* Inline weight input */}
          {showWeightInput && (
            <View className="flex-row items-center gap-3 mb-3 bg-card border border-border rounded-xl px-4 py-3">
              <TextInput
                className="flex-1 text-text-primary text-xl font-bold"
                placeholder="0.0"
                placeholderTextColor="#52525B"
                keyboardType="decimal-pad"
                value={weightInput}
                onChangeText={setWeightInput}
                autoFocus
              />
              <Text className="text-text-tertiary">kg</Text>
              <Pressable
                onPress={handleLogWeight}
                className="bg-accent px-4 py-2 rounded-lg active:opacity-80"
              >
                <Text className="text-white font-semibold text-sm">Log</Text>
              </Pressable>
            </View>
          )}

          {latestWeight ? (
            <View>
              <Text className="text-text-primary text-4xl font-bold">
                {latestWeight.value}{' '}
                <Text className="text-text-tertiary text-2xl font-normal">{latestWeight.unit}</Text>
              </Text>
              <Text className="text-text-tertiary text-xs mt-1">
                Logged {format(new Date(latestWeight.measuredAt), 'MMM d, yyyy')}
              </Text>

              {weightHistory.length > 1 && (
                <View className="mt-3 pt-3 border-t border-border">
                  {weightHistory.slice(1, 4).map((m) => (
                    <View key={m.id} className="flex-row justify-between py-1.5">
                      <Text className="text-text-secondary text-sm">
                        {m.value} {m.unit}
                      </Text>
                      <Text className="text-text-muted text-xs">
                        {format(new Date(m.measuredAt), 'MMM d')}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <Pressable onPress={() => setShowWeightInput(true)}>
              <Text className="text-text-tertiary text-sm">Tap "Log weight" to add your first entry.</Text>
            </Pressable>
          )}
        </View>

        {/* ─── Settings ────────────────────────────────────────────────── */}
        <View className="px-5 mb-5">
          <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-3">
            Tools & Settings
          </Text>
          <View className="bg-card border border-border rounded-2xl overflow-hidden">
            {settingsRows.map((item, i) => (
              <Pressable
                key={item.label}
                onPress={item.onPress}
                className={`flex-row items-center px-4 py-4 gap-3 active:bg-surface ${
                  i > 0 ? 'border-t border-border' : ''
                }`}
              >
                <View className="w-8 h-8 rounded-lg bg-surface items-center justify-center">
                  <item.icon size={16} color="#A1A1AA" />
                </View>
                <Text className="flex-1 text-text-primary font-medium">{item.label}</Text>
                {item.value ? (
                  <Text className="text-text-tertiary text-sm">{item.value}</Text>
                ) : null}
                <ChevronRight size={16} color="#52525B" />
              </Pressable>
            ))}
          </View>
        </View>

        {/* App info */}
        <View className="px-5 items-center">
          <Text className="text-text-muted text-xs font-bold tracking-widest">GYMLOG</Text>
          <Text className="text-text-muted text-xs mt-1">Version 1.0.0</Text>
        </View>
      </ScrollView>

      <PlateCalculatorModal
        visible={showPlateCalc}
        onClose={() => setShowPlateCalc(false)}
        initialWeight={60}
      />
    </SafeAreaView>
  );
}
