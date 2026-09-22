import { View, Text, ScrollView, Pressable, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Ruler, Download, ChevronRight, Plus, Moon, Disc } from 'lucide-react-native';
import { getWeightHistory, getLatestMeasurement, addMeasurement } from '../../src/db/queries/measurements';
import { getAllWorkouts } from '../../src/db/queries/workouts';
import { exportWorkouts } from '../../src/utils/export';
import { PlateCalculatorModal } from '../../src/components/tools/PlateCalculatorModal';
import { format } from 'date-fns';
import { useState } from 'react';

export default function ProfileScreen() {
  const qc = useQueryClient();
  const [weightInput, setWeightInput] = useState('');
  const [showWeightInput, setShowWeightInput] = useState(false);

  const { data: latestWeight } = useQuery({
    queryKey: ['body-weight'],
    queryFn: () => getLatestMeasurement('weight'),
  });

  const { data: weightHistory = [] } = useQuery({
    queryKey: ['weight-history'],
    queryFn: () => getWeightHistory(5),
  });

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

  const totalSets = allWorkouts.reduce((s, w) => s + (w.totalSets ?? 0), 0);
  const totalVolume = allWorkouts.reduce((s, w) => s + (w.totalVolume ?? 0), 0);

  const [showPlateCalc, setShowPlateCalc] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-6">
          <Text className="text-text-tertiary text-xs uppercase tracking-widest font-semibold">Your</Text>
          <Text className="text-text-primary text-3xl font-bold tracking-tight">Profile</Text>
        </View>

        {/* Avatar & stats */}
        <View className="px-4 mb-6">
          <View className="bg-card border border-border rounded-2xl p-5">
            <View className="flex-row items-center gap-4 mb-5">
              <View className="w-16 h-16 rounded-full bg-accent/20 items-center justify-center">
                <User size={32} color="#F97316" />
              </View>
              <View>
                <Text className="text-text-primary text-xl font-bold">Athlete</Text>
                <Text className="text-text-tertiary text-sm">{allWorkouts.length} workouts logged</Text>
              </View>
            </View>

            <View className="flex-row">
              <View className="flex-1 items-center">
                <Text className="text-text-primary text-xl font-bold">{allWorkouts.length}</Text>
                <Text className="text-text-tertiary text-xs">Workouts</Text>
              </View>
              <View className="w-px bg-border" />
              <View className="flex-1 items-center">
                <Text className="text-text-primary text-xl font-bold">{totalSets}</Text>
                <Text className="text-text-tertiary text-xs">Total Sets</Text>
              </View>
              <View className="w-px bg-border" />
              <View className="flex-1 items-center">
                <Text className="text-text-primary text-xl font-bold">
                  {totalVolume > 1000 ? `${(totalVolume / 1000).toFixed(0)}t` : `${Math.round(totalVolume)}kg`}
                </Text>
                <Text className="text-text-tertiary text-xs">Volume</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Body Weight */}
        <View className="px-4 mb-5">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest">Body Weight</Text>
            <Pressable onPress={() => setShowWeightInput((v) => !v)}>
              <Plus size={18} color="#F97316" />
            </Pressable>
          </View>

          {showWeightInput && (
            <View className="bg-card border border-border rounded-xl p-4 mb-3 flex-row items-center gap-3">
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

          <View className="bg-card border border-border rounded-2xl px-5 py-4">
            {latestWeight ? (
              <>
                <Text className="text-text-primary text-4xl font-bold">
                  {latestWeight.value} <Text className="text-text-tertiary text-2xl">{latestWeight.unit}</Text>
                </Text>
                <Text className="text-text-tertiary text-xs mt-1">
                  Last logged {format(new Date(latestWeight.measuredAt), 'MMM d, yyyy')}
                </Text>
                {weightHistory.length > 1 && (
                  <View className="mt-3 pt-3 border-t border-border">
                    {weightHistory.slice(1, 4).map((m) => (
                      <View key={m.id} className="flex-row justify-between py-1">
                        <Text className="text-text-secondary text-sm">{m.value} kg</Text>
                        <Text className="text-text-muted text-xs">
                          {format(new Date(m.measuredAt), 'MMM d')}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <Pressable onPress={() => setShowWeightInput(true)}>
                <Text className="text-text-tertiary text-sm">Tap + to log your weight</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Tools & Settings */}
        <View className="px-4 mb-5">
          <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-3">Tools & Settings</Text>
          <View className="bg-card border border-border rounded-2xl overflow-hidden">
            {[
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
                value: 'Dark',
                icon: Moon,
                onPress: () => Alert.alert('Theme', 'Dark theme is active.'),
              },
              {
                label: 'Export Data',
                value: 'CSV / JSON',
                icon: Download,
                onPress: () => {
                  Alert.alert(
                    'Export Workouts',
                    'Choose export format:',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'CSV', onPress: () => exportWorkouts(allWorkouts, 'csv') },
                      { text: 'JSON', onPress: () => exportWorkouts(allWorkouts, 'json') },
                    ],
                  );
                },
              },
            ].map((item, i) => (
              <Pressable
                key={item.label}
                onPress={item.onPress}
                className={`flex-row items-center px-4 py-4 gap-3 active:bg-surface ${i > 0 ? 'border-t border-border' : ''}`}
              >
                <View className="w-8 h-8 rounded-lg bg-surface items-center justify-center">
                  <item.icon size={16} color="#A1A1AA" />
                </View>
                <Text className="flex-1 text-text-primary font-medium">{item.label}</Text>
                {item.value ? <Text className="text-text-tertiary text-sm">{item.value}</Text> : null}
                <ChevronRight size={16} color="#52525B" />
              </Pressable>
            ))}
          </View>
        </View>

        {/* App info */}
        <View className="px-4 items-center">
          <Text className="text-text-muted text-xs font-bold tracking-widest">GYMLOG</Text>
          <Text className="text-text-muted text-xs mt-1">Version 1.0.0 · Think less. Log faster.</Text>
        </View>
      </ScrollView>

      {/* Plate Calculator Modal */}
      <PlateCalculatorModal
        visible={showPlateCalc}
        onClose={() => setShowPlateCalc(false)}
        initialWeight={60}
      />
    </SafeAreaView>
  );
}
