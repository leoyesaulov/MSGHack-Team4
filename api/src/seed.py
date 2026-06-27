"""Seed the database with Ismaning demo data."""
from sqlmodel import Session, select
from .database import engine, create_db_and_tables
from .models import Proposal, ProposalStatus, Department, Vote, Comment, User
from .auth import hash_password


# 5 named demo users (all password: demo1234)
SEED_USERS = [
    {"username": "stefan_m", "display_name": "Stefan Maier", "email": "stefan@example.com", "password": "demo1234", "district": "Ismaning Mitte", "gemeinde": "Ismaning"},
    {"username": "anna_h", "display_name": "Anna Huber", "email": "anna@example.com", "password": "demo1234", "district": "Fischerhäuser", "gemeinde": "Ismaning"},
    {"username": "markus_b", "display_name": "Markus Bauer", "email": "markus@example.com", "password": "demo1234", "district": "Ismaning Süd", "gemeinde": "Ismaning"},
    {"username": "lisa_k", "display_name": "Lisa König", "email": "lisa@example.com", "password": "demo1234", "district": "Ismaning Nord", "gemeinde": "Ismaning"},
    {"username": "thomas_w", "display_name": "Thomas Wolf", "email": "thomas@example.com", "password": "demo1234", "district": "Ismaning Mitte", "gemeinde": "Ismaning"},
]

# 55 extra voter accounts to simulate community votes
EXTRA_VOTERS = [
    {"username": f"buerger_{i:02d}", "display_name": f"Bürger {i:02d}", "email": f"buerger{i:02d}@example.com", "password": "demo1234"}
    for i in range(1, 56)
]

# One proposal per status: open, submitted, accepted, rejected
SEED_PROPOSALS = [
    {
        "title": "Zebrastreifen vor der Grundschule Ismaning",
        "description_raw": "Beim Schuleingang an der Hauptstraße ist es morgens total gefährlich. Die Kinder müssen zwischen geparkten Autos hindurch auf die Straße und der Verkehr ist schnell. Wir brauchen dringend einen Zebrastreifen!",
        "description_refined": "Vor dem Haupteingang der Grundschule Ismaning (Hauptstraße 34) fehlt ein gesicherter Fußgängerüberweg. Durch dichtes Elternhalteverhalten und hohes Verkehrsaufkommen in der Schulanfahrtszeit entsteht eine erhöhte Gefährdung für Schulkinder.",
        "formal_text": """## Antrag an den Gemeinderat Ismaning

**Betreff:** Errichtung eines Fußgängerüberwegs (Zebrastreifen) vor der Grundschule Ismaning, Hauptstraße 34

### Sachverhalt

Vor dem Haupteingang der Grundschule Ismaning an der Hauptstraße 34 besteht kein gesicherter Fußgängerüberweg. In der Schulanfahrtszeit kommt es durch Elternfahrzeuge und den regulären Straßenverkehr zu gefährlichen Situationen für Schulkinder.

### Antrag

Die Gemeinde Ismaning wird gebeten, im Rahmen ihrer Verkehrsplanung und in Abstimmung mit dem Straßenverkehrsamt des Landkreises München die Einrichtung eines Schutzstreifens für Fußgänger (Zebrastreifen) gemäß § 26 StVO vor dem Haupteingang der Grundschule Ismaning, Hauptstraße 34, zu prüfen und umzusetzen.

### Begründung

Die Sicherheit von Schulkindern auf dem Schulweg ist ein vorrangiges Schutzziel. Der hohe Verkehrsandrang in den Morgen- und Mittagsstunden sowie das unübersichtliche Parkverhalten erfordern eine bauliche Sicherungsmaßnahme. Ein Zebrastreifen an dieser Stelle würde die Verkehrssicherheit für alle Beteiligten erheblich verbessern.

### Rechtsgrundlage

§ 26 Straßenverkehrsordnung (StVO), Art. 57 Gemeindeordnung Bayern (GO Bay)""",
        "location_name": "Grundschule Ismaning, Hauptstraße 34",
        "latitude": 48.2265, "longitude": 11.6720,
        "category": "Verkehr & Sicherheit",
        "department": Department.tiefbauamt,
        "status": ProposalStatus.open,
        "gemeinde": "Ismaning",
        "author_idx": 0, "votes_count": 24,
    },
    {
        "title": "Fahrradweg entlang der Föhringer Allee ausbauen",
        "description_raw": "Die Föhringer Allee hat keinen vernünftigen Radweg. Radler müssen auf der Hauptfahrbahn fahren oder den Gehweg benutzen, was verboten ist. Viele pendeln damit nach München – das muss besser werden.",
        "description_refined": "Die Föhringer Allee (Staatsstraße 2053) verfügt zwischen Ismaning und der Stadtgrenze München über keinen durchgehenden, von der Fahrbahn getrennten Radweg. Pendlerinnen und Pendler sind dadurch zur Nutzung der Hauptfahrbahn oder des Gehwegs gezwungen.",
        "formal_text": """## Antrag an den Gemeinderat Ismaning

**Betreff:** Ausbau eines sicheren Radwegs entlang der Föhringer Allee (St 2053)

### Sachverhalt

Die Föhringer Allee (Staatsstraße 2053) verfügt auf dem Abschnitt zwischen Ismaning und der Stadtgrenze München über keinen von der Fahrbahn getrennten Radweg. Radfahrerinnen und Radfahrer sind gezwungen, entweder die Hauptfahrbahn mit hohem Kraftfahrzeugaufkommen zu nutzen oder den Gehweg verbotswidrig zu befahren.

### Antrag

Die Gemeinde Ismaning wird gebeten, in Abstimmung mit dem Staatlichen Bauamt München-Land die Planung und den Bau eines durchgehenden, baulich von der Fahrbahn getrennten Radwegs entlang der Föhringer Allee (St 2053) voranzutreiben und hierfür notwendige Haushaltsmittel sowie Förderprogramme zu beantragen.

### Begründung

Die Förderung des Radverkehrs ist zentrales Ziel des Klimaschutzprogramms der Gemeinde Ismaning sowie des Freistaats Bayern. Ein sicherer Radweg entlang der Föhringer Allee würde die Pendlerverbindung nach München attraktiver und sicherer machen und zur Reduzierung des motorisierten Individualverkehrs beitragen.

### Rechtsgrundlage

Art. 57 GO Bay, Bayerisches Radverkehrsprogramm 2025""",
        "location_name": "Föhringer Allee, Ismaning Richtung München",
        "latitude": 48.2178, "longitude": 11.6608,
        "category": "Verkehr & Sicherheit",
        "department": Department.tiefbauamt,
        "status": ProposalStatus.submitted,
        "gemeinde": "Ismaning",
        "author_idx": 2, "votes_count": 55,
    },
    {
        "title": "Tempo 30 in der Münchener Straße",
        "description_raw": "Durch die Münchener Straße rasen die Autos mit 60 oder mehr, obwohl da Wohnhäuser und ein Kindergarten sind. Kinder können nicht alleine die Straße überqueren. Wir fordern Tempo 30!",
        "description_refined": "Die Münchener Straße wird trotz angrenzender Wohnbebauung und eines Kindergartens mit überhöhter Geschwindigkeit befahren. Eine Reduzierung der zulässigen Höchstgeschwindigkeit auf 30 km/h würde die Verkehrssicherheit insbesondere für Kinder und Senioren erheblich verbessern.",
        "formal_text": """## Antrag an den Gemeinderat Ismaning

**Betreff:** Einrichtung einer Tempo-30-Zone in der Münchener Straße, Ismaning

### Sachverhalt

Die Münchener Straße in Ismaning weist trotz angrenzender Wohnbebauung, eines Kindergartens und eines hohen Fußgängeraufkommens keine geschwindigkeitsbegrenzende Beschilderung unterhalb der zulässigen Höchstgeschwindigkeit auf. Messungen und Anwohnerberichte belegen regelmäßige Überschreitungen der zulässigen Geschwindigkeit.

### Antrag

Die Gemeinde Ismaning wird gebeten, in Abstimmung mit der zuständigen Straßenverkehrsbehörde des Landkreises München die Einführung einer Tempo-30-Zone auf dem Abschnitt der Münchener Straße zwischen der Einmündung Rathausplatz und der Ortsausfahrt Richtung München anzuordnen.

### Begründung

Gemäß § 45 Abs. 9 StVO kann die Straßenverkehrsbehörde Geschwindigkeitsbeschränkungen anordnen, wenn besondere Umstände – insbesondere die Sicherheit von Kindern und anderen gefährdeten Verkehrsteilnehmern – dies erfordern. Die Nähe des Kindergartens sowie die Wohnnutzung rechtfertigen diese Maßnahme.

### Rechtsgrundlage

§ 45 Abs. 9 StVO, Art. 57 GO Bay""",
        "location_name": "Münchener Straße, Ismaning",
        "latitude": 48.2240, "longitude": 11.6680,
        "category": "Verkehr & Sicherheit",
        "department": Department.ordnungsamt,
        "status": ProposalStatus.accepted,
        "gemeinde": "Ismaning",
        "author_idx": 1, "votes_count": 58,
    },
    {
        "title": "Parkplatz am Speichersee erweitern",
        "description_raw": "An schönen Wochenenden ist der Parkplatz am Speichersee hoffnungslos überfüllt. Autos parken auf der Wiese und blockieren die Zufahrt. Wir brauchen dringend mehr Parkplätze oder ein Parkleitsystem.",
        "description_refined": "Der bestehende Parkplatz am Ismaninger Speichersee ist an frequenzstarken Wochenenden und Feiertagen regelmäßig überlastet. Wildparken auf angrenzenden Grünflächen sowie Zufahrtsblockierungen sind die Folge. Abhilfe könnte eine Erweiterung der Stellflächen oder die Einführung eines digitalen Parkleitsystems schaffen.",
        "formal_text": """## Antrag an den Gemeinderat Ismaning

**Betreff:** Erweiterung der Parkkapazitäten am Ismaninger Speichersee bzw. Einführung eines Parkleitsystems

### Sachverhalt

Der Parkplatz am Ismaninger Speichersee (Parkplatz Süd) ist an frequenzstarken Wochenenden und Feiertagen regelmäßig überfüllt. Besucher weichen auf angrenzende Grünflächen und Privatgrundstücke aus. Die Zufahrten werden durch falsch parkende Fahrzeuge blockiert, was zu Verkehrsbehinderungen und Schäden an der Vegetation führt.

### Antrag

Die Gemeinde Ismaning wird gebeten zu prüfen, ob (a) die bestehenden Parkflächen am Speichersee erweitert werden können oder (b) ein digitales Parkleitsystem eingeführt werden kann, das Besucherinnen und Besucher frühzeitig über die Auslastung informiert und auf Ausweichparkplätze hinweist.

### Begründung

Der Ismaninger Speichersee ist ein überregional bedeutsames Naherholungsgebiet. Die unkontrollierte Parkplatzsituation beeinträchtigt sowohl die Naherholung als auch den Naturschutz im angrenzenden Vogelschutzgebiet. Eine geordnete Besucherlenkung liegt im öffentlichen Interesse.

### Rechtsgrundlage

Art. 57 GO Bay, Bundesnaturschutzgesetz (BNatSchG)""",
        "location_name": "Ismaninger Speichersee, Parkplatz Süd",
        "latitude": 48.2360, "longitude": 11.6870,
        "category": "Verkehr & Sicherheit",
        "department": Department.ordnungsamt,
        "status": ProposalStatus.rejected,
        "gemeinde": "Ismaning",
        "author_idx": 3, "votes_count": 51,
    },
]

SAMPLE_COMMENTS = [
    "Das Problem besteht schon seit Jahren – höchste Zeit, dass was passiert!",
    "Ich unterstütze das voll, meine Familie ist täglich davon betroffen.",
    "Hab die Petition geteilt, hoffe wir bekommen die 50 Stimmen zusammen.",
    "Super Idee! Die Gemeinde sollte das endlich angehen.",
    "Kenne das Problem gut, fahre jeden Tag daran vorbei.",
]


def seed():
    create_db_and_tables()
    with Session(engine) as session:
        if session.exec(select(User)).first():
            print("DB already seeded, skipping.")
            return

        # Create named demo users
        users = []
        for u in SEED_USERS:
            user = User(
                username=u["username"],
                display_name=u["display_name"],
                email=u["email"],
                district=u.get("district"),
                gemeinde=u.get("gemeinde"),
                hashed_password=hash_password(u["password"]),
            )
            session.add(user)
            users.append(user)
        session.flush()

        # Create extra voter accounts
        extra_voters = []
        for v in EXTRA_VOTERS:
            voter = User(
                username=v["username"],
                display_name=v["display_name"],
                email=v["email"],
                hashed_password=hash_password(v["password"]),
            )
            session.add(voter)
            extra_voters.append(voter)
        session.flush()

        all_voters = users + extra_voters

        for data in SEED_PROPOSALS:
            author_idx = data.pop("author_idx")
            votes_count = data.pop("votes_count")
            # Set threshold to 50
            data["threshold"] = 50
            author = users[author_idx]
            proposal = Proposal(**data, author_id=author.id)
            session.add(proposal)
            session.flush()

            # Add votes (skip author, use extra voters to reach votes_count)
            voted_ids = {author.id}
            for voter in all_voters:
                if len(voted_ids) - 1 >= votes_count:
                    break
                if voter.id not in voted_ids:
                    session.add(Vote(proposal_id=proposal.id, user_id=voter.id))
                    voted_ids.add(voter.id)

            # Add 2 comments from other named users
            for i in range(2):
                commenter = users[(author_idx + i + 1) % len(users)]
                session.add(Comment(
                    proposal_id=proposal.id,
                    author_id=commenter.id,
                    text=SAMPLE_COMMENTS[(author_idx + i) % len(SAMPLE_COMMENTS)],
                ))

        # Behörde account
        behoerde = User(
            username="gemeinde_ismaning",
            display_name="Gemeinde Ismaning",
            email="behoerde@ismaning.de",
            hashed_password=hash_password("behoerde2024"),
            is_behoerde=True,
            gemeinde="Ismaning",
        )
        session.add(behoerde)

        session.commit()
        print("Seeded Ismaning demo data.")
        print("Demo login: stefan_m / demo1234")
        print("Behörde login: gemeinde_ismaning / behoerde2024")


if __name__ == "__main__":
    seed()
