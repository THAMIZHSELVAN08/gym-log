/**
 * Calculates estimated 1 Rep Max using the Epley formula.
 * 1RM = weight × (1 + reps / 30)
 */
export function calculateEpley1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/**
 * Calculates volume for a set: weight × reps
 */
export function calculateSetVolume(weight: number, reps: number): number {
  return weight * reps;
}

/**
 * Formats a weight value for display.
 * - Removes trailing .0 for whole numbers
 * - Keeps one decimal for .5 increments
 */
export function formatWeight(weight: number, unit: 'kg' | 'lb' = 'kg'): string {
  const formatted = weight % 1 === 0 ? weight.toString() : weight.toFixed(1);
  return `${formatted} ${unit}`;
}

/**
 * Formats a duration in seconds to MM:SS or HH:MM:SS
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

/**
 * Returns a progressive overload suggestion.
 */
export function getProgressionSuggestion(
  lastWeight: number,
  lastReps: number,
  targetRepsMin: number,
  targetRepsMax: number,
): { weight: number; repsMin: number; repsMax: number } | null {
  if (lastReps >= targetRepsMax) {
    // Increase weight by standard increment
    const increment = lastWeight >= 60 ? 2.5 : lastWeight >= 20 ? 2.5 : 1;
    return {
      weight: lastWeight + increment,
      repsMin: targetRepsMin,
      repsMax: targetRepsMax,
    };
  }
  if (lastReps >= targetRepsMin) {
    return {
      weight: lastWeight,
      repsMin: lastReps + 1,
      repsMax: targetRepsMax,
    };
  }
  return null;
}

/**
 * Converts kg to lbs and vice versa.
 */
export function convertWeight(value: number, from: 'kg' | 'lb', to: 'kg' | 'lb'): number {
  if (from === to) return value;
  if (from === 'kg' && to === 'lb') return Math.round(value * 2.20462 * 4) / 4;
  return Math.round((value / 2.20462) * 4) / 4;
}

/**
 * Calculates the plates needed per side for a given target weight.
 */
export interface PlateResult {
  perSide: { weight: number; count: number }[];
  totalPerSide: number;
  remainder: number;
}

export function calculatePlates(
  targetWeight: number,
  barWeight: number,
  availablePlates: number[] = [20, 15, 10, 5, 2.5, 1.25],
): PlateResult {
  const perSideTarget = (targetWeight - barWeight) / 2;
  let remaining = perSideTarget;
  const perSide: { weight: number; count: number }[] = [];
  const sortedPlates = [...availablePlates].sort((a, b) => b - a);

  for (const plate of sortedPlates) {
    const count = Math.floor(remaining / plate);
    if (count > 0) {
      perSide.push({ weight: plate, count });
      remaining -= plate * count;
      remaining = Math.round(remaining * 1000) / 1000;
    }
  }

  return {
    perSide,
    totalPerSide: perSideTarget - remaining,
    remainder: remaining,
  };
}
