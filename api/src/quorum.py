"""
Einwohnerantrag quorum rules per Bundesland, based on German Gemeindeordnungen.
Sources: Wikipedia/Einwohnerantrag, individual Gemeindeordnungen.

For each Bundesland we store:
  - quorum_pct: fraction of Einwohner required (used when population is known)
  - fixed: fixed number of signatures (overrides quorum_pct when set)
  - cap: maximum signatures required (None = no cap)
  - min_signatures: minimum signatures required (None = no floor beyond global min)

Global minimum: 1 (as configured).
"""
import math
from typing import Optional

QUORUM_RULES: dict[str, dict] = {
    # ISO code → rules
    "DE-BW": {"quorum_pct": 0.015, "cap": 2500},        # Baden-Württemberg: 1.5–3%, max 2500
    "DE-BY": {"quorum_pct": 0.01,  "cap": None},         # Bayern: 1%
    "DE-BE": {"fixed": 1000,       "cap": None},         # Berlin: 1000 fixed
    "DE-BB": {"quorum_pct": 0.05,  "cap": None},         # Brandenburg: 5%
    "DE-HB": {"quorum_pct": 0.01,  "cap": None},         # Bremen: 1% (Bremerhaven)
    "DE-HH": {"quorum_pct": 0.01,  "cap": None},         # Hamburg: keine Regelung → fallback 1%
    "DE-HE": {"quorum_pct": 0.01,  "cap": None},         # Hessen: nicht vorgesehen → fallback 1%
    "DE-MV": {"quorum_pct": 0.05,  "cap": None},         # Mecklenburg-Vorpommern: 5% oder min 2000
    "DE-NI": {"quorum_pct": 0.025, "cap": 8000},         # Niedersachsen: 2.5–5%, max 8000
    "DE-NW": {"quorum_pct": 0.04,  "cap": 8000},         # NRW: 4–5%, max 8000
    "DE-RP": {"quorum_pct": 0.02,  "cap": 2000},         # Rheinland-Pfalz: 2%, max 2000
    "DE-SL": {"quorum_pct": 0.05,  "cap": None},         # Saarland: 5%
    "DE-SN": {"quorum_pct": 0.05,  "cap": None},         # Sachsen: 5%
    "DE-ST": {"quorum_pct": 0.01,  "cap": None},         # Sachsen-Anhalt: 1–3%
    "DE-SH": {"quorum_pct": 0.02,  "cap": None},         # Schleswig-Holstein: 2–5%
    "DE-TH": {"quorum_pct": 0.01,  "cap": 1000},         # Thüringen: 1%, max 1000
}

# Map full German state name → ISO code
STATE_TO_ISO: dict[str, str] = {
    "Baden-Württemberg": "DE-BW",
    "Bayern": "DE-BY",
    "Berlin": "DE-BE",
    "Brandenburg": "DE-BB",
    "Bremen": "DE-HB",
    "Hamburg": "DE-HH",
    "Hessen": "DE-HE",
    "Mecklenburg-Vorpommern": "DE-MV",
    "Niedersachsen": "DE-NI",
    "Nordrhein-Westfalen": "DE-NW",
    "Rheinland-Pfalz": "DE-RP",
    "Saarland": "DE-SL",
    "Sachsen": "DE-SN",
    "Sachsen-Anhalt": "DE-ST",
    "Schleswig-Holstein": "DE-SH",
    "Thüringen": "DE-TH",
}

GLOBAL_MINIMUM = 1


def calculate_threshold(bundesland_iso: Optional[str], population: Optional[int]) -> int:
    """Return the required number of signatures for an Einwohnerantrag."""
    if not bundesland_iso or not population:
        return 50  # fallback when data is unavailable

    rules = QUORUM_RULES.get(bundesland_iso, {"quorum_pct": 0.01, "cap": None})

    if "fixed" in rules:
        threshold = rules["fixed"]
    else:
        threshold = math.ceil(population * rules["quorum_pct"])

    if rules.get("cap"):
        threshold = min(threshold, rules["cap"])

    return max(GLOBAL_MINIMUM, threshold)


def state_name_to_iso(state_name: str) -> Optional[str]:
    return STATE_TO_ISO.get(state_name)