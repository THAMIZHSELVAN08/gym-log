import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line, Text as SvgText } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import { Trophy, TrendingUp, ChevronDown, Check } from 'lucide-react-native';
import { getExerciseProgression, type LiftProgressPoint } from '../../db/queries/workouts';
import { getAllExercises } from '../../db/queries/exercises';
import { getPrsForExercise } from '../../db/queries/prs';
import { useThemeStore } from '../../store/themeStore';
import { format, differenceInDays } from 'date-fns';

interface StrengthChartProps {
  initialExerciseId?: string;
}

export function StrengthChart({ initialExerciseId }: StrengthChartProps) {
  const { theme } = useThemeStore();
  const isLight = theme === 'light';

  const [metricMode, setMetricMode] = useState<'weight' | 'e1rm'>('e1rm');
  const [selectedPoint, setSelectedPoint] = useState<LiftProgressPoint | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const { data: exercises = [] } = useQuery({
    queryKey: ['all-exercises'],
    queryFn: getAllExercises,
  });

  const defaultExerciseId = initialExerciseId || exercises[0]?.id || 'ex_bench_press_barbell';
  const [selectedExerciseId, setSelectedExerciseId] = useState(defaultExerciseId);

  // Sync if default becomes available
  React.useEffect(() => {
    if (!selectedExerciseId && exercises.length > 0) {
      setSelectedExerciseId(exercises[0]!.id);
    }
  }, [exercises, selectedExerciseId]);

  const selectedExercise = exercises.find((e) => e.id === selectedExerciseId);

  const { data: progression = [] } = useQuery({
    queryKey: ['exercise-progression', selectedExerciseId],
    queryFn: () => getExerciseProgression(selectedExerciseId),
    enabled: !!selectedExerciseId,
  });

  const { data: prs = [] } = useQuery({
    queryKey: ['exercise-prs', selectedExerciseId],
    queryFn: () => getPrsForExercise(selectedExerciseId),
    enabled: !!selectedExerciseId,
  });

  // Calculate Days Since Last PR
  const latestPr = prs[0];
  const daysSincePr = latestPr
    ? differenceInDays(new Date(), new Date(latestPr.achievedAt))
    : null;

  // Calculate % Progression Callout
  const progressCallout = (() => {
    if (progression.length < 2) return null;
    const first = metricMode === 'e1rm' ? progression[0]!.estimated1rm : progression[0]!.maxWeight;
    const last = metricMode === 'e1rm' ? progression[progression.length - 1]!.estimated1rm : progression[progression.length - 1]!.maxWeight;
    const diff = last - first;
    const pct = first > 0 ? (diff / first) * 100 : 0;
    const sign = diff >= 0 ? '+' : '';
    return {
      text: `${sign}${diff.toFixed(1)} kg (${sign}${pct.toFixed(1)}%)`,
      isPositive: diff >= 0,
    };
  })();

  // Chart coordinate calculations
  const svgWidth = 320;
  const svgHeight = 170;
  const paddingX = 24;
  const paddingY = 24;

  const chartData = progression.map((p) => ({
    ...p,
    value: metricMode === 'e1rm' ? p.estimated1rm : p.maxWeight,
  }));

  const values = chartData.map((d) => d.value);
  const rawMin = Math.min(...(values.length > 0 ? values : [0]));
  const rawMax = Math.max(...(values.length > 0 ? values : [100]));
  const minVal = Math.max(0, Math.floor(rawMin * 0.9));
  const maxVal = Math.ceil(rawMax * 1.1) || 100;
  const valRange = maxVal - minVal || 1;

  const points = chartData.map((d, i) => {
    const x = paddingX + (i / Math.max(chartData.length - 1, 1)) * (svgWidth - paddingX * 2);
    const y = svgHeight - paddingY - ((d.value - minVal) / valRange) * (svgHeight - paddingY * 2);
    return { x, y, data: d };
  });

  const linePath = points.length > 1
    ? points.reduce((acc, curr, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${curr.x} ${curr.y}`, '')
    : points.length === 1
    ? `M ${points[0]!.x} ${points[0]!.y} L ${points[0]!.x + 1} ${points[0]!.y}`
    : '';

  const areaPath = points.length > 1
    ? `${linePath} L ${points[points.length - 1]!.x} ${svgHeight - paddingY} L ${points[0]!.x} ${svgHeight - paddingY} Z`
    : '';

  return (
    <View className="bg-card border border-border rounded-2xl p-4 mb-5">
      {/* Top Controls: Exercise Selector & Metric Toggle */}
      <View className="flex-row items-center justify-between mb-3">
        <Pressable
          onPress={() => setIsPickerOpen(true)}
          className="flex-row items-center bg-surface border border-border rounded-xl px-3 py-2 flex-1 mr-3"
        >
          <Text className="text-text-primary text-sm font-semibold flex-1" numberOfLines={1}>
            {selectedExercise?.name ?? 'Select Exercise'}
          </Text>
          <ChevronDown size={16} color="#A1A1AA" />
        </Pressable>

        {/* Metric Switcher */}
        <View className="flex-row bg-surface border border-border rounded-xl p-0.5">
          <Pressable
            onPress={() => {
              setMetricMode('e1rm');
              setSelectedPoint(null);
            }}
            className={`px-2.5 py-1.5 rounded-lg ${metricMode === 'e1rm' ? 'bg-accent' : ''}`}
          >
            <Text className={`text-xs font-semibold ${metricMode === 'e1rm' ? 'text-white' : 'text-text-tertiary'}`}>
              Est. 1RM
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setMetricMode('weight');
              setSelectedPoint(null);
            }}
            className={`px-2.5 py-1.5 rounded-lg ${metricMode === 'weight' ? 'bg-accent' : ''}`}
          >
            <Text className={`text-xs font-semibold ${metricMode === 'weight' ? 'text-white' : 'text-text-tertiary'}`}>
              Top Set
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Motivational Insights Header */}
      <View className="flex-row items-center justify-between mb-3 bg-surface/60 border border-border/50 rounded-xl px-3 py-2">
        <View className="flex-row items-center gap-1.5">
          <TrendingUp size={15} color={progressCallout?.isPositive !== false ? '#22C55E' : '#EF4444'} />
          <Text className="text-xs text-text-secondary">
            {progressCallout ? (
              <Text className="font-semibold text-text-primary">{progressCallout.text} overall</Text>
            ) : (
              'Log multiple sessions to view trend'
            )}
          </Text>
        </View>

        {daysSincePr !== null && (
          <View className="flex-row items-center gap-1 bg-pr/10 px-2 py-0.5 rounded-full">
            <Trophy size={11} color="#F59E0B" />
            <Text className="text-2xs font-semibold text-pr">
              {daysSincePr === 0 ? 'PR Today!' : `${daysSincePr}d since PR`}
            </Text>
          </View>
        )}
      </View>

      {/* Chart SVG */}
      {progression.length > 0 ? (
        <View className="items-center justify-center my-1">
          <Svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
            <Defs>
              <LinearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#F97316" stopOpacity="0.35" />
                <Stop offset="1" stopColor="#F97316" stopOpacity="0.0" />
              </LinearGradient>
            </Defs>

            {/* Horizontal Grid lines */}
            <Line
              x1={paddingX}
              y1={paddingY}
              x2={svgWidth - paddingX}
              y2={paddingY}
              stroke={isLight ? '#E2E8F0' : '#27272A'}
              strokeDasharray="4 4"
            />
            <Line
              x1={paddingX}
              y1={svgHeight / 2}
              x2={svgWidth - paddingX}
              y2={svgHeight / 2}
              stroke={isLight ? '#E2E8F0' : '#27272A'}
              strokeDasharray="4 4"
            />
            <Line
              x1={paddingX}
              y1={svgHeight - paddingY}
              x2={svgWidth - paddingX}
              y2={svgHeight - paddingY}
              stroke={isLight ? '#CBD5E1' : '#3F3F46'}
            />

            {/* Y Axis Labels */}
            <SvgText x={paddingX - 4} y={paddingY + 4} fill="#71717A" fontSize="9" textAnchor="end">
              {`${maxVal}kg`}
            </SvgText>
            <SvgText x={paddingX - 4} y={svgHeight / 2 + 3} fill="#71717A" fontSize="9" textAnchor="end">
              {`${Math.round((maxVal + minVal) / 2)}kg`}
            </SvgText>
            <SvgText x={paddingX - 4} y={svgHeight - paddingY + 3} fill="#71717A" fontSize="9" textAnchor="end">
              {`${minVal}kg`}
            </SvgText>

            {/* Gradient Fill under line */}
            {areaPath ? <Path d={areaPath} fill="url(#chartGradient)" /> : null}

            {/* Stroke Line */}
            {linePath ? (
              <Path
                d={linePath}
                fill="none"
                stroke="#F97316"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}

            {/* Interactive Data Points */}
            {points.map((pt, i) => {
              const isSelected = selectedPoint?.workoutId === pt.data.workoutId;
              return (
                <Circle
                  key={i}
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? 6 : 4}
                  fill={isSelected ? '#FFFFFF' : '#F97316'}
                  stroke={isSelected ? '#F97316' : '#0D0D0D'}
                  strokeWidth={2}
                  onPress={() => setSelectedPoint(pt.data)}
                />
              );
            })}
          </Svg>

          {/* Selected Point Detail Callout / Tooltip */}
          {selectedPoint ? (
            <View className="bg-surface border border-accent/40 rounded-xl p-2.5 mt-2 w-full flex-row items-center justify-between">
              <View>
                <Text className="text-text-primary text-xs font-bold">
                  {format(new Date(selectedPoint.date), 'MMM d, yyyy')}
                </Text>
                <Text className="text-text-tertiary text-2xs">{selectedPoint.workoutName}</Text>
              </View>
              <View className="items-end">
                <Text className="text-accent text-sm font-bold">
                  {metricMode === 'e1rm'
                    ? `${selectedPoint.estimated1rm} kg (Est. 1RM)`
                    : `${selectedPoint.maxWeight} kg × ${selectedPoint.maxReps}`}
                </Text>
                <Text className="text-text-muted text-2xs">
                  Session Vol: {Math.round(selectedPoint.volume)} kg
                </Text>
              </View>
            </View>
          ) : (
            <Text className="text-text-muted text-2xs mt-1 text-center">
              Tap any point to inspect session details
            </Text>
          )}
        </View>
      ) : (
        <View className="py-8 items-center justify-center">
          <Text className="text-text-tertiary text-sm">No workout sessions logged for this lift yet.</Text>
        </View>
      )}

      {/* Exercise Picker Modal */}
      <Modal visible={isPickerOpen} animationType="slide" transparent>
        <View className="flex-1 bg-black/80 justify-end">
          <View className="bg-card border-t border-border rounded-t-3xl max-h-[70%] p-5 pb-8">
            <View className="flex-row items-center justify-between pb-3 border-b border-border">
              <Text className="text-text-primary text-base font-bold">Select Exercise</Text>
              <Pressable onPress={() => setIsPickerOpen(false)} className="p-1">
                <Text className="text-accent font-semibold text-sm">Done</Text>
              </Pressable>
            </View>

            <ScrollView className="mt-3">
              {exercises.map((ex) => {
                const isSelected = ex.id === selectedExerciseId;
                return (
                  <Pressable
                    key={ex.id}
                    onPress={() => {
                      setSelectedExerciseId(ex.id);
                      setSelectedPoint(null);
                      setIsPickerOpen(false);
                    }}
                    className={`flex-row items-center justify-between py-3 px-3 rounded-xl mb-1 ${
                      isSelected ? 'bg-accent/15 border border-accent/40' : 'active:bg-surface'
                    }`}
                  >
                    <View>
                      <Text className={`text-sm font-semibold ${isSelected ? 'text-accent' : 'text-text-primary'}`}>
                        {ex.name}
                      </Text>
                      <Text className="text-text-tertiary text-2xs capitalize">
                        {ex.primaryMuscle} • {ex.equipment}
                      </Text>
                    </View>
                    {isSelected && <Check size={16} color="#F97316" />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
