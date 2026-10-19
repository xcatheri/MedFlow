# MedFlow
 
**A medication scheduler that plans your day around your meals and sleep, and tells you why a dose can't move.**
 
Built for DubHacks 2026.
 
People who take several medications face rules that are easy to get wrong: *take this on an empty stomach 30 to 60 minutes before breakfast*, *keep these two apart by 4 hours*, *wait 18 hours between doses*. MedFlow takes a person's medication list and daily routine, builds a daily schedule that satisfies every rule, and explains each time in plain language. If the person wants to change a dose time, the app checks the change against the same rules and either accepts it or refuses it with the exact reason.
 
> MedFlow is a hackathon project. It is **not medical advice**. Always follow your prescription and ask your pharmacist or prescriber before changing how you take a medication.
 
---
 
## What it does
 
- **Builds a schedule from your routine.** You enter wake-up, breakfast, lunch, dinner and bedtime, plus your medications and doses per day. The backend finds a valid time for every dose.
- **Explains every time.** Each dose shows why it sits where it does, for example "30 minutes before breakfast; separated from Calcium Carbonate by at least 240 minutes".
- **Validates your edits.** Click a dose and type a new time. The backend re-checks the whole schedule. Invalid changes are refused with plain-language reasons, such as *"Calcium Carbonate must be taken with a meal (breakfast 8:00 AM, lunch 12:30 PM, dinner 7:00 PM)."*
- **Day timeline.** A calendar view of the day with colour-coded dose blocks, a "now" line, and an upcoming-doses panel.
- **Reminders.** In-app notifications 15 minutes before a dose and when it is due, with *Taken* and *Snooze 10 min* actions. Mark doses taken or skipped.
- **Demo clock.** A small floating control lets you move the clock forward to show reminders without waiting.
- **Medication recurrence.** Each medication has a start date, number of days, and weekdays it applies to.
### Rules the scheduler understands
 
Defined per medication in [`backend/medications.json`](backend/medications.json):
 
| Rule | Meaning | Example |
| --- | --- | --- |
| `before_meal` | Between *min* and *max* minutes before a meal | Levothyroxine, 30 to 60 min before breakfast |
| `with_meal` | At a meal time (a specific meal, or any meal) | Calcium Carbonate, Metformin, Ibuprofen |
| `interval` | Minimum minutes between doses of the same drug | Atorvastatin, at least 18 hours apart |
| `separation` | Minimum minutes from another drug (enforced in both directions) | Levothyroxine and Calcium Carbonate, 4 hours apart |
| `warning` | Plain advice shown to the user | "Avoid coffee" |
 
Medications currently in the database: Levothyroxine, Calcium Carbonate, Metformin, Atorvastatin, Amoxicillin, Ibuprofen and Lisinopril.
 
---
 
## How it works
 
```
  ┌─────────────────────────┐        JSON over HTTP        ┌───────────────────────────┐
  │  Frontend (React + Vite)│ ───────────────────────────▶ │  Backend (FastAPI)        │
  │                         │   POST /schedule             │                           │
  │  Login → Profile →      │   POST /edit-schedule        │  scheduler.py  (solver)   │
  │  Medications → Schedule │ ◀─────────────────────────── │  constraints.py (rules)   │
  │                         │   events + reasons/conflicts │  edits.py      (validation)│
  └─────────────────────────┘                              │  medications.json (data)  │
        state saved in the browser                         └───────────────────────────┘
```
 
**User flow**
 
1. **Sign up** and land on the **Profile** page: wake-up, meals, bedtime, optional busy blocks.
2. **Medications**: add each medication, doses per day, start date and recurrence. Press *Generate schedule*.
3. **Schedule**: the day timeline opens. Returning users go straight here.
4. Click a dose to see its details and **change its time**. The app asks the backend to validate the change.
**Scheduling.** The solver (`scheduler.py`) works in minutes since midnight. It builds candidate times every 15 minutes between waking and bedtime, plus the exact meal times. For each dose it keeps only the times that satisfy that medication's own rules, orders them by a sensible preference (for example, right at the required meal), then places the most constrained doses first with backtracking so that interval and separation rules between doses hold.
 
**Edit validation.** `edits.py` accepts the current schedule and one edit. A medication edit moves a single dose and re-checks the **entire** schedule: waking hours, expected dose counts, and every rule for every dose. If anything breaks, the response is `success: false`, the schedule is returned unchanged, and `conflicts` lists the reasons. Edits to meal or sleep times re-solve the whole schedule. The human-readable reasons come from `explain_violations` in `constraints.py`.
 
**Persistence.** There is no database. The frontend keeps your profile, medications, schedule and dose statuses in the browser's `localStorage`, so a refresh keeps your data. Data is per browser.
 
---
 
## Tech stack
 
| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, React Router, date-fns, Sonner (toasts), lucide-react |
| Backend | Python, FastAPI, Pydantic v2, Uvicorn |
| Data | JSON file (`backend/medications.json`), browser `localStorage` |
 
---
 
## Project structure
 
```
MedFlow/
├── backend/
│   ├── main.py               FastAPI app, routes, CORS
│   ├── models.py             Pydantic request/response models
│   ├── scheduler.py          Candidate times + backtracking solver, dose explanations
│   ├── constraints.py        Rule checks and plain-language violation reasons
│   ├── edits.py              Validation of user edits (single dose, meal and sleep changes)
│   ├── medications.json      Medication database (rules and warnings)
│   └── test_scheduler.py     (empty; tests still to be written)
└── frontend/
    ├── index.html
    ├── package.json
    └── src/
        ├── main.tsx          App entry, providers
        ├── App.tsx           Routes and route guards
        ├── api.ts            All backend calls; USE_MOCK switch for offline development
        ├── types.ts          Shared TypeScript types
        ├── defaults.ts       Default profile values
        ├── pages/            Login, Profile, Medications, Schedule
        ├── components/       AppShell, Timeline, DoseCard, DoseDrawer, MedCard,
        │                     WeekdayPicker, UpcomingPanel, ChangesBanner
        ├── context/          AuthContext, AppState, ClockContext (reminders + demo clock)
        ├── lib/              time helpers, localStorage hook
        └── mock/meds.ts      Frontend copy of the medication list
```
 
---
 
## Getting started
 
You need **Python 3.10+** and **Node.js 20+**.
 
### 1. Run the backend
 
```bash
cd backend
pip install fastapi uvicorn pydantic
python -m uvicorn main:app --reload --port 8000
```
 
Open http://localhost:8000/docs for the interactive API docs.
 
### 2. Run the frontend
 
In a second terminal:
 
```bash
cd frontend
npm install
npm run dev
```
 
Open http://localhost:5173.
 
The frontend talks to `http://localhost:8000` by default. To point it somewhere else, create `frontend/.env`:
 
```
VITE_API_URL=http://localhost:8000
```
 
To work on the UI without the backend, set `USE_MOCK = true` at the top of `frontend/src/api.ts`. The app then uses a simple in-browser scheduler.
 
### Try it
 
1. Sign up with any email and a password of 8+ characters. Sign-in is simulated, so any credentials work.
2. Fill in your profile. Times must go in order: wake-up, breakfast, lunch, dinner, bedtime.
3. Add **Levothyroxine** (1 dose) and **Calcium Carbonate** (1 dose), then press *Generate schedule*.
4. Click **Calcium Carbonate** and change it to 10:30 AM. The change is refused with the reasons.
5. Click **Levothyroxine** and move it 15 minutes earlier. It is accepted.
6. Press *Start demo* in the floating clock and drag the slider to see reminders fire.
To reset the app, clear the `mf-` keys in your browser's local storage.
 
---
 
## API
 
Both endpoints take JSON. Times are 24-hour `HH:MM` strings. Interactive docs are at `/docs`.
 
### `GET /medications`
Returns the medication database.
 
### `POST /schedule`
Builds a schedule.
 
```json
{
  "medications": [
    { "name": "Levothyroxine", "dosesPerDay": 1 },
    { "name": "Calcium Carbonate", "dosesPerDay": 2 }
  ],
  "routine": {
    "wakeUp": "07:00", "breakfast": "08:00", "lunch": "12:30",
    "dinner": "19:00", "bedTime": "22:30"
  }
}
```
 
Response:
 
```json
{
  "success": true,
  "events": [
    { "medicationId": "001", "doseNumber": 1, "time": "07:00",
      "reason": "60 minutes before breakfast; ..." }
  ],
  "conflicts": []
}
```
 
`success: false` with reasons in `conflicts` means no valid schedule exists, for example when no medications were selected. An unknown medication name returns HTTP 400.
 
### `POST /edit-schedule`
Validates one change against the current schedule. The body is the same as `/schedule`, plus the current `events` and an `edit`:
 
```json
{
  "edit": {
    "type": "medication",
    "newTime": "10:30",
    "medicationId": "002",
    "doseNumber": 1
  },
  "events": [ ... ],
  "medications": [ ... ],
  "routine": { ... }
}
```
 
| `edit.type` | Fields | Effect |
| --- | --- | --- |
| `medication` | `medicationId`, `doseNumber`, `newTime` | Moves one dose and validates the whole schedule |
| `meal` | `event` (`breakfast`, `lunch`, `dinner`), `newTime` | Changes a meal time and re-solves the schedule |
| `sleep` | `event` (`wakeUp`, `bedTime`), `newTime` | Changes wake-up or bedtime and re-solves the schedule |
 
Response is the same shape as `/schedule` plus the resulting `routine`. When a change is not allowed, `success` is `false`, `events` are unchanged, and `conflicts` holds one plain-language reason per problem.
 
The current frontend uses `medication` edits (click a dose to change its time). The `meal` and `sleep` edits are implemented in the backend.
 
---
 
## Adding a medication
 
1. Add an entry to `backend/medications.json` with a unique `id`, a `name`, and a list of `constraints` (`before_meal`, `with_meal`, `interval`, `separation`, `warning`). Copy an existing entry as a template.
2. Mirror it in `frontend/src/mock/meds.ts`, which the frontend uses for the name list and the details drawer.
3. Restart the backend.
For a `separation` rule, reference the other drug by its `id` in `backend/medications.json`. Separation rules are enforced in both directions, so you only need to write them on one of the two drugs.
 
---
 
## Known limitations
 
- **Sign-in is simulated.** There is no account system or server-side storage; data lives in the browser.
- **Edits apply to every day.** The schedule is a daily pattern, so changing a dose time changes it for all days.
- **Overnight routines are not supported.** Wake-up must come before bedtime on the same day.
- **Doses per day is limited to 1 to 4.**
- **No automated tests yet** (`backend/test_scheduler.py` is empty).
- **Not a medical device.** The rules in `medications.json` are simplified for demonstration.
## Team
 
- Charanpreet
- Catherine ([@xcatheri](https://github.com/xcatheri))
