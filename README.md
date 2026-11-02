# IKZ Datatool

Web app for interne kwaliteitszorg (IKZ) in schools. A school starts from **signalen** and **strategische doelen**, works on them with **operationele doelen**, measures the success of those goals with **indicatoren**, and carries them out through **acties**. Admins, consultants and school users work in the same tool, each on their own schools.

Stack: React (Vite) · Node/Express · MongoDB (Atlas) · Render. UI language: Dutch.

## The model

```
Signalen (Sign-C1, Sign-P1, Sign-R1, …; each based on a domein, with its own measure and start value)
and strategische doelen (Strat-1, …): per school, over the school years
  ▲ optional links
Operationeel doel (per school, per school year, from 2026-2027)
  ├─ draagt bij aan → ROK-verwachtingen (ROK-R1 … ROK-BL12), signalen, strategische doelen
  ├─ indicatoren → measure the success of the goal, each at one month: value + resultaat (op niveau / onder niveau)
  └─ acties → status: in te plannen, gepland, in uitvoering, uitgevoerd
       └─ optional meetpunt → measures the success of the action, at one month: value + resultaat
```

Menu: **Dashboard** · **Signalen** · **Strategische doelen** · **Operationele doelen** · **Acties** · **Kalender** · **ROK** · Documenten.

- **Dashboard** (start page) — KPIs, invulstatus and resultaat per month (two separate questions: is it filled in, and if so what is the result), the assessment per operational goal, indicators per school year and category, actions per status, indicators below level without a running action, overdue actions.
- **Signalen** — defined by consultants and admins (school users read along): title, description, domein, what is measured and its start value. The code is Sign- + the domein's category letter (C, P, R) + a number per school and category; a school's Sign-P1 is unrelated to another school's Sign-P1. Shows the operational goals of every school year that contribute.
- **Strategische doelen** — Strat-1, Strat-2, … per school, also defined by consultants and admins: title and description.
- **Operationele doelen** — per school year, with their indicators and actions. A goal links to ROK expectations and, optionally, to signals and strategic goals; its domeinen follow from its signals. Its overall assessment comes from its indicators: ≥ 75% op niveau *op koers*, ≥ 50% *aandacht*, otherwise *niet op koers*; *voorlopig* while not every indicator is assessed (`client/src/test/assess.js`). Deleting a goal deletes its indicators and actions.
- **Acties** — all actions of the school year, with status, owner, deadline and optional meetpunt; overdue actions are flagged.
- **Kalender** — per month, the indicators and action meetpunten to measure: done / this month / te laat / planned.
- **ROK** — every ROK-domein and quality expectation with its explanation, and the school's goals per expectation.
- **Sjablonen → Domeinen** (admins) — the shared list of domeinen, initially the 19 themes of the former BO year plan.
  Their category (proces / resultaten / context) was an initial assessment; admins can change it.

Internally the data still lives under `server/models/test/` and `/api/test` (a domein is stored as `TestResult`),
because the model started as a "Test" tab next to the former BO and SO parts.

## Roles

| Role | Can do |
|---|---|
| **admin** | Everything, on every school: schools, users, the list of domeinen |
| **consultant** | Works in the schools assigned to them: goals, indicators, actions, documents; manages school users of their schools |
| **client** (school) | Works only in the school(s) linked to their account (switch top left): goals, indicators, actions, documents |

Access is enforced on the server for every route, also for changes by id (`middleware/access.js`, `routes/test.js`).

## House styles

The tool comes in two looks, **bespreek** (bespreek.be) and **Catalista** (catalista.be), per user (`User.theme`):

- Whoever creates or edits a user picks the style in the user form (*Gebruikers*). Without a choice a new user gets
  the style of the person who created them; existing users are on bespreek until someone changes them.
- Admins can also switch their own style under *Mijn profiel*. Other users cannot.
- The login page, shown before we know who is logging in, uses the style last used on that device (default bespreek).

Colours and fonts are CSS variables: `:root` is bespreek, `:root[data-theme='catalista']` overrides them
(`client/src/index.css`); logos are in `client/public/brand/`, the list of styles in `client/src/utils/themes.js`.
Values were read from the live websites. Futura (bespreek) is a paid font, so headings use the free look-alike Jost;
Helvetica falls back to Arial where it isn't installed. Green, amber and red keep their meaning in both styles.

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

Example data: `npm run seed:test-dummy` (in `server/`) creates *Testschool (dummy)* with signals, goals, indicators
and actions; `npm run seed:test-dummy:remove` deletes it again.

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
3. Pick the school top left → define **Signalen** and **Strategische doelen**; pick the school year top right → **Operationele doelen** → *Nieuw operationeel doel*.
4. Add **indicatoren** to the goal and **acties** with their status and, where useful, a meetpunt; fill in the measurements when their month comes.

## Security notes

School users cannot read or write another school, whatever they put in the request. Login is rate-limited,
passwords are bcrypt-hashed, uploads are type- and size-limited (25 MB) and stored under `UPLOAD_DIR/<schoolId>/`.
The disk is not backed up automatically — snapshot it or keep copies of important files.

## History

Earlier versions also had a BO part (questionnaire, year plan, trends) and an SO part (Kwaliteitsmonitor with
indicators). They were removed in October 2026; the code is in the git history and the data was exported to a JSON
backup before it was deleted from the database.
