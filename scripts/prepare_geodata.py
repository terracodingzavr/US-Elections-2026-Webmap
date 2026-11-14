"""Convert and simplify Census boundaries. Requires GDAL and Mapshaper."""
import csv
import hashlib
import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
with (HERE / "states.csv").open() as stream:
    STATES = {row["fips"]: row for row in csv.DictReader(stream)}


def read_layer(path, output):
    subprocess.run([
        "ogr2ogr", "-f", "GeoJSON", "-t_srs", "EPSG:4326", "-lco", "RFC7946=YES",
        str(output), "/vsizip/" + str(path.resolve()),
    ], check=True)
    return json.loads(output.read_text())["features"]


def write_geo(path, features):
    path.write_text(json.dumps({"type": "FeatureCollection", "features": features},
                               ensure_ascii=False, separators=(",", ":")) + "\n")


def normalize(feature, properties):
    return {"type": "Feature", "id": properties["geoid"], "properties": properties,
            "geometry": feature["geometry"]}


if __name__ == "__main__":
    source, output = map(Path, sys.argv[1:3])
    mapshaper = sys.argv[3] if len(sys.argv) > 3 else "mapshaper"
    work = source / "working"
    work.mkdir(exist_ok=True)
    output.mkdir(parents=True, exist_ok=True)
    state_file = "cb_2025_us_state_500k.zip"
    files = [state_file]
    states = []
    districts = []
    for feature in read_layer(source / state_file, work / "raw_states.geojson"):
        p = feature["properties"]
        if p["STATEFP"] in STATES:
            states.append(normalize(feature, {"geoid": p["STATEFP"], "stateFips": p["STATEFP"],
                                               "name": p["NAME"], **STATES[p["STATEFP"]]}))
    names = {feature["id"]: feature["properties"] for feature in states}
    for fips in sorted(STATES):
        # The 2026 election in Missouri used the same plan as in 2024.
        filename = "tl_2025_29_cd119.zip" if fips == "29" else f"tl_2026_{fips}_cd120.zip"
        files.append(filename)
        for feature in read_layer(source / filename, work / f"{fips}.geojson"):
            p = feature["properties"]
            district = p.get("CD120FP", p.get("CD119FP"))
            if district == "ZZ":
                continue
            districts.append(normalize(feature, {**names[fips], "geoid": p["GEOID"],
                           "district": district, "delegate": fips == "11",
                           "congress": 120, "boundaryFile": filename}))
    assert len(states) == 51 and len(districts) == 436, (len(states), len(districts))
    raw_districts = work / "raw_districts.geojson"
    raw_coast = work / "coast.geojson"
    write_geo(raw_districts, districts)
    write_geo(raw_coast, states)
    for layer, input_file, simplify in [
        ("states", raw_coast, "interval=900"),
        ("house_districts", raw_districts, "interval=500"),
    ]:
        rendered = work / f"{layer}-rendered.geojson"
        command = [mapshaper, str(input_file)]
        if layer == "house_districts":
            command += ["-clip", str(raw_coast), "remove-slivers"]
        command += ["-simplify", "weighted", simplify, "keep-shapes",
                    "-o", "force", "format=geojson", "precision=0.00001", str(rendered)]
        subprocess.run(command, check=True)
        # OGR restores RFC 7946 ring orientation and antimeridian handling.
        subprocess.run(["ogr2ogr", "-overwrite", "-f", "GeoJSON", "-t_srs", "EPSG:4326",
                        "-lco", "RFC7946=YES", "-lco", "COORDINATE_PRECISION=5",
                        str(output / f"{layer}_2026.geojson"), str(rendered)], check=True)
    (output / "geodata_manifest.json").write_text(json.dumps({
        "retrieved": "2026-11-14",
        "sha256": {name: hashlib.sha256((source / name).read_bytes()).hexdigest() for name in files},
    }, indent=2) + "\n")
