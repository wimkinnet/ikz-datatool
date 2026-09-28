"""
Extracts the questionnaire, default year plan and reference lists from the
source Excel workbook into JSON seed files used by `npm run seed`.
Run:  python3 tools/extract_seed.py path/to/workbook.xlsx
"""
import sys, json, re, warnings
warnings.filterwarnings("ignore")
import openpyxl

src = sys.argv[1] if len(sys.argv) > 1 else "path/to/workbook.xlsx"
wb = openpyxl.load_workbook(src)

# sheet name -> (month key, label, order)
MONTHS = [
    ("IKZ September", "september", "September"),
    ("IKZ oktober", "oktober", "Oktober"),
    ("IKZ november", "november", "November"),
    ("IKZ december", "december", "December"),
    ("IKZ januari", "januari", "Januari"),
    ("IKZ februari", "februari", "Februari"),
    ("IKZ maart", "maart", "Maart"),
    ("IKZ april", "april", "April"),
    ("IKZmei", "mei", "Mei"),
    ("IKZjuni", "juni", "Juni"),
    ("IKZjuli ", "juli", "Juli-augustus"),
]

def clean(s):
    return re.sub(r"\s+", " ", str(s)).strip()

# Answer-type overrides where the wording alone is ambiguous
PERCENT_HINTS = ["percentage", "marktaandeel", "thuistaal", "opleiding moeder", "buurt",
                 "schooltoelage", "bij de kleuters", "in het lager"]
NUMBER_HINTS = ["hoeveel", "aantal", "totaal", "totale", "niet lp kleuters", "lp kleuters",
                "1e leerjaar", "zij-instroom", "1e lj", "eigen zittenblijvers", "verhuizers",
                "tao", "4/5de", "pt", "binnen eigen gemeente"]

def guess_type(text, month, group):
    t = text.lower()
    if t.startswith("score") and ("ref groep" in t):
        return "inschaling"
    if month == "november" and not t.endswith("?"):
        return "scale10"                       # ouderbevraging items -> 0-10 score
    if any(h in t for h in PERCENT_HINTS) and not t.startswith("hoe "):
        return "percentage"
    if t.endswith("?") and not (t.startswith("hoeveel") or "aantal" in t or t.startswith("binnen eigen gemeente")):
        return "text"
    if any(t.startswith(h) or t == h for h in NUMBER_HINTS):
        return "number"
    if t.endswith("?"):
        return "number" if t.startswith("hoeveel") else "text"
    if len(t) > 40:
        return "text"      # long unpunctuated sentences are analysis questions, not counts
    return "number"

questions = []
sections_seen = {}
for sheet, mkey, mlabel in MONTHS:
    ws = wb[sheet]
    merged_rows = {}
    for m in ws.merged_cells.ranges:
        if m.min_col == 1 and m.max_col >= 7:
            merged_rows[m.min_row] = True
    section = None; group = None; order = 0
    blank_run = 0
    last_row = ws.max_row
    for r in range(3, last_row + 1):
        val = ws.cell(r, 1).value
        if val is None or clean(val) == "":
            blank_run += 1
            continue
        text = clean(val)
        is_header = r in merged_rows
        if is_header:
            # Workbook styling: sections are size 11 (green), sub-groups are size 9 (beige)
            if (ws.cell(r, 1).font.sz or 0) >= 11:
                section = text; group = None
            else:
                group = text
            blank_run = 0
            continue
        blank_run = 0
        order += 1
        qtype = guess_type(text, mkey, group)
        q = {
            "key": f"{mkey}-{r:02d}",
            "month": mkey,
            "monthLabel": mlabel,
            "section": section or mlabel,
            "group": group or "",
            "text": text,
            "answerType": qtype,
            "order": order,
            "sumOf": [],
        }
        questions.append(q)

# Known totals in the September sheet -> computed automatically from their parts.
def find(month, group_prefix, text):
    for q in questions:
        if q["month"] == month and q["group"].lower().startswith(group_prefix.lower()) and q["text"].lower() == text.lower():
            return q
    return None

def set_sum(total, parts):
    if not total: return
    keys = [p["key"] for p in parts if p]
    total["sumOf"] = keys
    total["answerType"] = "number"
    for p in parts:
        if p: p["answerType"] = "number"

g1 = "Hoe beweegt je leerlingenaantal"
set_sum(find("september", g1, "Totale instroom"), [
    find("september", g1, "niet LP kleuters"), find("september", g1, "LP kleuters"),
    find("september", g1, "1e leerjaar"), find("september", g1, "zij-instroom in latere leerjaren")])
g2 = "Hoeveel leerlingen met schoolse achterstand"
set_sum(find("september", g2, "Totaal in de school"), [
    find("september", g2, "LP kleuters"), find("september", g2, "1e lj"),
    find("september", g2, "eigen zittenblijvers hogere leerjaren?")])

# ---------------- year plan (Dashboard rows) ----------------
ws = wb["Dashboard"]
plan = []
for r in range(21, 45):
    vals = {c: ws.cell(r, c).value for c in range(2, 14)}
    if all(v is None or clean(v) == "" for k, v in vals.items() if k != 2):
        continue
    def g(c): return clean(vals[c]) if vals[c] not in (None, "") else ""
    plan.append({
        "month": g(2).lower(), "theme": g(3), "threshold": g(4), "status": "monitoren",
        "rok1": g(6), "rok2": g(7), "schaal": g(8), "onderdeel": g(9),
        "inschaling": g(10), "source": g(11), "extraInfo": g(12), "action": g(13),
        "order": len(plan) + 1,
    })

# ---------------- reference lists (Verwijzigen) ----------------
ws = wb["Verwijzigen"]
def col(c, r0=2, r1=60):
    out = []
    for r in range(r0, r1):
        v = ws.cell(r, c).value
        if v is not None and clean(v):
            out.append(clean(v))
    return out

STATUS_KEYS = ["monitoren", "ok", "actie"]
refs = []
for i, label in enumerate(col(2)):
    refs.append({"list": "status", "key": STATUS_KEYS[i], "label": label, "order": i})
for i, v in enumerate(col(3)):   refs.append({"list": "rok", "key": v, "label": v, "order": i})
for i, v in enumerate(col(4)):   refs.append({"list": "doorlichtingsdomein", "key": v, "label": v, "order": i})
scales = col(10)
for i, v in enumerate(scales):   refs.append({"list": "schaal", "key": v, "label": v, "order": i})
scale_cols = {"Ontwikkelingsschaal P": 5, "Ontwikkelingsschaal R": 6, "Ontwikkelingsschaal BP": 7,
              "Ontwikkelingsschaal O": 8, "Ontwikkelingsschaal K": 9}
for scale, c in scale_cols.items():
    for i, v in enumerate(col(c)):
        refs.append({"list": "onderdeel", "key": f"{scale}|{v}", "label": v, "parent": scale, "order": i})
for i, v in enumerate(col(16)):  refs.append({"list": "inschaling", "key": v, "label": v, "order": i})
MONTH_KEYS = [m[1] for m in MONTHS] + ["augustus"]
for i, v in enumerate(col(1)):   refs.append({"list": "maand", "key": v.lower(), "label": v.capitalize(), "order": i})

# The plan may use ROK codes that are missing from the dropdown list in the workbook (e.g. O5 while the list stops
# at O4). Keep the data: add them to the list and tell the user.
known_rok = {r["key"] for r in refs if r["list"] == "rok"}
for row in plan:
    for f in ("rok1", "rok2"):
        code = row[f]
        if code and code not in known_rok:
            print(f"NOTE: ROK code '{code}' is used in the plan but missing from the workbook's dropdown list - added it.")
            refs.append({"list": "rok", "key": code, "label": code, "order": len([r for r in refs if r["list"] == "rok"])})
            known_rok.add(code)

import os
os.makedirs("server/seed", exist_ok=True)
json.dump(questions, open("server/seed/questions.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump(plan, open("server/seed/plan-template.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump(refs, open("server/seed/references.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(questions), "questions;", len(plan), "plan rows;", len(refs), "reference items")
