"""RAG (Retrieval-Augmented Generation) utilities for proposal improvement."""
import boto3
import json
import os
from typing import List, Optional

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
