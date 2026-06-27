"""Web research utilities for proposal feasibility checking."""
import httpx
import json
from typing import List, Dict
from bs4 import BeautifulSoup
import asyncio


async def search_web(query: str, max_results: int = 3) -> List[Dict[str, str]]:
    """
    Perform a web search using DuckDuckGo HTML search (no API key needed).
    Returns list of search results with title, snippet, and URL.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Use DuckDuckGo HTML search
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
            response = await client.get(
                "https://html.duckduckgo.com/html/",
                params={"q": query},
                headers=headers,
                follow_redirects=True
            )

            if response.status_code != 200:
                print(f"Search failed with status {response.status_code}")
                return []

            soup = BeautifulSoup(response.text, "html.parser")
            results = []

            # Parse DuckDuckGo results
            for result_div in soup.select(".result")[:max_results]:
                title_elem = result_div.select_one(".result__title")
                snippet_elem = result_div.select_one(".result__snippet")
                link_elem = result_div.select_one(".result__url")

                if title_elem and snippet_elem:
                    results.append({
                        "title": title_elem.get_text(strip=True),
                        "snippet": snippet_elem.get_text(strip=True),
                        "url": link_elem.get_text(strip=True) if link_elem else "N/A"
                    })

            return results
    except Exception as e:
        print(f"Web search error: {e}")
        return []


async def fetch_webpage_content(url: str, max_chars: int = 2000) -> str:
    """
    Fetch and extract main text content from a webpage.
    Returns cleaned text content (limited to max_chars).
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
            response = await client.get(url, headers=headers, follow_redirects=True)

            if response.status_code != 200:
                return ""

            soup = BeautifulSoup(response.text, "html.parser")

            # Remove script and style elements
            for script in soup(["script", "style", "nav", "footer", "header"]):
                script.decompose()

            # Get text
            text = soup.get_text()

            # Clean up whitespace
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            text = ' '.join(chunk for chunk in chunks if chunk)

            return text[:max_chars]
    except Exception as e:
        print(f"Webpage fetch error for {url}: {e}")
        return ""


async def deep_research(topic: str, location: str = "") -> Dict[str, any]:
    """
    Perform deep research on a topic by:
    1. Searching the web for relevant information
    2. Optionally fetching content from top results
    3. Returning structured research data
    """
    # Construct search queries
    queries = [
        f"{topic} {location} Gemeinde Deutschland",
        f"{topic} Kosten Durchführung Deutschland",
        f"{topic} Vorschriften Regelungen Deutschland",
    ]

    all_results = []

    # Perform searches in parallel
    search_tasks = [search_web(q, max_results=2) for q in queries]
    search_results = await asyncio.gather(*search_tasks)

    for results in search_results:
        all_results.extend(results)

    # Remove duplicates by URL
    seen_urls = set()
    unique_results = []
    for result in all_results:
        if result["url"] not in seen_urls:
            seen_urls.add(result["url"])
            unique_results.append(result)

    return {
        "query": topic,
        "location": location,
        "results_count": len(unique_results),
        "results": unique_results[:5],  # Limit to top 5
    }


async def research_similar_projects(category: str, gemeinde: str) -> str:
    """
    Research similar projects in Germany to provide context.
    Returns a formatted string with findings.
    """
    research = await deep_research(category, gemeinde)

    if not research["results"]:
        return "Keine relevanten Online-Informationen gefunden."

    formatted = f"🔍 Web-Recherche zu '{category}' in {gemeinde}:\n\n"

    for i, result in enumerate(research["results"], 1):
        formatted += f"{i}. **{result['title']}**\n"
        formatted += f"   {result['snippet']}\n"
        if result['url'] != 'N/A':
            formatted += f"   Quelle: {result['url']}\n"
        formatted += "\n"

    return formatted
