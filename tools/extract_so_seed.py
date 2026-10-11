"""
Extracts the SO (secundair onderwijs) model from the workbook *Kwaliteitsmonitor scholen*:
  server/seed/so-rok.json         the ROK expectations (code, domain, title, description)
  server/seed/so-indicators.json  the indicator template (source, bron, indicator, threshold, month, ROK links)
  tools/data/<school>.json        one school's own ratings, months and actions (import with
                                  `node server/utils/importSoSchool.js tools/data/<school>.json`)

Run:  python3 tools/extract_so_seed.py path/to/Kwaliteitsmonitor.xlsx "Sint Norbertus"

The workbook is read through its formulas, so every indicator is stored once and the ROK view links
to it. Mistakes found in the source workbook are corrected here (see FIXES below and the printed report).
"""
import sys, json, re, os, warnings
warnings.filterwarnings("ignore")
import openpyxl

src = sys.argv[1] if len(sys.argv) > 1 else "path/to/Kwaliteitsmonitor.xlsx"
school_name = sys.argv[2] if len(sys.argv) > 2 else "School"
root = os.path.join(os.path.dirname(__file__), "..")
fx = openpyxl.load_workbook(src)                  # formulas
wv = openpyxl.load_workbook(src, data_only=True)  # cached values

MONTHS = ["september", "oktober", "november", "december", "januari", "februari",
          "maart", "april", "mei", "juni", "juli", "augustus"]

def clean(s):
    return re.sub(r"\s+", " ", str(s)).strip() if s is not None else ""

# Words in the ROK texts that were split when they were copied from the PDF
SPLIT_WORDS = {
    "tevreden heid": "tevredenheid", "beïn vloeden": "beïnvloeden", "voor opgesteld": "vooropgesteld",
    "ver volgonderwijs": "vervolgonderwijs", "onderwijsleerprak tijk": "onderwijsleerpraktijk",
    "systema tisch": "systematisch", "beoor delingscriteria": "beoordelingscriteria",
    "le renden": "lerenden", "per soneelsbeleid": "personeelsbeleid", "bege leiding": "begeleiding",
}
# Spelling in indicator texts
SPELLING = {
    "doolichtingsverslag": "doorlichtingsverslag", "gezamelijke": "gezamenlijke", "herkennnen": "herkennen",
    "redicordi": "redicodi", "ten alle tijden": "te allen tijde", "extra murosoplijsting": "extra-murosoplijsting",
    "benchmarkt tov": "benchmark tov",
}
used = {k: 0 for k in {**SPLIT_WORDS, **SPELLING}}

def fix(s, table):
    s = clean(s)
    for wrong, right in table.items():
        if wrong in s:
            used[wrong] += 1
            s = s.replace(wrong, right)
    return s

def fix_text(s):
    s = fix(s, SPELLING)
    return re.sub(r"[;,]\s*$", "", s).strip()  # stray trailing ';' or ',' ("na een jaar;")

def month_of(d):
    return MONTHS[(d.month - 9) % 12] if hasattr(d, "month") else ""

def rating_of(v):
    return int(v) if v in (-1, 0, 1) else None  # '?' and empty cells mean: not rated yet

report = []

# ---------------------------------------------------------------- source sheets -> indicators
# (sheet, source key, header row, prefix). vakwerkgroepen and llnbgl gok are working sheets of their own:
# they repeat or extend indicators with their own ratings and are not linked to the ROK view or calendar.
SHEETS = [("Smartschool", "smartschool", 3), ("Datawijzer", "datawijzer", 2), ("Dataloep", "dataloep", 2),
          ("andere", "andere", 2), ("vakwerkgroepen", "vakwerkgroepen", 2), ("llnbgl gok", "llnbgl", 2)]

indicators, scores, by_cell = [], [], {}
for sheet, source, header in SHEETS:
    ws = wv[sheet]
    group, bron_above, order = "", "", 0
    rows = list(range(2, ws.max_row + 1))
    for r in rows:
        if r == header:
            continue
        a, b, c, d, e, f = (ws.cell(r, col).value for col in range(1, 7))
        if source == "llnbgl" and a and not b:          # section headers, e.g. "appwell", "Schooleigen acties:"
            label = clean(a).rstrip(":")
            label = label[:1].upper() + label[1:]
            group = f"Schooleigen acties – {label}" if group.startswith("Schooleigen acties") and label != "Schooleigen acties" else label
            continue
        if a and not b and r != 2:                        # section headers, e.g. "ANALYTICS", "EIGEN BEVRAGINGEN"
            group = clean(a).capitalize()
            continue
        if not b:
            continue
        bron = clean(a) or bron_above                     # llnbgl gok only fills "waar?" once per block
        bron_above = bron
        row_group = group
        if source == "smartschool" and r == 2:
            # FIX: this indicator was typed above the header row (row 2) instead of in a section
            row_group = "Skore"
            report.append("Smartschool rij 2 stond boven de kopregel; geplaatst in de sectie Skore.")
        text, bron = fix_text(b), fix_text(bron)
        if bron.lower().startswith("doorlichtingsverslag - "):
            # All inspection-report rows had the same indicator text; the part that differs was in the source
            text = f"analyse doorlichtingsverslag: {bron.split(' - ', 1)[1]}"
            bron = "doorlichtingsverslag"
        order += 1
        key = f"{source}-{r:02d}"
        threshold = fix_text(c) if c not in (None, "") else ""
        indicators.append({"key": key, "source": source, "group": row_group, "bron": bron, "text": text,
                           "threshold": threshold, "month": month_of(e), "rok": [], "order": order})
        scores.append({"indicatorKey": key, "inschaling": rating_of(d), "month": month_of(e),
                       "action": clean(f) if f not in (None, "", 0) else ""})
        by_cell[(sheet, r)] = key

score_of = {s["indicatorKey"]: s for s in scores}

# ---------------------------------------------------------------- ROK sheet -> expectations + links
R, RV = fx["ROK - kwaliteitsbeeld"], wv["ROK - kwaliteitsbeeld"]
REF = re.compile(r"^=\s*'?([A-Za-z ]+?)'?!\$?([A-Z])\$?(\d+)$")
SAME = re.compile(r"^=\s*\$?([A-Z])\$(\d+)$")

def resolve(col, row, depth=0):
    """Follows a cell formula to the source sheet cell it shows: ('Datawijzer', 5) or None."""
    val = R[f"{col}{row}"].value
    if isinstance(val, str):
        m = REF.match(val.strip())
        if m:
            return (m.group(1), int(m.group(3)))
        m = SAME.match(val.strip())
        if m and depth < 5:
            return resolve(m.group(1), int(m.group(2)), depth + 1)
    return None

rok, domain, code = [], clean(RV["A9"].value), None  # A9 is the merged domain cell of the R-codes
extra = 0
for r in range(11, 181):
    if RV[f"A{r}"].value:
        domain = clean(RV[f"A{r}"].value)
    if RV[f"B{r}"].value:
        code = clean(RV[f"B{r}"].value)
        rok.append({"code": code, "domain": domain, "title": fix(RV[f"C{r}"].value, SPLIT_WORDS),
                    "description": fix(RV[f"D{r}"].value, SPLIT_WORDS), "order": len(rok) + 1})
    if RV[f"E{r}"].value in (None, ""):
        continue
    target = resolve("E", r)
    if target is None:
        # FIX: a note typed into the ROK view (BL4) without a source row: make it a real indicator
        extra += 1
        key = f"andere-x{extra:02d}"
        indicators.append({"key": key, "source": "andere", "group": "Beleid", "bron": "eigen monitoring",
                           "text": fix_text(RV[f"E{r}"].value), "threshold": "", "month": "", "rok": [code],
                           "order": 999 + extra})
        scores.append({"indicatorKey": key, "inschaling": None, "month": "", "action": ""})
        score_of[key] = scores[-1]
        report.append(f"ROK rij {r} ({code}): getypte tekst zonder bron ('{clean(RV[f'E{r}'].value)}') "
                      f"is nu een indicator onder Andere › Beleid, nog niet ingeschaald.")
        continue
    key = by_cell[target]
    ind = next(i for i in indicators if i["key"] == key)
    if code not in ind["rok"]:
        ind["rok"].append(code)
    # Report rows where the ROK view showed a rating that is not the one of its own source row
    h = R[f"H{r}"].value
    h_target = resolve("H", r)
    if h_target != target:
        shown = RV[f"H{r}"].value
        if h_target is None:
            report.append(f"ROK rij {r} ({code}) '{ind['text']}': inschaling was hard getypt ({shown}) "
                          f"i.p.v. gelinkt aan {target[0]}!D{target[1]}.")
            if score_of[key]["inschaling"] is None and rating_of(shown) is not None:
                score_of[key]["inschaling"] = rating_of(shown)
                report.append(f"   -> de bron was leeg; de getypte waarde {shown} is overgenomen als inschaling.")
        else:
            report.append(f"ROK rij {r} ({code}) '{ind['text']}': inschaling verwees naar "
                          f"{h_target[0]}!{h.split('!')[-1]} (toonde {shown}) i.p.v. {target[0]}!D{target[1]} "
                          f"(= {score_of[key]['inschaling']}).")

# ---------------------------------------------------------------- calendar check (rebuilt by the tool)
K = fx["Kalenderdata"]
in_calendar = []
for r in range(2, K.max_row + 1):
    v = K[f"A{r}"].value
    m = REF.match(v.strip()) if isinstance(v, str) else None
    if m:
        in_calendar.append(by_cell.get((m.group(1), int(m.group(3)))))
linked = [i["key"] for i in indicators if i["rok"]]
missing = [k for k in linked if k not in in_calendar]
double = sorted({k for k in in_calendar if in_calendar.count(k) > 1})
if missing:
    report.append(f"Kalender: {len(missing)} indicatoren ontbraken ({', '.join(missing)}); de tool toont alle indicatoren.")
if double:
    report.append(f"Kalender: {len(double)} indicatoren stonden er dubbel in ({', '.join(double)}).")
unrated = [k for k in linked if score_of[k]["inschaling"] is None]
report.append(f"Teller 'aantal unieke indicatoren' telde enkel ingeschaalde indicatoren; "
              f"de tool telt alle {len(linked)} ROK-indicatoren en toont {len(unrated)} als 'nog niet ingeschaald'.")
report.append("Lege inschalingen telden in de teller mee als 'opvolgen' (0); de tool houdt ze apart als 'nog niet ingeschaald'.")

for wrong, n in used.items():
    if n == 0:
        sys.exit(f"Correction '{wrong}' was not found in the workbook - check the FIX lists")
report.append("Tekstcorrecties: " + ", ".join(f"'{w}' -> '{r}'" for w, r in {**SPLIT_WORDS, **SPELLING}.items()) + ".")

# ---------------------------------------------------------------- write
def dump(path, data):
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=1)

dump(os.path.join(root, "server", "seed", "so-rok.json"), rok)
dump(os.path.join(root, "server", "seed", "so-indicators.json"), indicators)
os.makedirs(os.path.join(root, "tools", "data"), exist_ok=True)
slug = re.sub(r"[^a-z0-9]+", "-", school_name.lower()).strip("-")
dump(os.path.join(root, "tools", "data", f"{slug}.json"),
     {"school": school_name, "type": "SO", "schoolYear": "2026-2027", "scores": scores, "corrections": report})

print(f"{len(rok)} ROK expectations, {len(indicators)} indicators ({len(linked)} linked to ROK), {len(scores)} scores")
print("\n".join("- " + line for line in report))
