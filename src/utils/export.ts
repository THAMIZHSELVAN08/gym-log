import { Share, Alert } from 'react-native';
import { Workout } from '../db/schema';

export function convertWorkoutsToCsv(workouts: Workout[]): string {
  const headers = ['id', 'name', 'startedAt', 'finishedAt', 'durationSeconds', 'totalVolume', 'totalSets', 'totalReps', 'prCount'];
  const rows = workouts.map((w) => [
    w.id,
    `"${(w.name || '').replace(/"/g, '""')}"`,
    w.startedAt,
    w.finishedAt || '',
    w.durationSeconds || 0,
    w.totalVolume || 0,
    w.totalSets || 0,
    w.totalReps || 0,
    w.prCount || 0,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export async function exportWorkouts(workouts: Workout[], format: 'json' | 'csv' = 'json') {
  try {
    if (!workouts || workouts.length === 0) {
      Alert.alert('No Data', 'No workouts available to export yet.');
      return;
    }

    const content = format === 'csv'
      ? convertWorkoutsToCsv(workouts)
      : JSON.stringify(workouts, null, 2);

    await Share.share({
      title: `GymLog Workouts Export (${format.toUpperCase()})`,
      message: content,
    });
  } catch (err: any) {
    Alert.alert('Export Failed', err?.message || 'Could not export workout data.');
  }
}
