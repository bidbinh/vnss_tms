"""
Knowledge Base for RAG (Retrieval Augmented Generation)

Simple file-based knowledge base. Can be upgraded to vector DB later.
"""
import os
import json
from typing import List, Dict, Optional
from pathlib import Path


class KnowledgeBase:
    """Simple knowledge base for FAQ and documentation"""

    def __init__(self, knowledge_dir: str = "app/ai/knowledge"):
        self.knowledge_dir = Path(knowledge_dir)
        self.documents: List[Dict] = []
        self.faq: List[Dict] = []
        self._load_knowledge()

    def _load_knowledge(self):
        """Load knowledge from files"""
        # Load FAQ
        faq_file = self.knowledge_dir / "faq.json"
        if faq_file.exists():
            with open(faq_file, "r", encoding="utf-8") as f:
                self.faq = json.load(f)

        # Load documentation
        docs_dir = self.knowledge_dir / "docs"
        if docs_dir.exists():
            for file in docs_dir.glob("*.md"):
                with open(file, "r", encoding="utf-8") as f:
                    self.documents.append({
                        "title": file.stem,
                        "content": f.read()
                    })

    def search(self, query: str, top_k: int = 3) -> List[Dict]:
        """
        Simple keyword search in knowledge base.
        TODO: Upgrade to vector search with embeddings
        """
        query_lower = query.lower()
        results = []

        # Search FAQ
        for item in self.faq:
            question = item.get("question", "").lower()
            answer = item.get("answer", "")
            keywords = item.get("keywords", [])

            score = 0
            # Check question match
            if any(word in question for word in query_lower.split()):
                score += 2
            # Check keywords
            for kw in keywords:
                if kw.lower() in query_lower:
                    score += 3

            if score > 0:
                results.append({
                    "type": "faq",
                    "question": item["question"],
                    "answer": answer,
                    "score": score
                })

        # Search documents
        for doc in self.documents:
            content_lower = doc["content"].lower()
            score = sum(1 for word in query_lower.split() if word in content_lower)
            if score > 0:
                # Extract relevant snippet
                snippet = self._extract_snippet(doc["content"], query, max_length=500)
                results.append({
                    "type": "doc",
                    "title": doc["title"],
                    "snippet": snippet,
                    "score": score
                })

        # Sort by score and return top_k
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]

    def _extract_snippet(self, content: str, query: str, max_length: int = 500) -> str:
        """Extract relevant snippet from document"""
        query_words = query.lower().split()
        lines = content.split("\n")

        for i, line in enumerate(lines):
            if any(word in line.lower() for word in query_words):
                # Get context (2 lines before and after)
                start = max(0, i - 2)
                end = min(len(lines), i + 3)
                snippet = "\n".join(lines[start:end])
                if len(snippet) > max_length:
                    snippet = snippet[:max_length] + "..."
                return snippet

        # If no match, return beginning
        return content[:max_length] + "..." if len(content) > max_length else content

    def get_context_for_query(self, query: str) -> str:
        """Get formatted context for AI prompt"""
        results = self.search(query)
        if not results:
            return ""

        context_parts = ["### Thông tin tham khảo:\n"]
        for r in results:
            if r["type"] == "faq":
                context_parts.append(f"**Q: {r['question']}**\nA: {r['answer']}\n")
            else:
                context_parts.append(f"**{r['title']}:**\n{r['snippet']}\n")

        return "\n".join(context_parts)
