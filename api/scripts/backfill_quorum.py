"""
Backfill bundesland + population for existing users from Nominatim,
then recalculate threshold for all their proposals.

Run from the api/ directory:
    python -m scripts.backfill_quorum
"""
import asyncio
import os
import sys

# Make sure the api/src package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import httpx
from sqlmodel import Session, select

from src.database import engine
from src.models import User, Proposal
from src.quorum import calculate_threshold, state_name_to_iso


async def fetch_geodata(gemeinde: str) -> tuple:
    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            "q": f"{gemeinde}, Germany",
            "format": "json",
            "addressdetails": "1",
            "extratags": "1",
            "limit": "1",
        }
        headers = {"User-Agent": "CityVoice/1.0 (backfill script)"}
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params, headers=headers)
            data = resp.json()
        if not data:
            return None, None
        result = data[0]
        address = result.get("address", {})
        state_name = address.get("state")
        if not state_name:
            iso_raw = address.get("ISO3166-2-lvl4", "")
            bundesland_iso = iso_raw if iso_raw.startswith("DE-") else None
        else:
            bundesland_iso = state_name_to_iso(state_name)

        pop_raw = result.get("extratags", {}).get("population")
        population = int(pop_raw) if pop_raw and str(pop_raw).isdigit() else None
        return bundesland_iso, population
    except Exception as e:
        print(f"  ERROR: {e}")
        return None, None


async def main():
    with Session(engine) as session:
        users = session.exec(select(User)).all()
        print(f"Found {len(users)} users")

        for user in users:
            if not user.gemeinde:
                print(f"  User {user.username}: no gemeinde, skipping")
                continue

            print(f"  User {user.username} ({user.gemeinde}) ... ", end="", flush=True)
            bundesland, population = await fetch_geodata(user.gemeinde)
            user.bundesland = bundesland
            user.population = population
            session.add(user)
            print(f"bundesland={bundesland}, population={population}")

            # Rate-limit Nominatim
            await asyncio.sleep(1.1)

        session.commit()

        # Recalculate thresholds for all proposals
        proposals = session.exec(select(Proposal)).all()
        print(f"\nRecalculating thresholds for {len(proposals)} proposals")
        for proposal in proposals:
            author = session.get(User, proposal.author_id)
            new_threshold = calculate_threshold(
                author.bundesland if author else None,
                author.population if author else None,
            )
            proposal.threshold = new_threshold
            session.add(proposal)
            print(f"  Proposal {proposal.id} ({proposal.title[:40]}): threshold={new_threshold}")

        session.commit()
        print("\nDone.")


if __name__ == "__main__":
    asyncio.run(main())
