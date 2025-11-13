from typing import Optional
from vector_search import get_vector_search
import requests
import json


class AIServiceOllama:
    def __init__(self):
        self.vector_search = get_vector_search()
        self.ollama_url = "http://localhost:11434/api/generate"
        self.model = "llama2"  # or "mistral", "phi", etc.

    def generate_answer(self, question: str, country: Optional[str] = None) -> str:
        """
        Generate an answer to the question using vector search and Ollama
        """
        # Search for relevant document chunks
        search_results = self.vector_search.search(
            query=question,
            country=country,
            top_k=10,
            use_gemini=False
        )

        if not search_results:
            return "I couldn't find relevant information to answer your question. Please try rephrasing or ask about USA, UK, Canada, or Australia."

        # Build context from search results
        context = "\n\n".join([
            f"[From {country}]: {text}"
            for country, text, score in search_results
        ])

        # Generate answer with Ollama
        try:
            return self._generate_with_ollama(question, context, country)
        except Exception as e:
            print(f"Ollama generation failed: {e}, using fallback")
            return self._generate_simple_answer(question, search_results, country)

    def _generate_with_ollama(self, question: str, context: str, country: Optional[str]) -> str:
        """Generate answer using Ollama"""
        country_filter = f" about {country}" if country else ""

        prompt = f"""You are a helpful study abroad assistant for USA, UK, Canada, and Australia.

Question: {question}{country_filter}

Context from study abroad guides:
{context}

Instructions:
1. Answer the question based on the context provided
2. If the context contains information from multiple countries, use only the relevant country's information
3. If the context doesn't have the specific information requested, say: "I don't have specific information about [topic] in the documents."
4. Provide clear, helpful, and well-formatted answers
5. Use bullet points or numbered lists when appropriate

Answer:"""

        # Call Ollama API
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False
        }

        response = requests.post(self.ollama_url, json=payload, timeout=60)

        if response.status_code == 200:
            result = response.json()
            return result.get("response", "").strip()
        else:
            raise Exception(f"Ollama API error: {response.status_code}")

    def _generate_simple_answer(self, question: str, search_results, country: Optional[str]) -> str:
        """Fallback: Generate simple answer from search results"""
        country_filter = f" about {country}" if country else ""

        # Get the best match
        best_country, best_text, best_score = search_results[0]

        # Extract relevant portion
        relevant_text = best_text[:800] if len(best_text) > 800 else best_text

        answer = f"""Based on the study abroad information{country_filter}:

{relevant_text}

Source: {best_country} Study Abroad Guide

Note: This is a direct excerpt from the official guide. For more detailed information, please ask more specific questions."""

        return answer


# Global instance
ai_service_ollama = None


def get_ai_service_ollama():
    """Get or create the global Ollama AI service instance"""
    global ai_service_ollama
    if ai_service_ollama is None:
        ai_service_ollama = AIServiceOllama()
    return ai_service_ollama
