import { create } from 'zustand';

export interface TimerStore {
  isRunning: boolean;
  totalSeconds: number;
  remainingSeconds: number;
  exerciseName: string | null;
  startedAt: number | null; // epoch ms
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
  totalSeconds: 0,
  remainingSeconds: 0,
  exerciseName: null,
  startedAt: null,
  intervalId: null,

  startTimer: (seconds, exerciseName) => {
    const { intervalId } = get();
    if (intervalId) clearInterval(intervalId);

    const id = setInterval(() => {
      get().tick();
    }, 1000);

    set({
      isRunning: true,
      totalSeconds: seconds,
      remainingSeconds: seconds,
      exerciseName: exerciseName ?? null,
      startedAt: Date.now(),
      intervalId: id,
    });
  },

  pauseTimer: () => {
    const { intervalId } = get();
    if (intervalId) clearInterval(intervalId);
    set({ isRunning: false, intervalId: null });
  },

  resumeTimer: () => {
    const { remainingSeconds } = get();
    if (remainingSeconds <= 0) return;

    const id = setInterval(() => {
      get().tick();
    }, 1000);

    set({ isRunning: true, intervalId: id });
  },

  skipTimer: () => {
    const { intervalId } = get();
    if (intervalId) clearInterval(intervalId);
    set({ isRunning: false, remainingSeconds: 0, intervalId: null });
  },

  adjustTimer: (deltaSeconds) => {
    const { remainingSeconds, totalSeconds } = get();
    const newRemaining = Math.max(0, Math.min(remainingSeconds + deltaSeconds, totalSeconds + Math.abs(deltaSeconds)));
    set({ remainingSeconds: newRemaining, totalSeconds: Math.max(totalSeconds, newRemaining) });
  },

  tick: () => {
    const { remainingSeconds, intervalId } = get();
    if (remainingSeconds <= 1) {
      if (intervalId) clearInterval(intervalId);
      set({ remainingSeconds: 0, isRunning: false, intervalId: null });
      return;
    }
    set({ remainingSeconds: remainingSeconds - 1 });
  },
}));
