import React, { useState } from 'react';
import { View, Text, Modal, Pressable, TextInput, ScrollView } from 'react-native';
import { X, Plus, Minus, Disc } from 'lucide-react-native';
import { calculatePlates } from '../../utils/calculations';

interface PlateCalculatorModalProps {
  visible: boolean;
  onClose: () => void;
  initialWeight?: number;
}

const BAR_OPTIONS = [
  { label: 'Olympic (20 kg)', weight: 20 },
  { label: 'Women (15 kg)', weight: 15 },
  { label: 'EZ Curl (10 kg)', weight: 10 },
  { label: 'None (0 kg)', weight: 0 },
];

const PLATE_COLORS: Record<number, { bg: string; text: string; height: number }> = {
  25: { bg: '#DC2626', text: '#FFFFFF', height: 72 }, // Red
  20: { bg: '#2563EB', text: '#FFFFFF', height: 66 }, // Blue
  15: { bg: '#CA8A04', text: '#FFFFFF', height: 58 }, // Yellow
  10: { bg: '#16A34A', text: '#FFFFFF', height: 50 }, // Green
  5: { bg: '#E4E4E7', text: '#18181B', height: 42 }, // White
  2.5: { bg: '#27272A', text: '#FFFFFF', height: 34 }, // Black
  1.25: { bg: '#71717A', text: '#FFFFFF', height: 26 }, // Silver
};

export function PlateCalculatorModal({ visible, onClose, initialWeight = 60 }: PlateCalculatorModalProps) {
  const [targetWeight, setTargetWeight] = useState(initialWeight);
  const [barWeight, setBarWeight] = useState(20);

  // Sync initialWeight when modal opens
  React.useEffect(() => {
    if (initialWeight > 0) {
      setTargetWeight(initialWeight);
    }
  }, [initialWeight, visible]);

  const plateResult = calculatePlates(targetWeight, barWeight, [25, 20, 15, 10, 5, 2.5, 1.25]);

  const adjustWeight = (delta: number) => {
    setTargetWeight((prev) => Math.max(barWeight, Math.round((prev + delta) * 10) / 10));
  };

  // Flattened plates list for visual barbell stack
  const stackedPlates: number[] = [];
  for (const item of plateResult.perSide) {
    for (let i = 0; i < item.count; i++) {
      stackedPlates.push(item.weight);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/80 justify-end">
        <View className="bg-card border-t border-border rounded-t-3xl p-5 pb-8 max-h-[85%]">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 border-b border-border">
            <View className="flex-row items-center gap-2">
              <Disc size={20} color="#F97316" />
              <Text className="text-text-primary text-base font-bold">Plate Calculator</Text>
            </View>
            <Pressable onPress={onClose} className="w-8 h-8 rounded-full bg-surface items-center justify-center">
              <X size={16} color="#A1A1AA" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="mt-4">
            {/* Target Weight Controls */}
            <View className="bg-surface border border-border rounded-2xl p-4 mb-4">
              <Text className="text-text-tertiary text-xs font-semibold uppercase tracking-wider mb-2 text-center">
                Target Weight
              </Text>

              <View className="flex-row items-center justify-center gap-4 my-1">
                <Pressable
                  onPress={() => adjustWeight(-5)}
                  className="w-11 h-11 rounded-xl bg-card border border-border items-center justify-center active:bg-border"
                >
                  <Text className="text-text-primary font-bold text-sm">-5</Text>
                </Pressable>

                <Pressable
                  onPress={() => adjustWeight(-2.5)}
                  className="w-10 h-10 rounded-xl bg-card border border-border items-center justify-center active:bg-border"
                >
                  <Minus size={16} color="#A1A1AA" />
                </Pressable>

                <View className="items-center px-4">
                  <Text className="text-text-primary text-3xl font-bold">{targetWeight}</Text>
                  <Text className="text-text-tertiary text-xs font-semibold">kg total</Text>
                </View>

                <Pressable
                  onPress={() => adjustWeight(2.5)}
                  className="w-10 h-10 rounded-xl bg-card border border-border items-center justify-center active:bg-border"
                >
                  <Plus size={16} color="#A1A1AA" />
                </Pressable>

                <Pressable
                  onPress={() => adjustWeight(5)}
                  className="w-11 h-11 rounded-xl bg-card border border-border items-center justify-center active:bg-border"
                >
                  <Text className="text-text-primary font-bold text-sm">+5</Text>
                </Pressable>
              </View>
            </View>

            {/* Barbell Weight Selector */}
            <View className="mb-4">
              <Text className="text-text-secondary text-xs font-semibold mb-2">Barbell Weight</Text>
              <View className="flex-row gap-2">
                {BAR_OPTIONS.map((opt) => {
                  const isSelected = barWeight === opt.weight;
                  return (
                    <Pressable
                      key={opt.weight}
                      onPress={() => setBarWeight(opt.weight)}
                      className={`flex-1 py-2 px-1 rounded-xl border items-center justify-center ${
                        isSelected
                          ? 'bg-accent/15 border-accent'
                          : 'bg-surface border-border'
                      }`}
                    >
                      <Text
                        className={`text-2xs font-semibold text-center ${
                          isSelected ? 'text-accent' : 'text-text-secondary'
                        }`}
                      >
                        {opt.label.split(' ')[0]}
                      </Text>
                      <Text
                        className={`text-3xs ${isSelected ? 'text-accent font-bold' : 'text-text-muted'}`}
                      >
                        {opt.weight} kg
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Visual Barbell Collar & Loaded Plates */}
            <View className="bg-surface border border-border rounded-2xl p-4 mb-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-text-secondary text-xs font-semibold">Each Side Breakdown</Text>
                <Text className="text-accent text-xs font-bold">
                  {plateResult.totalPerSide} kg / side
                </Text>
              </View>

              {/* Graphical Barbell Visual */}
              <View className="h-24 bg-card border border-border/80 rounded-xl items-center justify-center px-4 overflow-hidden flex-row">
                {/* Bar center rod */}
                <View className="w-12 h-4 bg-zinc-600 rounded-l" />
                {/* Collar */}
                <View className="w-3.5 h-16 bg-zinc-400 rounded-sm border border-zinc-500" />
                <View className="w-2 h-6 bg-zinc-500" />

                {/* Plates stacked on sleeve */}
                <View className="flex-row items-center gap-0.5 flex-1">
                  {stackedPlates.map((wt, i) => {
                    const cfg = PLATE_COLORS[wt] || { bg: '#A1A1AA', text: '#FFFFFF', height: 40 };
                    return (
                      <View
                        key={i}
                        className="w-5 rounded-xs items-center justify-center border border-black/30"
                        style={{ height: cfg.height, backgroundColor: cfg.bg }}
                      >
                        <Text
                          className="text-3xs font-black rotate-90"
                          style={{ color: cfg.text }}
                        >
                          {wt}
                        </Text>
                      </View>
                    );
                  })}
                  {/* Empty sleeve remaining */}
                  <View className="flex-1 h-5 bg-zinc-700 rounded-r border border-zinc-600" />
                </View>
              </View>

              {/* Remainder alert if exact match impossible */}
              {plateResult.remainder > 0 && (
                <Text className="text-amber-500 text-xs mt-2 text-center">
                  ⚠️ Remainder: {plateResult.remainder * 2} kg cannot be loaded with available plates.
                </Text>
              )}
            </View>

            {/* Plate Quantity Cards */}
            <View className="flex-row flex-wrap gap-2 mb-2">
              {plateResult.perSide.map((p) => {
                const cfg = PLATE_COLORS[p.weight] || { bg: '#71717A', text: '#FFFFFF', height: 30 };
                return (
                  <View
                    key={p.weight}
                    className="flex-1 min-w-[30%] bg-surface border border-border rounded-xl p-2.5 items-center"
                  >
                    <View
                      className="w-6 h-6 rounded-full items-center justify-center mb-1"
                      style={{ backgroundColor: cfg.bg }}
                    >
                      <Text className="text-3xs font-bold" style={{ color: cfg.text }}>
                        {p.weight}
                      </Text>
                    </View>
                    <Text className="text-text-primary text-sm font-bold">
                      {p.count} × {p.weight} kg
                    </Text>
                    <Text className="text-text-muted text-3xs">per side</Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
