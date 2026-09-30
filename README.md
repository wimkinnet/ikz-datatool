# IKZ Datatool

Web app for interne kwaliteitszorg (IKZ) in basisscholen, built from the Excel workbook
*Dataoverzicht peilmomenten*. Consultants and schools work in the same tool:

- **Vragenlijst** — the monthly "peilmoment" questionnaire, three school years side by side, with
  comments, consultant advice and file attachments per answer.
- **Jaarplan** — the task/KPI table (month, theme, threshold, status, ROK domain, ontwikkelingsschaal,
  inschaling, source, action). A task's status can follow a questionnaire answer automatically.
- **Overzicht** — the four charts of the Excel dashboard, plus questionnaire progress and open actions.
- **Trends** — chart any numeric question across school years (live from the entered data).
- **Documenten** — reports and attachments per school.
- **Klantenportaal** — school users log in and only ever see their own school.

Stack: React (Vite) · Node/Express · MongoDB (Atlas) · Render. UI language: Dutch.

## Roles

| Role | Can do |
|---|---|
| **admin** | Everything: schools, all users, questionnaire template, default year plan, dropdown lists |
| **consultant** | Works in the schools assigned to them: answers, advice, year plan (incl. structure), documents; invites school users |
| **client** (school) | Sees only the school(s) linked to their account (one or more; they switch between them top right). Fills in the questionnaire, updates status / inschaling / actions, uploads files, reads consultant advice |

Per school there is one switch (*Scholen → Bewerken*): may school users also add/remove plan tasks and change
thresholds? Default **no** — the consultant owns the structure of the plan.

## How the Excel maps to the app

| Excel | App |
|---|---|
| Tabs *IKZ September … IKZ Juli-Augustus* | **Vragenlijst** — 123 questions in 21 sections (seeded from the workbook) |
| Value + "evolutie/opmerkingen/bijlage" columns per year | Answer value + comment + consultant advice + attachments, 3 years shown |
| Table on tab *Dashboard* (rows 21+) | **Jaarplan** — the 21 example rows are the *standaard jaarplan*, copied into a school with one click |
| Tab *Verwijzigen* | **Keuzelijsten** (admin-editable dropdowns) |
| Tab *Draaitabellen* + the 4 charts | **Overzicht**, computed live from the plan (no pivot tables to refresh) |

## Things to check (assumptions I had to make)

1. **Answer types were inferred** from the question wording (123 questions: 70 text, 34 number, 8 percentage,
   6 inschaling, 5 score/10). Review them in *Sjablonen → Vragen* — the type decides the input field and whether
   the question can be charted in *Trends*.
2. **Computed totals**: "Totale instroom" and "Totaal in de school" (schoolse achterstand) are calculated as the
   sum of the rows above them. Other "Totaal …" rows stay manual inputs because the workbook doesn't say what they add up.
3. **Ouderbevraging** items (November) are scored 0–10, following the note on the Dashboard tab.
4. **Status** uses the three values from *Verwijzigen* (monitoren / ok / actie nodig). The pivot table in the
   workbook still uses older names (To-do / Knipperlicht / Ok) and counts 26 tasks; the Dashboard table has 21.
5. **ROK code O5** is used by the DIAtoetsen row but is missing from the workbook's list (O1–O4); it was added.
   ROK codes have no descriptions in the workbook, so only the codes are shown.
6. The workbook contains **no filled-in answers** (only the headers), so there is nothing to import — the
   questionnaire starts empty. The `L16:L38` cells on *Draaitabellen* are `#REF!` errors in the source and were ignored.
7. School year is **September → August**; the active year is chosen top right.

## Local setup

Needs Node 18+ and a MongoDB connection string (free MongoDB Atlas cluster works).

```bash
cd server
cp .env.example .env     # fill in MONGODB_URI, JWT_SECRET and SEED_ADMIN_*
npm install
npm run dev              # API on :5000. On first start it seeds the lists, questions,
                         # default plan and creates the admin from SEED_ADMIN_*.

cd ../client             # second terminal
npm install
npm run dev              # app on http://localhost:5173
```

Generate a `JWT_SECRET`: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

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

No Render Shell is needed: on startup the server fills any *empty* template collections and creates the admin
if none exists. It never overwrites edited templates. Set `AUTO_SEED=false` to disable.

## First use

1. Log in as admin → **Scholen** → *Nieuwe school*.
2. **Gebruikers** → create a consultant (assign schools) and/or school accounts (role *School*).
3. Open the school → **Overzicht** → *Standaard jaarplan toepassen* for the school year.
4. Adjust the plan (thresholds, sources, optional automatic status) and start filling in the **Vragenlijst**.

## Updating the templates

- Small changes: *Sjablonen → Vragen / Standaard jaarplan / Keuzelijsten* in the app.
- From a new version of the workbook: `python3 tools/extract_seed.py path/to/workbook.xlsx`, then
  `npm run seed:reset-templates` in `server/` (replaces questions, lists and the default plan; existing answers
  stay linked through stable question keys, school plans are untouched).

## Security notes

Access control is enforced on the server for every route (`middleware/access.js`): school users cannot read or
write another school, whatever they put in the request. Login is rate-limited, passwords are bcrypt-hashed,
uploads are type- and size-limited (25 MB) and stored under `UPLOAD_DIR/<schoolId>/`.
The disk is not backed up automatically — snapshot it or keep copies of important files.

## Possible next steps

Excel/PDF export of a school's questionnaire and plan · e-mail reminders per peilmoment · password reset by e-mail ·
cluster-level view across all schools of a school group.
