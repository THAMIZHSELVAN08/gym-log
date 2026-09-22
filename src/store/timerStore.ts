import { create } from 'zustand';

export interface TimerStore {
  isRunning: boolean;
  isPaused: boolean;
  totalSeconds: number;
  remainingSeconds: number;
  exerciseName: string | null;
  restStartTimestamp: number | null; // epoch ms when current run started
  pausedRemaining: number; // seconds remaining when paused
  intervalId: ReturnType<typeof setInterval> | null;

  // Actions
  startTimer: (seconds: number, exerciseName?: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  skipTimer: () => void;
  adjustTimer: (deltaSeconds: number) => void;
  tick: () => void;
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  isRunning: false,
  isPaused: false,
  totalSeconds: 0,
  remainingSeconds: 0,
  exerciseName: null,
  restStartTimestamp: null,
  pausedRemaining: 0,
  intervalId: null,

  startTimer: (seconds, exerciseName) => {
    const { intervalId } = get();
    if (intervalId) clearInterval(intervalId);

    const now = Date.now();
    const id = setInterval(() => {
      get().tick();
    }, 500);

    set({
      isRunning: true,
      isPaused: false,
      totalSeconds: seconds,
      remainingSeconds: seconds,
      exerciseName: exerciseName ?? null,
      restStartTimestamp: now,
      pausedRemaining: seconds,
      intervalId: id,
    });
  },

  pauseTimer: () => {
    const { intervalId, remainingSeconds } = get();
    if (intervalId) clearInterval(intervalId);
    set({
      isRunning: false,
      isPaused: true,
      pausedRemaining: remainingSeconds,
      intervalId: null,
    });
  },

  resumeTimer: () => {
    const { pausedRemaining, intervalId } = get();
    if (pausedRemaining <= 0) return;
    if (intervalId) clearInterval(intervalId);

    const now = Date.now();
    const id = setInterval(() => {
      get().tick();
    }, 500);

    set({
      isRunning: true,
      isPaused: false,
      restStartTimestamp: now - (get().totalSeconds - pausedRemaining) * 1000,
      remainingSeconds: pausedRemaining,
      intervalId: id,
    });
  },

  skipTimer: () => {
    const { intervalId } = get();
    if (intervalId) clearInterval(intervalId);
    set({
      isRunning: false,
      isPaused: false,
      remainingSeconds: 0,
      restStartTimestamp: null,
      pausedRemaining: 0,
      intervalId: null,
    });
  },

  adjustTimer: (deltaSeconds) => {
    const { isRunning, remainingSeconds, totalSeconds, restStartTimestamp } = get();
    const newRemaining = Math.max(0, remainingSeconds + deltaSeconds);
    const newTotal = Math.max(totalSeconds, newRemaining);

    if (isRunning && restStartTimestamp) {
      // Adjust start timestamp by inverse of delta so timestamp-based math stays consistent
      const adjustedStart = restStartTimestamp + (deltaSeconds * -1000);
      set({
        remainingSeconds: newRemaining,
        totalSeconds: newTotal,
        restStartTimestamp: adjustedStart,
        pausedRemaining: newRemaining,
      });
    } else {
      set({
        remainingSeconds: newRemaining,
        totalSeconds: newTotal,
        pausedRemaining: newRemaining,
      });
    }
  },

  tick: () => {
    const { isRunning, isPaused, totalSeconds, restStartTimestamp, intervalId } = get();
    if (!isRunning || isPaused || !restStartTimestamp) return;

    const elapsed = Math.floor((Date.now() - restStartTimestamp) / 1000);
    const remaining = Math.max(0, totalSeconds - elapsed);

    if (remaining <= 0) {
      if (intervalId) clearInterval(intervalId);
      set({
        remainingSeconds: 0,
        isRunning: false,
        isPaused: false,
        intervalId: null,
        restStartTimestamp: null,
        pausedRemaining: 0,
      });
      return;
    }

    set({ remainingSeconds: remaining, pausedRemaining: remaining });
  },
}));
