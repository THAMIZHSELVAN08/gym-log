# GymLog 🏋️‍♂️

> A fast, friction-free, offline-first personal workout tracker and training log built with **React Native**, **Expo SDK 57**, and **SQLite**.

GymLog is engineered for real gym sessions: walk in, start your workout, glance at your previous performance, log your sets with minimal taps, rest, and break personal records — all completely offline with local SQLite persistence.

---

## ✨ Features

### ⚡ Strong-Level Live Workout Logging
- **Frictionless Set Logging**: Log weight and reps in seconds with stepper controls (`±2.5kg`, `±1 rep`).
- **Previous Performance Side-by-Side**: Every exercise automatically loads the previous session's weight and reps (`50kg × 8`) directly from SQLite beside current sets.
- **Smart Auto-Fill**: Adding a new set automatically inherits sensible defaults from your previous set.
- **Set Types**: Support for **Normal (`1, 2, 3...`)**, **Warm-up (`W`)**, **Drop Set (`D`)**, and **Failure (`F`)** sets.
- **Supersets & Circuits**: Group exercises into supersets (e.g. `SUPERSET A — A1, A2`) with clean visual badges.
- **Three-Tier Note Hierarchy**:
  - 📌 **Persistent Pinned Reminders**: Stored on the exercise itself and automatically displayed across every current and future workout (e.g. seat height, grip cues).
  - 📝 **Workout-Instance Exercise Notes**: Session-specific notes preserved in workout history.
  - 📋 **Workout Notes**: High-level notes for the entire session.
- **In-Workout Context Menus**: Add warm-up sets, customize rest timers, replace exercises in-place, reorder exercises (move up/down), or remove exercises.
- **PR Detection Engine**: Real-time evaluation of **Max Weight PRs**, **Max Reps PRs**, **Best Set Volume**, and **Estimated 1RM** (Epley formula) with celebratory haptics.
- **Crash & Interruption Recovery**: Workouts in progress survive app kills, screen locks, and background interruptions.

### ⏱️ Timestamp-Based Rest Timer
- Rest calculations use epoch timestamps (`restStartTimestamp`, `totalSeconds`, `pausedRemaining`), ensuring the countdown survives screen locks, backgrounding, and navigation without drifting or resetting.
- Quick controls: `-10s`, `+10s`, `Pause/Resume`, and `Skip`.
- Configurable per-exercise rest duration (e.g. 120s vs 60s) with auto-start on set completion.

### 📊 Deep Analytics & Progress Hub
- **Lifetime Tonnage Metrics**: Real-time calculation of total lifetime tonnage (`t`), completed workouts, and active streaks.
- **Interactive Strength Progression Charts**: Filter by exercise to see weight and estimated 1RM progression over time.
- **16-Week Consistency Heatmap**: Visual activity grid tracking workout frequency and momentum.
- **Muscle Balance Donut Chart**: Distribution breakdown of training volume across major muscle groups.
- **PR Timeline**: Chronological milestone showcase of all broken records.

### 📚 Exercise Library & Detail Drill-Downs
- Comprehensive exercise library with muscle groups, equipment types, and movement classifications.
- **Custom Exercise Creation**: Add any custom movement with primary/secondary muscle tags and default configurations.
- **Exercise Detail Screen**:
  - **History Tab**: All past workouts featuring this exercise with date, set details, and 1RM.
  - **Records Tab**: Max Weight, Estimated 1RM, Max Reps, and Best Weight across 5, 8, and 10 rep ranges.
  - **Charts Tab**: Progression data points over time.
  - **📌 Pinned Reminder Editor**: Quick editing of persistent exercise cues.

### 🔄 Workout Continuity & History
- **Perform Again**: One-tap recreation of any past workout into a fresh active workout session with identical structure and supersets (uncompleted), auto-loading previous performance.
- **Atomic Deletion**: Safe, immediate SQLite deletion of workouts and dependent sets/records with instant UI cache updates.
- **Routine Templates**: Save workouts as reusable routines (`Push Day`, `Pull Day`, `Leg Day...`) and update templates directly from live workouts.

---

## 🛠️ Technology Stack

- **Framework**: [Expo SDK 57](https://expo.dev) / [React Native 0.86](https://reactnative.dev) (New Architecture / React 19)
- **Routing & Navigation**: [Expo Router v4](https://docs.expo.dev/router/introduction/) (File-based navigation)
- **Database & Storage**: [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/) with [Drizzle ORM](https://orm.drizzle.team/) (WAL mode, foreign keys, local schema migrations)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) (Workout engine & timestamp timer stores)
- **Data Fetching & Cache**: [TanStack Query v5](https://tanstack.com/query/latest) (React Query)
- **Styling**: [NativeWind v4](https://www.nativewind.dev/) (Tailwind CSS) & [Lucide Icons](https://lucide.dev)
- **Animations & Feedback**: [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/) & [Expo Haptics](https://docs.expo.dev/versions/latest/sdk/haptics/)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or bun

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/THAMIZHSELVAN08/gym-log.git
   cd gym-log
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run start
   ```

4. **Run on Android / iOS**:
   - Press `a` in the terminal to launch on an Android emulator / connected device.
   - Press `i` to launch on an iOS simulator (macOS required).
   - Scan the QR code using the **Expo Go** app on your physical device.

---

## 🏗️ Build & Production

This project uses **EAS Build** (Expo Application Services) for cloud builds:

```bash
# Build Android APK preview
npx eas-cli build --platform android --profile preview

# Build production Android App Bundle (AAB)
npx eas-cli build --platform android --profile production
```

---

## 📁 Project Architecture

```
gym-log/
├── app/                      # Expo Router screens
│   ├── (tabs)/               # Bottom tab navigators
│   │   ├── index.tsx         # Home screen (momentum, quick start, last workout)
│   │   ├── workouts.tsx      # Routines & templates library
│   │   ├── history.tsx       # Workout history list & long-press actions
│   │   ├── progress.tsx      # Progress Hub (charts, heatmap, muscle split)
│   │   └── profile.tsx       # Profile & app settings
│   ├── workout/
│   │   ├── active.tsx        # Active Workout Engine screen
│   │   ├── summary.tsx       # Workout completed summary
│   │   └── [id].tsx          # Historical workout breakdown & Perform Again
│   ├── exercise/
│   │   ├── [id].tsx          # Exercise detail (History, Records, Charts, Pinned note)
│   │   ├── picker.tsx        # Exercise search, category filter & replace mode
│   │   └── create.tsx        # Custom exercise creator
│   ├── routine/              # Routine creation & editor
│   └── _layout.tsx           # App root layout, theme provider & SQLite init
│
├── src/
│   ├── components/           # Reusable UI & progress visualizers
│   │   ├── progress/         # StrengthChart, ConsistencyHeatmap, MuscleSplitChart
│   │   └── tools/            # PlateCalculatorModal
│   ├── db/                   # Database layer
│   │   ├── schema.ts         # Drizzle SQLite table definitions
│   │   ├── migrate.ts        # Database migration runner
│   │   ├── client.ts         # SQLite instance & Drizzle client
│   │   └── queries/          # Type-safe queries (workouts, exercises, prs, routines)
│   ├── store/                # Zustand stores
│   │   ├── workoutStore.ts   # Active workout state & SQLite persistence engine
│   │   ├── timerStore.ts     # Timestamp-based rest timer engine
│   │   └── themeStore.ts     # Dark/Light theme store
│   └── utils/                # Calculations (1RM Epley, volume, duration formatting)
```

---

## 📜 License

This project is licensed under the **MIT License**.
