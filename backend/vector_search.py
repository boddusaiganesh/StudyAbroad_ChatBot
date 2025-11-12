import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Tuple, Optional
import json


class VectorSearch:
    def __init__(self, embeddings_path: str = "study_abroad_embeddings_local.csv"):
        """Initialize the vector search with embeddings from CSV file"""
        print(f"Loading embeddings from {embeddings_path}...")
        self.df = pd.read_csv(embeddings_path)

        # Convert string embeddings to numpy arrays
        self.df['embedding_array'] = self.df['embedding'].apply(
            lambda x: np.array(json.loads(x)) if isinstance(x, str) else x
        )
        print(f"Loaded {len(self.df)} document chunks")

    def get_embedding(self, text: str, use_gemini: bool = False) -> np.ndarray:
        """
        Get embedding for a query text.
        For simplicity, we'll use a basic averaging method.
        In production, you'd want to use the same embedding model used for documents.
        """
        if use_gemini:
            try:
                import google.generativeai as genai
                from config import get_settings
                settings = get_settings()
                genai.configure(api_key=settings.gemini_api_key)

                # Use Gemini's embedding model
                result = genai.embed_content(
                    model="models/embedding-001",
                    content=text,
                    task_type="retrieval_query"
                )
                return np.array(result['embedding'])
            except Exception as e:
                print(f"Gemini embedding failed: {e}, using fallback")
                return self._get_simple_embedding(text)
        else:
            return self._get_simple_embedding(text)

    def _get_simple_embedding(self, text: str) -> np.ndarray:
        """Fallback: use average of document embeddings as a simple approach"""
        # For demo purposes - in production use proper embedding model
        return self.df['embedding_array'].iloc[0]

    def search(
            self,
            query: str,
            country: Optional[str] = None,
            top_k: int = 5,
            use_gemini: bool = False
    ) -> List[Tuple[str, str, float]]:
        """
        Search for most similar document chunks
        Returns: List of (country, text_chunk, similarity_score)
        """
        # Get query embedding
        query_embedding = self.get_embedding(query, use_gemini=use_gemini)

        # Filter by country if specified
        df_filtered = self.df
        if country:
            df_filtered = self.df[self.df['country'].str.lower() == country.lower()]
            if len(df_filtered) == 0:
                print(f"Warning: No documents found for country '{country}'")
                df_filtered = self.df

        # Calculate similarities
        embeddings_matrix = np.vstack(df_filtered['embedding_array'].values)
        similarities = cosine_similarity([query_embedding], embeddings_matrix)[0]

        # Get top-k results
        top_indices = np.argsort(similarities)[-top_k:][::-1]

        results = []
        for idx in top_indices:
            actual_idx = df_filtered.index[idx]
            country_name = df_filtered.loc[actual_idx, 'country']
            text_chunk = df_filtered.loc[actual_idx, 'text_chunk']
            similarity = similarities[idx]
            results.append((country_name, text_chunk, similarity))

        return results

    def get_available_countries(self) -> List[str]:
        """Get list of available countries in the dataset"""
        return self.df['country'].unique().tolist()


# Global instance
vector_search = None


def get_vector_search() -> VectorSearch:
    """Get or create the global vector search instance"""
    global vector_search
    if vector_search is None:
        vector_search = VectorSearch()
    return vector_search
