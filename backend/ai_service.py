from typing import Optional
from vector_search import get_vector_search
from config import get_settings


class AIService:
    def __init__(self):
        self.vector_search = get_vector_search()
        self.settings = get_settings()

    def generate_answer(self, question: str, country: Optional[str] = None) -> str:
        """
        Generate an answer to the question using vector search and LLM
        """
        # Search for relevant document chunks
        use_gemini = bool(self.settings.gemini_api_key)
        search_results = self.vector_search.search(
            query=question,
            country=country,
            top_k=10,  # Increased from 5 to 10 for better coverage
            use_gemini=False  # Disable embedding API to avoid quota issues
        )

        if not search_results:
            return "I couldn't find relevant information to answer your question. Please try rephrasing or ask about USA, UK, Canada, or Australia."

        # Build context from search results
        context = "\n\n".join([
            f"[From {country}]: {text}"
            for country, text, score in search_results
        ])

        # If Gemini API key is available, use Gemini to generate answer
        if use_gemini and self.settings.gemini_api_key:
            try:
                return self._generate_with_gemini(question, context, country)
            except Exception as e:
                print(f"Gemini generation failed: {e}, using fallback")
                return self._generate_simple_answer(question, search_results, country)
        else:
            return self._generate_simple_answer(question, search_results, country)

    def _generate_with_gemini(self, question: str, context: str, country: Optional[str]) -> str:
        """Generate answer using Google Gemini"""
        import google.generativeai as genai

        genai.configure(api_key=self.settings.gemini_api_key)

        # Use Gemini 2.5 Flash model
        model = genai.GenerativeModel('gemini-2.5-flash')

        country_filter = f" about {country}" if country else ""

        prompt = f"""You are a helpful study abroad assistant for USA, UK, Canada, and Australia.

Question: {question}{country_filter}

Context from study abroad guides:
{context}

Instructions:
1. Answer the question based on the context provided
2. If the context contains information from multiple countries, use only the relevant country's information
3. If the context doesn't have the specific information requested, say: "I don't have specific information about [topic] in the documents. Please try asking about [suggest related topics]"
4. Provide clear, helpful, and well-formatted answers
5. Use bullet points or numbered lists when appropriate"""

        # Generate response
        response = model.generate_content(prompt)

        return response.text

    def _generate_simple_answer(self, question: str, search_results, country: Optional[str]) -> str:
        """Fallback: Generate simple answer from search results"""
        country_filter = f" about {country}" if country else ""

        # Get the best match
        best_country, best_text, best_score = search_results[0]

        # Extract relevant portion (first 800 chars of most relevant chunk)
        relevant_text = best_text[:800] if len(best_text) > 800 else best_text

        answer = f"""Based on the study abroad information{country_filter}:

{relevant_text}

Source: {best_country} Study Abroad Guide

Note: This is a direct excerpt from the official guide. For more detailed information, please ask more specific questions."""

        return answer


# Global instance
ai_service = None


def get_ai_service() -> AIService:
    """Get or create the global AI service instance"""
    global ai_service
    if ai_service is None:
        ai_service = AIService()
    return ai_service
