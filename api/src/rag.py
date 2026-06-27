"""RAG (Retrieval-Augmented Generation) utilities for proposal improvement."""
import json
import os
from typing import List, Tuple
import numpy as np
import boto3

# AWS Bedrock client with region and credentials
bedrock = boto3.client(
    "bedrock-runtime",
    region_name="eu-north-1",
    aws_access_key_id="AKIAQ6TWLS7KZDT2ZIW2",
    aws_secret_access_key="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"
)


def create_embedding(text: str) -> List[float]:
    """Create embedding vector for given text using AWS Bedrock Titan."""
    try:
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
        # Fallback: return a simple hash-based pseudo-embedding
        import hashlib
        hash_obj = hashlib.sha256(text.encode())
        hash_bytes = hash_obj.digest()
        # Convert to 1024 floats (Titan v2 dimension)
        pseudo_emb = []
        for i in range(1024):
            pseudo_emb.append(float(hash_bytes[i % len(hash_bytes)]) / 255.0)
        return pseudo_emb


def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Calculate cosine similarity between two vectors."""
    v1 = np.array(vec1)
    v2 = np.array(vec2)
    return float(np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2)))


def find_similar_proposals(
    query_embedding: List[float],
    proposal_embeddings: List[Tuple[int, str, str, str, str]],
    top_k: int = 3
) -> List[dict]:
    """Find top-k most similar proposals using cosine similarity."""
    similarities = []
    for prop_id, title, desc_raw, massnahmen, begruendung, emb_json in proposal_embeddings:
        if not emb_json:
            continue
        try:
            prop_embedding = json.loads(emb_json)
            sim = cosine_similarity(query_embedding, prop_embedding)
            similarities.append({
                "id": prop_id,
                "title": title,
                "description_raw": desc_raw,
                "massnahmen": massnahmen,
                "begruendung": begruendung,
                "similarity": sim
            })
        except:
            continue

    similarities.sort(key=lambda x: x["similarity"], reverse=True)
    return similarities[:top_k]


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
