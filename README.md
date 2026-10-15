# IKZ Datatool

Web app for interne kwaliteitszorg (IKZ) in schools. A school works from **operationele doelen** that contribute to
the ROK (referentiekader voor onderwijskwaliteit), follows them up with **meetpunten** per **domein**, and turns
red results into **acties**. Admins, consultants and school users work in the same tool, each on their own schools.

Stack: React (Vite) · Node/Express · MongoDB (Atlas) · Render. UI language: Dutch.

## The model

```
Operationeel doel (per school, per school year, from 2026-2027)
  ├─ draagt bij aan → ROK-verwachtingen (R1 … BL12)
  └─ gekoppeld aan → domeinen (shared list; each is proces, resultaten or context)
                         └─ meetpunten (per school; one meetpunt can serve several domeinen)
                              └─ metingen per school year (from 2024-2025): value + groen/rood
                                   └─ acties (owner, deadline, status)
```

Menu: **Dashboard** · **ROK** · **Operationele doelen** · **Meetpunten** · **Kalender** · **Acties** · Documenten.

- **Dashboard** (start page) — KPIs, meetpunten per month and their status, the assessment per operational goal,
  share of green per school year, meetpunten per category, red meetpunten without an open action, overdue actions.
- **ROK** — every ROK-domein and quality expectation with its explanation, and per expectation the school's
  operational goals that contribute to it (codes on a goal link here, and back).
- **Operationele doelen** — per school year; each links to ROK expectations and to one or more domeinen. Its overall
  assessment comes from the red/green verdicts of its meetpunten that year: ≥ 75% green *op koers*, ≥ 50% *aandacht*,
  otherwise *niet op koers*; *voorlopig* while not every meetpunt is assessed (`client/src/test/assess.js`).
- **Kalender** — per month of the school year, the meetpunten to evaluate: done / this month / overdue / planned.
- **Meetpunten** — per domein, with uitleg, bron, month of evaluation, value type (percentage, absolute number or
  free text) and an optional threshold; one column per school year so history sits next to this year. The threshold
  suggests groen/rood, but the assessment is always the user's choice.
- **Acties** — every action linked to a measuring result (meetpunt + school year), with owner, deadline and status
  (open / bezig / afgerond); overdue actions are flagged.
- **Sjablonen → Domeinen** (admins) — the shared list of domeinen, initially the 19 themes of the former BO year plan.
  Their category (proces / resultaten / context) was an initial assessment; admins can change it.

Internally the data still lives under `server/models/test/` and `/api/test` (a domein is stored as `TestResult`),
because the model started as a "Test" tab next to the former BO and SO parts.

## Roles

| Role | Can do |
|---|---|
| **admin** | Everything, on every school: schools, users, the list of domeinen |
| **consultant** | Works in the schools assigned to them: goals, meetpunten, metingen, actions, documents; manages school users of their schools |
| **client** (school) | Works only in the school(s) linked to their account (switch top left): goals, meetpunten, metingen, actions, documents |

Access is enforced on the server for every route, also for changes by id (`middleware/access.js`, `routes/test.js`).

## Local setup

Needs Node 18+ and a MongoDB connection string (free MongoDB Atlas cluster works).

```bash
cd server
cp .env.example .env     # fill in MONGODB_URI, JWT_SECRET and SEED_ADMIN_*
npm install
npm run dev              # API on :5050. On first start it seeds the ROK and the domeinen
                         # and creates the admin from SEED_ADMIN_*.

cd ../client             # second terminal
npm install
npm run dev              # app on http://localhost:5173
```

Generate a `JWT_SECRET`: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

On a network whose DNS rejects the `mongodb+srv` lookup (`querySrv EBADRESP`, e.g. a phone hotspot), set
`DNS_SERVERS=1.1.1.1,8.8.8.8` in `server/.env`.

Example data: `npm run seed:test-dummy` (in `server/`) creates *Testschool (dummy)* with goals, meetpunten,
metingen from 2024-2025 and actions; `npm run seed:test-dummy:remove` deletes it again.

## Deploy on Render

**With the Blueprint** (`render.yaml`): New → Blueprint → pick the repo, fill in `MONGODB_URI` and
`SEED_ADMIN_NAME/EMAIL/PASSWORD`. `JWT_SECRET` is generated for you.

**Manually** (Web Service): build command
`cd client && npm install && npm run build && cd ../server && npm install`, start command `node server/server.js`,
add a **disk** mounted at `/var/data`, and set these environment variables — the server refuses to start
without `JWT_SECRET`:

| Variable | Value |
|---|---|
| `MONGODB_URI` | Atlas connection string (Atlas → Network Access must allow `0.0.0.0/0`) |
| `JWT_SECRET` | long random string |
| `UPLOAD_DIR` | `/var/data/uploads` |
| `SEED_ADMIN_NAME` / `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | your first admin login |

No Render Shell is needed: on startup the server fills the ROK and the domeinen when they are still empty and
creates the admin if none exists. It never overwrites edited lists. Set `AUTO_SEED=false` to disable.
If a push does not start a deploy, use *Manual Deploy → Deploy latest commit*; CI can be started by hand under
Actions → CI → *Run workflow*.

## First use

1. Log in as admin → **Scholen** → *Nieuwe school*.
2. **Gebruikers** → create consultants (assign schools) and school accounts (role *School*, one or more schools).
3. Pick the school top left and the school year top right → **Operationele doelen** → *Nieuw operationeel doel*.
4. Add **meetpunten** under the goal's domeinen, fill in the **metingen** (also for earlier years) and add **acties**
   where a result is red.

## Security notes

School users cannot read or write another school, whatever they put in the request. Login is rate-limited,
passwords are bcrypt-hashed, uploads are type- and size-limited (25 MB) and stored under `UPLOAD_DIR/<schoolId>/`.
The disk is not backed up automatically — snapshot it or keep copies of important files.

## History

Earlier versions also had a BO part (questionnaire, year plan, trends) and an SO part (Kwaliteitsmonitor with
indicators). They were removed in October 2026; the code is in the git history and the data was exported to a JSON
backup before it was deleted from the database.
