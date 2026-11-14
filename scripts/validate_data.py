"""Validate the data contract and optionally run GEOS geometry checks."""
import csv
import json
import re
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public/data"


def read(name, index):
    return json.loads((DATA / name).read_text())[index]


def check_geometry(layer):
    from shapely import STRtree
    from shapely.geometry import shape
    from shapely.validation import explain_validity

    geometry = [shape(feature["geometry"]) for feature in layer]
    for index, item in enumerate(geometry):
        assert item.is_valid and not item.is_empty, (layer[index]["properties"]["geoid"], explain_validity(item))
        x1, y1, x2, y2 = item.bounds
        assert -180 <= x1 < x2 <= 180 and -90 <= y1 < y2 <= 90
    tree = STRtree(geometry)
    for index, item in enumerate(geometry):
        for other in tree.query(item):
            if other > index:
                assert item.intersection(geometry[other]).area < 1e-8, (index, other)


states = read("states_2026.geojson", "features")
districts = read("house_districts_2026.geojson", "features")
with (ROOT / "scripts/states.csv").open() as stream:
    expected = {row["fips"] for row in csv.DictReader(stream)}
state_ids = {f["properties"]["geoid"] for f in states}
district_ids = {f["properties"]["geoid"] for f in districts}
assert len(states) == len(state_ids) == 51 and state_ids == expected
assert len(districts) == len(district_ids) == 436 and "1198" in district_ids
for feature in districts:
    props = feature["properties"]
    assert re.fullmatch(r"\d{4}", props["geoid"])
    assert props["geoid"] == props["stateFips"] + props["district"]
    assert props["stateFips"] in state_ids and props["congress"] == 120
    assert props["delegate"] == (props["geoid"] == "1198")
if "--geometry" in sys.argv:
    check_geometry(states)
    check_geometry(districts)

for office in ("house", "senate"):
    races = read(f"{office}_results_2026.json", "races")
    ids = {r["geoid"] for r in races}
    assert len({r["id"] for r in races}) == len(races)
    if office == "house":
        assert ids == district_ids
    else:
        assert len(races) == 35 and ids <= state_ids
        assert {r["geoid"] for r in races if r["kind"] == "special"} == {"12", "39"}
    for race in races:
        assert race["office"] == office and race["stateFips"] == race["geoid"][:2]
        assert race["status"] in {"official-preliminary", "aggregated", "certified"}
        assert race["source"] and urlsplit(race["url"]).scheme == "https"
        assert race.get("updatedAt") or race.get("retrievedAt")
        for field in ("updatedAt", "retrievedAt"):
            if race.get(field):
                datetime.fromisoformat(race[field].replace("Z", "+00:00"))
        cands = race["candidates"]
        assert cands and all(c["name"] and c["party"] in {"D", "R", "other", None} for c in cands)
        assert all(c["votes"] is None or type(c["votes"]) is int and c["votes"] >= 0 for c in cands)
        if race.get("totalVotes") is not None:
            assert sum(c["votes"] or 0 for c in cands) <= race["totalVotes"]
    print(office, len(races), Counter(r["status"] for r in races))
print("Geometry:", len(states), "states/DC,", len(districts), "districts/DC")
