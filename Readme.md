# utreker

A local-first habit tracker focused not just on habits, but on the full shape of a day: mood, energy, notes, context, and simple insights.

utreker is not trying to be another streak-only habit app. The core idea is different: treat the day as a complete picture and help people see what actually affects their wellbeing, consistency, and routine.

## What This Project Is

**utreker** is a PWA for habit tracking and daily self-observation that runs locally in the browser and can be installed like an app.

Instead of the usual “check the box and move on” model, utreker builds each day from several signals:

- mood on a 1-5 scale
- energy on a 1-5 scale
- scheduled habits
- goals with progress tracking
- context tags like stress, illness, travel, or rest
- notes about how the day went

Based on that data, the app shows history, period comparisons, basic trends, and text-based insights.

## Key Features

### 1. The day as a single unit
Most trackers focus either on habits or on mood. In utreker, those pieces live inside the same daily entry: your state, your actions, and your context are captured in one place instead of being split across different flows.

### 2. Not just completion, but context
A missed day does not explain much on its own. utreker lets you attach context tags and notes so you can understand why a day was weaker than usual: stress, illness, overload, travel, or recovery.

### 3. Insights instead of raw stats
The project is built to answer “what affects how I feel?” rather than just dumping numbers into charts. The current MVP already includes:

- mood and energy trends
- period comparisons
- correlations between habits and daily state
- text insights based on recent data

### 4. A flexible habit model
The app supports more than binary habits. You can track:

- yes-or-no habits
- scale-based habits with targets
- long-term goals with progress, deadlines, and units

### 5. Local-first by design
Data is stored locally in IndexedDB via Dexie. That gives the app fast response times, offline support, and full user control without requiring a backend.

## Why utreker Can Be Better Than a Typical Habit Tracker

- It is closer to real life: habits are not separated from mood, energy, and daily events.
- It is better for reflection: you do not just see numbers, you start noticing patterns.
- Its philosophy is softer: less “I failed the day,” more “I understand what is happening to me.”
- It is more private: the current version stores everything locally on the device.
- It is faster for day-to-day use: one main screen covers the core daily ritual.

## Where It Stands Against Competitors

This is not an attempt to declare one universal winner. Each product has its own strengths. But utreker positions itself like this:

| Product | Main focus | What utreker does differently |
| --- | --- | --- |
| **Daylio** | Fast mood tracking and journaling | Combines mood tracking with habits, goals, daily context, and relationship-based analytics |
| **Loop Habit Tracker** | Habits, streaks, discipline | Adds energy, mood, notes, and an attempt to explain change instead of only recording completion |
| **Habitica** | Gamification and motivation | Focuses on mindful self-tracking and personal patterns instead of turning the experience into a game |
| **A typical habit app** | Checkboxes and percentages | Builds a more complete picture of the day and gives users more material for reflection |

In short:

- **Daylio** is closer to a mood journal
- **Loop** is closer to a strict habit tracker
- **Habitica** is closer to a gamified productivity tool
- **utreker** sits between those categories and focuses on the connection between habits and personal state

## What Already Exists in the MVP

- **Today** screen for daily input
- mood and energy pickers
- scheduled habits
- goals with progress tracking
- notes and context tags
- **History** screen with calendar, metrics, and charts
- **Insights** screen with trends, correlations, and text summaries
- **Habits** screen for managing habits, categories, and archive state
- a default set of starter habits
- installable PWA setup
- offline support and local data storage

## Who This Project Is For

utreker is a good fit for people who want to:

- track not only habits, but also internal state
- understand what affects productivity and wellbeing
- keep a personal tracker without unnecessary complexity
- use a local-first app without mandatory signup

It is especially relevant for people who have outgrown the classic “one checkbox per day” format, but do not want to move into heavy, overbuilt analytics systems.

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- Dexie + IndexedDB
- React Router
- vite-plugin-pwa

## Run Locally

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Google Drive Sync

Optional cross-device sync stores a single backup file in a hidden, app-private
folder on the user's own Google Drive (`appDataFolder` scope — the app cannot see
any other files). It uses browser-side OAuth via Google Identity Services, so there
is **no backend and no client secret**.

If `VITE_GOOGLE_CLIENT_ID` is not set, the sync UI shows a "not configured" notice
and only local JSON export/import is available — everything else keeps working.

### Getting an OAuth Client ID

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and create a
   project (or pick an existing one).
2. **APIs & Services → Library** → enable **Google Drive API**.
3. **APIs & Services → OAuth consent screen**:
   - User type: **External**, fill in app name, support email, developer email.
   - Add the scope `https://www.googleapis.com/auth/drive.appdata`.
   - While the app is in "Testing", add the Google accounts that may sign in as
     **Test users** (or submit for verification to allow anyone).
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**.
   - **Authorized JavaScript origins** — add every origin the app runs on, e.g.
     `http://localhost:5173` (dev) and `https://<username>.github.io` (Pages).
     No redirect URIs are needed for the token flow.
   - Copy the generated **Client ID** (looks like `xxxx.apps.googleusercontent.com`).

The Client ID is **public by design** — it ships in the browser bundle. Security
comes from the Authorized JavaScript origins list, not from keeping the ID secret.
There is no client secret in this flow; never put one in frontend code.

### Configuring it

- **Local dev:** copy `.env.example` to `.env.local` and set `VITE_GOOGLE_CLIENT_ID`.
- **GitHub Pages (Actions):** add a repository secret
  **Settings → Secrets and variables → Actions → New repository secret** named
  `VITE_GOOGLE_CLIENT_ID`. The deploy workflow injects it at build time.

Forks just need their own Client ID with their own origins — nothing else to change.

## Project Status

This is currently an **MVP** that already demonstrates the core product idea: local-first tracking of habits and daily state with analytics layered on top of personal data.

The current UI is primarily oriented toward Russian-speaking users.

## Why This Project Is Worth Opening on GitHub

- There is a clear product idea here, not just a collection of screens.
- The positioning against popular habit trackers is concrete and easy to understand.
- The project addresses a real user problem: connecting habits, mood, and daily context.
- It is a solid example of a local-first PWA built on a modern React stack.

## Roadmap

Logical next steps for the project include:

- data export and import
- cross-device sync
- deeper insights and recommendations
- more filters and segmentation in history
- onboarding and first-run setup based on user type

## License

License not selected yet.
