import { getLatestPrForExercise, savePr } from '../db/queries/prs';
import { calculateEpley1RM, calculateSetVolume } from '../utils/calculations';
import type { WorkoutSet, PrType } from '../db/schema';

export interface PrResult {
  prType: PrType;
  value: number;
  previousValue?: number;
  label: string;
  description: string;
}

/**
 * PR Engine — evaluates a completed set against all-time bests.
 * Checks: max weight, max reps (at same weight), estimated 1RM, volume.
 * Returns an array of new PRs achieved (may be empty).
 */
export async function evaluatePrs(
  set: WorkoutSet,
): Promise<PrResult[]> {
  if (!set.isCompleted || !set.weight || !set.reps) return [];
  if (set.setType === 'warmup') return [];

  const { weight, reps, exerciseId, workoutId, id: workoutSetId } = set;
  const achievedAt = new Date().toISOString();
  const newPrs: PrResult[] = [];

  // ── 1. Max Weight PR ───────────────────────────────────────────────────────
  const maxWeightPr = await getLatestPrForExercise(exerciseId, 'max_weight');
  if (!maxWeightPr || weight > (maxWeightPr.weight ?? 0)) {
    await savePr({
      exerciseId,
      workoutId,
      workoutSetId,
      prType: 'max_weight',
      weight,
      reps,
      achievedAt,
    });
    newPrs.push({
      prType: 'max_weight',
      value: weight,
      previousValue: maxWeightPr?.weight ?? undefined,
      label: 'Max Weight',
      description: `${weight} kg × ${reps}`,
    });
  }

  // ── 2. Estimated 1RM PR ────────────────────────────────────────────────────
  const e1rm = calculateEpley1RM(weight, reps);
  const e1rmPr = await getLatestPrForExercise(exerciseId, 'estimated_1rm');
  if (!e1rmPr || e1rm > (e1rmPr.estimated1rm ?? 0)) {
    await savePr({
      exerciseId,
      workoutId,
      workoutSetId,
      prType: 'estimated_1rm',
      weight,
      reps,
      estimated1rm: e1rm,
      achievedAt,
    });
    newPrs.push({
      prType: 'estimated_1rm',
      value: e1rm,
      previousValue: e1rmPr?.estimated1rm ?? undefined,
      label: 'Est. 1RM',
      description: `${e1rm.toFixed(1)} kg (${weight} kg × ${reps})`,
    });
  }

  // ── 3. Best Set Volume PR ──────────────────────────────────────────────────
  const setVolume = calculateSetVolume(weight, reps);
  const setVolumePr = await getLatestPrForExercise(exerciseId, 'best_set_volume');
  if (!setVolumePr || setVolume > (setVolumePr.volume ?? 0)) {
    await savePr({
      exerciseId,
      workoutId,
      workoutSetId,
      prType: 'best_set_volume',
      weight,
      reps,
      volume: setVolume,
      achievedAt,
    });
    newPrs.push({
      prType: 'best_set_volume',
      value: setVolume,
      previousValue: setVolumePr?.volume ?? undefined,
      label: 'Best Set Volume',
      description: `${setVolume} kg`,
    });
  }

  // Return only the most meaningful PR (avoid flooding the user with 3 alerts for one set)
  // Priority: est_1rm > max_weight > best_set_volume
  const priorityOrder: PrType[] = ['estimated_1rm', 'max_weight', 'best_set_volume'];
  return newPrs.sort(
    (a, b) => priorityOrder.indexOf(a.prType) - priorityOrder.indexOf(b.prType),
  );
}
