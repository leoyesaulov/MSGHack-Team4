"""RAG (Retrieval-Augmented Generation) utilities for proposal improvement."""
import boto3
import json
import os
from typing import List, Optional
from .web_research import deep_research, research_similar_projects

# AWS Bedrock client - credentials from environment variables
bedrock = boto3.client(
    "bedrock-runtime",
    region_name=os.getenv("AWS_REGION", "eu-north-1"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
)


def create_embedding(text: str) -> List[float]:
    """Create embedding vector for given text using AWS Bedrock Titan."""
    try:
        import json
        response = bedrock.invoke_model(
            modelId="amazon.titan-embed-text-v2:0",
            body=json.dumps({
                "inputText": text,
                "dimensions": 1024,
                "normalize": True
            })
        )
        response_body = json.loads(response['body'].read())
        return response_body['embedding']
    except Exception as e:
        print(f"Error creating embedding: {e}")
        # Fallback: return zero vector
        return [0.0] * 1024


SYSTEM_PROMPT = """Du bist ein Assistent, der Bürgern hilft, ihre Anträge an die Gemeinde professionell und überzeugend zu formulieren.

Deine Aufgabe:
1. Analysiere den Rohtext des Bürgers
2. Nutze die bereitgestellten Beispiele erfolgreicher Anträge als Orientierung
3. Formuliere den Text klar, sachlich und strukturiert um
4. Behalte die Kernaussage und Anliegen des Bürgers bei
5. Ergänze bei Bedarf fehlende Argumente (z.B. Verkehrssicherheit, Gesundheit, Umweltschutz)
6. Verwende eine höfliche, aber bestimmte Sprache

Wichtig:
- Bleibe nah am Original-Anliegen
- Erfinde keine Fakten oder Zahlen
- Strukturiere den Text logisch (Problem → Begründung → Forderung)
- Verwende Fachbegriffe nur wenn nötig und erkläre sie
- Vermeide übertriebene Emotionen, setze auf sachliche Argumente

Gib NUR den verbesserten Text zurück, ohne zusätzliche Erklärungen oder Meta-Kommentare."""


def improve_proposal_text(user_text: str, similar_examples: List[dict]) -> str:
    """Use LLM to improve user's proposal text based on similar examples."""
    # Build example context
    examples_text = "\n\n---\n\n".join([
        f"Beispiel {i+1}:\nTitel: {ex['title']}\nBeschreibung: {ex['description_raw']}\nMaßnahmen: {ex.get('massnahmen', 'N/A')}\nBegründung: {ex.get('begruendung', 'N/A')}"
        for i, ex in enumerate(similar_examples)
    ])

    user_message = f"""{SYSTEM_PROMPT}

Hier sind drei erfolgreiche Bürgeranträge als Beispiele:

{examples_text}

---

Bitte verbessere folgenden Rohtext eines Bürgers:

{user_text}

Gib nur den verbesserten Text zurück."""

    try:
        # Use cross-region inference profile for Claude Sonnet 4.5
        model_id = "eu.anthropic.claude-sonnet-4-5-20250929-v1:0"
        print(f"Calling Bedrock Converse API with model: {model_id}")
        response = bedrock.converse(
            modelId=model_id,
            messages=[
                {
                    "role": "user",
                    "content": [{"text": user_message}]
                }
            ]
        )
        print(f"Bedrock response keys: {response.keys()}")
        return response["output"]["message"]["content"][0]["text"]
    except Exception as e:
        print(f"Error calling Bedrock Converse: {e}")
        import traceback
        traceback.print_exc()
        return f"Fehler bei der Textverbesserung: {str(e)}"


GENERATE_SYSTEM_PROMPT = """Du bist ein Experte für kommunale Bürgerbeteiligung in Deutschland.
Du hilfst Bürgern dabei, aus einer informellen Idee einen vollständigen, formellen Einwohnerantrag (Bürgerantrag) zu erstellen.

Antworte AUSSCHLIESSLICH mit einem JSON-Objekt in diesem Format (kein Markdown, kein Text davor oder danach):
{
  "title": "Kurzer, prägnanter Titel des Antrags (max. 80 Zeichen)",
  "summary": "3-5 Sätze: Klare Zusammenfassung des Anliegens für Bürger und Presse. Sachlich, verständlich, überzeugend.",
  "formal_text": "Vollständiger formeller Antragstext mit Abschnitten: Antragsteller, Anliegen, Begründung, Maßnahmen, Forderung. Professionelle Behördensprache."
}

Wichtig:
- Nutze die Standortinformationen und OSM-Daten für konkrete Ortsangaben
- Nutze die Beispielanträge als Stilvorlage
- Erfinde keine Fakten oder Zahlen
- Der formal_text soll mindestens 300 Wörter haben"""


async def generate_antrag(
    user_text: str,
    location_name: str,
    osm_context: str,
    similar_examples: List[dict],
    image_bytes: Optional[bytes],
    image_media_type: Optional[str],
    author_name: str,
    gemeinde: str,
) -> dict:
    """Generate a complete Bürgerantrag (title, summary, formal_text) using Claude via Bedrock."""

    examples_text = "\n\n---\n\n".join([
        f"Beispiel {i+1}:\nTitel: {ex['title']}\nText: {ex['description_raw'][:500]}"
        for i, ex in enumerate(similar_examples)
    ]) if similar_examples else "Keine Beispiele verfügbar."

    user_message_text = f"""{GENERATE_SYSTEM_PROMPT}

=== STANDORTINFORMATIONEN (OpenStreetMap) ===
Adresse: {location_name}
Gemeinde: {gemeinde}
OSM-Details:
{osm_context or 'Keine weiteren Details verfügbar.'}

=== ERFOLGREICHE BEISPIELANTRÄGE (zur Orientierung) ===
{examples_text}

=== ANLIEGEN DES BÜRGERS ===
{user_text}

Erstelle jetzt den vollständigen Bürgerantrag als JSON."""

    # Build multimodal content block
    content: list = [{"text": user_message_text}]
    if image_bytes and image_media_type:
        import base64
        content.append({
            "image": {
                "format": image_media_type.split("/")[-1].replace("jpg", "jpeg"),
                "source": {
                    "bytes": image_bytes,
                },
            }
        })
        content.append({"text": "Das obige Foto zeigt den betroffenen Standort. Beziehe es in den Antrag ein."})

    try:
        model_id = "eu.anthropic.claude-sonnet-4-5-20250929-v1:0"
        response = bedrock.converse(
            modelId=model_id,
            messages=[{"role": "user", "content": content}],
            inferenceConfig={"maxTokens": 2000, "temperature": 0.3},
        )
        raw = response["output"]["message"]["content"][0]["text"].strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw.strip())
    except json.JSONDecodeError as e:
        print(f"JSON parse error: {e}\nRaw: {raw[:200]}")
        return {
            "title": user_text[:80],
            "summary": user_text[:500],
            "formal_text": raw,
        }
    except Exception as e:
        print(f"generate_antrag error: {e}")
        import traceback; traceback.print_exc()
        raise


FEASIBILITY_SYSTEM_PROMPT = """Du bist ein Experte für kommunale Stadtplanung und Bürgerbeteiligung.

Deine Aufgabe ist es, einen neuen Vorschlag eines Bürgers zu bewerten und zu prüfen, ob er realistisch und sinnvoll ist.

Du hast Zugriff auf:
1. Alle bestehenden Vorschläge in der Datenbank
2. Aktuelle Web-Recherche-Ergebnisse zu ähnlichen Projekten in Deutschland
3. Informationen zu Kosten, Vorschriften und Best Practices

Prüfe folgende Aspekte:
1. **Redundanz**: Gibt es bereits einen ähnlichen Vorschlag an diesem Ort? (z.B. Zebrastreifen nur 10m entfernt)
2. **Widerspruch**: Widerspricht der Vorschlag bestehenden akzeptierten Projekten?
3. **Machbarkeit**: Ist der Vorschlag generell umsetzbar? Nutze Web-Recherche-Ergebnisse für realistische Einschätzung
4. **Konflikte**: Könnte der Vorschlag mit bestehenden Vorschlägen kollidieren?
5. **Realistische Umsetzung**: Basierend auf ähnlichen Projekten - ist das machbar?

Gib eine KURZE aber INFORMIERTE Einschätzung zurück (max. 3-4 Sätze).

Format:
- Wenn OK: "✓ Ihr Vorschlag ist realistisch und sinnvoll. [Optional: Kurzer Hinweis aus Web-Recherche]"
- Wenn Bedenken: "⚠️ [Kurze Warnung mit konkretem Detail aus Recherche]. Möchten Sie trotzdem fortfahren?"
- Wenn kritisch: "✗ [Kurzes Problem mit Begründung]. Bitte überprüfen Sie Ihren Vorschlag."

Sei konstruktiv und hilfsbereit, nicht überkritisch. Nutze die Web-Recherche für konkrete Hinweise."""


async def check_proposal_feasibility(
    title: str,
    description: str,
    location_name: str,
    latitude: float,
    longitude: float,
    category: str,
    existing_proposals: List[dict],
    gemeinde: str = "",
) -> str:
    """
    Check if a new proposal is feasible/realistic based on:
    1. Existing proposals in the database
    2. Web research on similar projects
    """

    # Step 1: Perform web research on the topic
    print(f"🔍 Starting web research for: {title}")
    try:
        research_results = await deep_research(
            topic=f"{category} {title}",
            location=gemeinde or "Deutschland"
        )

        web_research_text = "=== WEB-RECHERCHE ERGEBNISSE ===\n\n"
        if research_results["results"]:
            for i, result in enumerate(research_results["results"], 1):
                web_research_text += f"{i}. **{result['title']}**\n"
                web_research_text += f"   {result['snippet'][:200]}...\n\n"
        else:
            web_research_text += "Keine relevanten Web-Ergebnisse gefunden.\n\n"

        print(f"✅ Web research completed: {research_results['results_count']} results")
    except Exception as e:
        print(f"⚠️ Web research failed: {e}")
        web_research_text = "=== WEB-RECHERCHE ERGEBNISSE ===\nWeb-Recherche konnte nicht durchgeführt werden.\n\n"

    # Step 2: Format existing proposals for context
    existing_text = "\n\n".join([
        f"- **{p['title']}** ({p['status']})\n"
        f"  Kategorie: {p['category']}\n"
        f"  Ort: {p['location_name']} (Lat: {p.get('latitude', 'N/A')}, Lng: {p.get('longitude', 'N/A')})\n"
        f"  Beschreibung: {p.get('description_raw', '')[:200]}..."
        for p in existing_proposals[:20]  # Limit to 20 most relevant
    ]) if existing_proposals else "Keine bestehenden Vorschläge in der Nähe."

    # Step 3: Build comprehensive prompt with web research
    user_message = f"""{FEASIBILITY_SYSTEM_PROMPT}

=== NEUER VORSCHLAG ===
Titel: {title}
Kategorie: {category}
Gemeinde: {gemeinde}
Ort: {location_name}
Koordinaten: Lat {latitude}, Lng {longitude}
Beschreibung: {description}

=== BESTEHENDE VORSCHLÄGE IN DER DATENBANK ===
{existing_text}

{web_research_text}

Basierend auf den bestehenden Vorschlägen UND der Web-Recherche, gib jetzt deine informierte Einschätzung (max. 3-4 Sätze):"""

    try:
        model_id = "eu.anthropic.claude-sonnet-4-5-20250929-v1:0"
        print(f"🤖 Calling Claude for feasibility assessment...")
        response = bedrock.converse(
            modelId=model_id,
            messages=[{"role": "user", "content": [{"text": user_message}]}],
            inferenceConfig={"maxTokens": 300, "temperature": 0.3},
        )
        result = response["output"]["message"]["content"][0]["text"].strip()
        print(f"✅ Claude assessment completed")
        return result
    except Exception as e:
        print(f"❌ Error checking feasibility: {e}")
        import traceback; traceback.print_exc()
        # Fallback message
        return "✓ Ihr Vorschlag wird geprüft."
