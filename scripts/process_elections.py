"""Join election snapshots to the 120th Congress geography with provenance."""
import csv
import json
import re
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public/data"
SNAPSHOTS = ROOT / "data-snapshots"
SPECIAL_SENATE = {"FL", "OH"}
ORDINALS = "first second third fourth fifth sixth seventh eighth ninth tenth".split()
SENATE = re.compile(r"\b(?:u\s*s|united states)\s+senat(?:e|or)\b|^senator in congress\b")
HOUSE = re.compile(r"^member,?\s+house of representatives|\b(?:u\s*s|united states)\s+(?:representativ|house|congress)|^representative (?:in|to) (?:the 120th united states )?congress|^congressional district .+ u\s*s\s+representative")



def party(value):
    value = value.strip().upper()
    if value in {"D", "DEM", "DEMOCRATIC", "DEMOCRATIC PARTY", "DFL"}:
        return "D"
    if value in {"R", "REP", "GOP", "REPUBLICAN", "REPUBLICAN PARTY"}:
        return "R"
    return "other" if value else None


def number(text):
    return int(text.replace(",", "")) if text and text.replace(",", "").isdigit() else None


def timestamp(value):
    if value:
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            if parsed.tzinfo is not None:
                return parsed.isoformat()
        except ValueError:
            pass
    return None


def candidate(row, name_field="candidate"):
    return {"name": row[name_field].strip(), "party": party(row["party"]),
            "partyRaw": row["party"], "votes": number(row["votes"])}


def district_number(contest, possible):
    if len(possible) == 1:
        return possible[0]
    numbers = re.findall(r"\bdistrict\s+(?:no\s+)?(\d+)\b|\b(\d+)(?:st|nd|rd|th)\s+(?:congressional\s+)?district", contest)
    if numbers:
        return f"{int(next(v for v in numbers[0] if v)):02}"
    for index, word in enumerate(ORDINALS, start=1):
        if re.search(rf"\b{word}\s+(?:congressional\s+)?district", contest):
            return f"{index:02}"
    return None


def result(office, geoid, code, candidates, **meta):
    kind = "special" if office == "senate" and code in SPECIAL_SENATE else "general"
    candidates.sort(key=lambda c: -c["votes"] if c["votes"] is not None else 1)
    if code == "AK" or office == "house" and code in {"ME", "DC"}:
        meta["basis"] = "first-choice"
    return {"id": f"{office}-{geoid}-{kind}", "office": office, "geoid": geoid,
            "stateFips": geoid[:2], "kind": kind, **meta, "candidates": candidates}


def polling_results(path, states, districts):
    grouped = defaultdict(list)
    with path.open(encoding="utf-8-sig") as stream:
        for row in csv.DictReader(stream):
            if row["cycle"] == "2026" and row["office"] in {"house", "senate"}:
                grouped[row["race_key"]].append(row)
    results = {}
    for rows in grouped.values():
        row = rows[0]
        code, office = row["state"], row["office"]
        key = states[code]
        if office == "house":
            key += "00" if districts[code] == ["00"] else f"{int(row['district']):02}"
        candidates = [candidate(r) for r in rows]
        total = sum(c["votes"] or 0 for c in candidates) if all(c["votes"] is not None for c in candidates) else None
        updated = row["results_updated_utc"]
        results[(office, key)] = result(
            office, key, code, candidates, totalVotes=total,
            status="aggregated", source="Polling Desk / civicAPI", url=row["url"],
            updatedAt=updated.replace(" ", "T") + "Z" if updated else None,
        )
    return results


def state_results(folder, states, districts):
    groups = defaultdict(list)
    for path in sorted(folder.glob("*.csv")):
        with path.open(encoding="utf-8-sig") as stream:
            for row in csv.DictReader(stream):
                code = row["state"]
                if (row["level"] != "state" or code not in states or
                        not row["sourceUrl"].startswith("https://") or
                        "candidate list" in row["source"].lower()):
                    continue
                title = re.sub(r"[^a-z0-9]+", " ", row["contest"].lower()).strip()
                if SENATE.search(title):
                    groups[("senate", states[code], row["contest"])].append(row)
                elif HOUSE.search(title) or (code == "UT" and title.startswith("u s house district")):
                    district = district_number(title, districts[code])
                    if district in districts[code]:
                        groups[("house", states[code] + district, row["contest"])].append(row)
    results = {}
    ambiguous = set()
    for (office, geoid, title), rows in groups.items():
        key = office, geoid
        row = rows[0]
        candidates = [candidate(r) for r in rows]
        declared = {number(r.get("contestTotalVotes")) for r in rows} - {None}
        count = sum(c["votes"] or 0 for c in candidates)
        total = declared.pop() if len(declared) == 1 else None
        if not count or (total is not None and count > total):
            continue
        if key in results:
            ambiguous.add(key)
        # Blank/invalid ballots are not candidate votes when explicitly identified.
        invalid = {"blank", "fictious", "overvote", "undervote"}
        excluded = [c for c in candidates if c["name"].strip().lower() in invalid]
        candidates = [c for c in candidates if c not in excluded]
        if total is not None:
            total -= sum(c["votes"] or 0 for c in excluded)
        results[key] = result(office, geoid, row["state"], candidates,
                              status="official-preliminary", source=row["source"].strip(),
                              url=row["sourceUrl"], contest=title, totalVotes=total,
                              updatedAt=timestamp(row.get("sourceUpdatedAt")),
                              retrievedAt=timestamp(row.get("fetchedAt")))
    return {key: value for key, value in results.items() if key not in ambiguous}


def save(name, payload):
    (DATA / name).write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n")


if __name__ == "__main__":
    shapes = json.loads((DATA / "house_districts_2026.geojson").read_text())["features"]
    districts = defaultdict(list)
    states = {}
    for feature in shapes:
        p = feature["properties"]
        states[p["code"]] = p["stateFips"]
        districts[p["code"]].append(p["district"])
    snapshot = Path(sys.argv[2]) if len(sys.argv) > 2 else SNAPSHOTS / "polling-desk-2026-11-14.csv"
    snapshot_date = sys.argv[3] if len(sys.argv) > 3 else "2026-11-14"
    results = polling_results(snapshot, states, districts)
    official = state_results(Path(sys.argv[1]), states, districts)
    # Accept only contest keys confirmed by the national general-election roster.
    results.update({key: race for key, race in official.items() if key in results})
    dc = json.loads((SNAPSHOTS / "dc.json").read_text())
    dc["geoid"] = "11" + districts["DC"][0]
    dc["id"] = f"house-{dc['geoid']}-general"
    results[("house", dc["geoid"])] = dc
    overrides = SNAPSHOTS / "verified-overrides.json"
    if overrides.exists():
        for race in json.loads(overrides.read_text()):
            results[(race["office"], race["geoid"])] = race
    for office in ("house", "senate"):
        races = [race for (chamber, _), race in sorted(results.items()) if office == chamber]
        save(f"{office}_results_2026.json", {"year": 2026, "snapshotDate": snapshot_date, "races": races})
        print(office, len(races), sum(r["status"] == "official-preliminary" for r in races))
