"""Download Census archives for the map's 51 jurisdictions."""
import csv
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import Request, urlopen
from zipfile import ZipFile

STATES = Path(__file__).with_name("states.csv")
CENSUS = "https://www2.census.gov/geo/tiger"
DISTRICTS = f"{CENSUS}/TIGER2026/CD"
STATE_BOUNDARIES = f"{CENSUS}/GENZ2025/shp/cb_2025_us_state_500k.zip"


def download(url):
    target = output / url.rsplit("/", 1)[-1]
    if target.exists():
        return
    for attempt in range(3):
        try:
            with urlopen(Request(url, headers={"User-Agent": "US-Congress-election-webmap/1.0"}), timeout=65) as response:
                content = response.read()
            temporary = target.with_suffix(".part")
            temporary.write_bytes(content)
            with ZipFile(temporary) as archive:
                if archive.testzip():
                    raise ValueError(f"Corrupt archive: {url}")
            temporary.replace(target)
            print(target.name, flush=True)
            return
        except (OSError, ValueError):
            if attempt == 2:
                raise


if __name__ == "__main__":
    output = Path(sys.argv[1])
    output.mkdir(parents=True, exist_ok=True)
    with STATES.open() as source:
        files = [f"{DISTRICTS}/tl_2026_{row['fips']}_cd120.zip" for row in csv.DictReader(source)]
    files.append(f"{CENSUS}/TIGER2025/CD/tl_2025_29_cd119.zip")
    with ThreadPoolExecutor(max_workers=8) as workers:
        list(workers.map(download, [STATE_BOUNDARIES, *files]))
