"""Seed the database with Ismaning demo data."""
from sqlmodel import Session, select
from .database import engine, create_db_and_tables
from .models import Proposal, ProposalStatus, Department, Vote, Comment, User
from .auth import hash_password


SEED_USERS = [
    {"username": "stefan_m", "display_name": "Stefan Maier", "email": "stefan@example.com", "password": "demo1234", "district": "Ismaning Mitte"},
    {"username": "anna_h", "display_name": "Anna Huber", "email": "anna@example.com", "password": "demo1234", "district": "Fischerhäuser"},
    {"username": "markus_b", "display_name": "Markus Bauer", "email": "markus@example.com", "password": "demo1234", "district": "Ismaning Süd"},
    {"username": "lisa_k", "display_name": "Lisa König", "email": "lisa@example.com", "password": "demo1234", "district": "Ismaning Nord"},
    {"username": "thomas_w", "display_name": "Thomas Wolf", "email": "thomas@example.com", "password": "demo1234", "district": "Ismaning Mitte"},
]

SEED_PROPOSALS = [
    {
        "title": "Zebrastreifen vor der Grundschule Ismaning",
        "description_raw": "Beim Schuleingang an der Hauptstraße ist es morgens total gefährlich. Die Kinder müssen zwischen geparkten Autos hindurch auf die Straße und der Verkehr ist schnell. Wir brauchen dringend einen Zebrastreifen!",
        "description_refined": "Vor dem Haupteingang der Grundschule Ismaning (Hauptstraße 34) fehlt ein gesicherter Fußgängerüberweg. Durch dichtes Elternhalteverhalten und hohes Verkehrsaufkommen in der Schulanfahrtszeit entsteht eine erhöhte Gefährdung für Schulkinder.",
        "location_name": "Grundschule Ismaning, Hauptstraße 34",
        "latitude": 48.2265, "longitude": 11.6720,
        "category": "Verkehr & Sicherheit",
        "department": Department.tiefbauamt,
        "status": ProposalStatus.threshold_reached,
        "author_idx": 0, "votes_count": 63,
    },
    {
        "title": "Mehr Mülleimer am Speichersee-Ufer",
        "description_raw": "Am Speichersee liegen immer Pizzakartons und Flaschen rum, vor allem am Wochenende. Es gibt kaum Mülleimer. Das ist ein Naturschutzgebiet – das geht gar nicht!",
        "description_refined": "Am Uferbereich des Ismaninger Speichersees sind trotz hohem Besucheraufkommen an Wochenenden und Feiertagen nur wenige Abfallbehälter vorhanden. Im Bereich des Naturschutzgebiets kommt es dadurch regelmäßig zu wildem Müll auf Grün- und Wasserflächen.",
        "location_name": "Ismaninger Speichersee, Uferweg Nord",
        "latitude": 48.2380, "longitude": 11.6890,
        "category": "Sauberkeit & Umwelt",
        "department": Department.gruenflaechenamt,
        "status": ProposalStatus.open,
        "author_idx": 1, "votes_count": 38,
    },
    {
        "title": "Fahrradweg entlang der Föhringer Allee ausbauen",
        "description_raw": "Die Föhringer Allee hat keinen vernünftigen Radweg. Radler müssen auf der Hauptfahrbahn fahren oder den Gehweg benutzen, was verboten ist. Viele pendeln damit nach München – das muss besser werden.",
        "description_refined": "Die Föhringer Allee (Staatsstraße 2053) verfügt zwischen Ismaning und der Stadtgrenze München über keinen durchgehenden, von der Fahrbahn getrennten Radweg. Pendlerinnen und Pendler sind dadurch zur Nutzung der Hauptfahrbahn oder des Gehwegs gezwungen.",
        "location_name": "Föhringer Allee, Ismaning Richtung München",
        "latitude": 48.2178, "longitude": 11.6608,
        "category": "Verkehr & Sicherheit",
        "department": Department.tiefbauamt,
        "status": ProposalStatus.submitted,
        "author_idx": 2, "votes_count": 55,
    },
    {
        "title": "Spielplatz im Zentrum modernisieren",
        "description_raw": "Der Spielplatz an der Kirchgasse ist uralt. Die Holzgeräte sind morsch und das Klettergerüst hat die Gemeinde schon vor zwei Jahren gesperrt. Unsere Kinder haben nichts mehr zum Spielen im Ortszentrum.",
        "description_refined": "Der Spielplatz an der Kirchgasse im Ortszentrum Ismaning weist stark abgenutzte und teilweise gesperrte Spielgeräte auf. Eine Modernisierung mit zeitgemäßem, altersgerechtem Spielangebot ist zur Sicherstellung der wohnortnahen Freizeitversorgung für Kinder dringend erforderlich.",
        "location_name": "Spielplatz Kirchgasse, Ismaning",
        "latitude": 48.2250, "longitude": 11.6700,
        "category": "Freizeit & Spielflächen",
        "department": Department.gruenflaechenamt,
        "status": ProposalStatus.open,
        "author_idx": 3, "votes_count": 22,
    },
    {
        "title": "Beleuchtung am Bahnhof Ismaning verbessern",
        "description_raw": "Der Weg vom S-Bahnhof zur Ortsmitte ist abends stockdunkel. Als Frau fühle ich mich da unwohl. Besonders die Unterführung unter den Gleisen ist unheimlich.",
        "description_refined": "Die Fußwegverbindung zwischen dem S-Bahnhof Ismaning (S8) und der Ortsmitte ist abends und nachts durch unzureichende Beleuchtungsinfrastruktur gekennzeichnet. Insbesondere die Personenunterführung am Gleis entspricht nicht dem aktuellen Sicherheitsstandard.",
        "location_name": "S-Bahnhof Ismaning, Unterführung",
        "latitude": 48.2230, "longitude": 11.6755,
        "category": "Sicherheit",
        "department": Department.ordnungsamt,
        "status": ProposalStatus.in_review,
        "author_idx": 4, "votes_count": 61,
    },
    {
        "title": "Barrierefreier Zugang zur Gemeindebücherei",
        "description_raw": "Die Bücherei hat leider keine Rampe für Rollstuhlfahrer. Ältere Menschen mit Rollator kommen auch nicht rein. Das ist 2024 nicht mehr zeitgemäß.",
        "description_refined": "Die Gemeindebücherei Ismaning ist für Personen mit Mobilitätseinschränkungen (Rollstuhl, Rollator) aufgrund fehlender Rampe und nicht automatischer Eingangstür nicht barrierefrei zugänglich. Dies widerspricht den Anforderungen der UN-Behindertenrechtskonvention sowie dem Bayerischen Behindertengleichstellungsgesetz.",
        "location_name": "Gemeindebücherei Ismaning, Rathausplatz 1",
        "latitude": 48.2258, "longitude": 11.6712,
        "category": "Barrierefreiheit",
        "department": Department.stadtplanungsamt,
        "status": ProposalStatus.open,
        "author_idx": 0, "votes_count": 29,
    },
    {
        "title": "Tempo 30 in der Münchener Straße",
        "description_raw": "Durch die Münchener Straße rasen die Autos mit 60 oder mehr, obwohl da Wohnhäuser und ein Kindergarten sind. Kinder können nicht alleine die Straße überqueren. Wir fordern Tempo 30!",
        "description_refined": "Die Münchener Straße wird trotz angrenzender Wohnbebauung und eines Kindergartens mit überhöhter Geschwindigkeit befahren. Eine Reduzierung der zulässigen Höchstgeschwindigkeit auf 30 km/h würde die Verkehrssicherheit insbesondere für Kinder und Senioren erheblich verbessern.",
        "location_name": "Münchener Straße, Ismaning",
        "latitude": 48.2240, "longitude": 11.6680,
        "category": "Verkehr & Sicherheit",
        "department": Department.ordnungsamt,
        "status": ProposalStatus.accepted,
        "author_idx": 1, "votes_count": 78,
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

        users = []
        for u in SEED_USERS:
            user = User(
                username=u["username"],
                display_name=u["display_name"],
                email=u["email"],
                district=u["district"],
                hashed_password=hash_password(u["password"]),
            )
            session.add(user)
            users.append(user)
        session.flush()

        for data in SEED_PROPOSALS:
            author_idx = data.pop("author_idx")
            votes_count = data.pop("votes_count")
            author = users[author_idx]
            proposal = Proposal(**data, author_id=author.id)
            session.add(proposal)
            session.flush()

            voted_ids = {author.id}
            for voter in users:
                if voter.id not in voted_ids and len(voted_ids) - 1 < votes_count:
                    session.add(Vote(proposal_id=proposal.id, user_id=voter.id))
                    voted_ids.add(voter.id)

            for i in range(2):
                commenter = users[(author_idx + i + 1) % len(users)]
                session.add(Comment(
                    proposal_id=proposal.id,
                    author_id=commenter.id,
                    text=SAMPLE_COMMENTS[(author_idx + i) % len(SAMPLE_COMMENTS)],
                ))

        session.commit()
        print("Seeded Ismaning demo data.")
        print("Demo login: stefan_m / demo1234")


if __name__ == "__main__":
    seed()
