import { prisma } from "../prisma";

export interface RetrievedChunk {
  id: string;
  sourceId: string;
  sourceName: string;
  content: string;
  pageNumber?: number | null;
  score: number;
}

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "in", "on", "at", "to", "for", "with",
  "by", "about", "is", "are", "was", "were", "be", "been", "being", "have", "has",
  "had", "do", "does", "did", "can", "could", "should", "would", "you", "your",
  "we", "our", "us", "they", "them", "their", "it", "its", "i", "me", "my", "this", "that"
]);

export class KnowledgeRetriever {
  /**
   * Retrieves relevant knowledge chunks for a business query using lexical / BM25-style scoring.
   * Guarantees strict business isolation.
   */
  static async retrieveChunks(
    businessId: string,
    query: string,
    limit: number = 4
  ): Promise<RetrievedChunk[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    // Strict tenant check: load chunks ONLY belonging to this businessId
    const chunks = await prisma.knowledgeBaseChunk.findMany({
      where: { businessId },
      include: {
        source: {
          select: { name: true },
        },
      },
    });

    if (chunks.length === 0) {
      return [];
    }

    const cleanQuery = query.toLowerCase().trim();
    const queryTerms = cleanQuery
      .replace(/[^\w\s-]/g, " ")
      .split(/\s+/)
      .filter((term) => term.length > 2 && !STOP_WORDS.has(term));

    const scored: RetrievedChunk[] = [];

    for (const chunk of chunks) {
      const chunkText = chunk.content.toLowerCase();
      let score = 0;

      // 1. Exact phrase match bonus
      if (cleanQuery.length > 6 && chunkText.includes(cleanQuery)) {
        score += 15.0;
      }

      // 2. Term frequency matching
      for (const term of queryTerms) {
        if (chunkText.includes(term)) {
          // Count occurrences
          const regex = new RegExp(`\\b${term}\\b`, "gi");
          const matches = chunkText.match(regex);
          const termCount = matches ? matches.length : 1;
          score += 2.0 + Math.min(termCount * 0.5, 3.0);
        }
      }

      // 3. Proximity bonus if multiple terms appear
      const matchedTermCount = queryTerms.filter((t) => chunkText.includes(t)).length;
      if (queryTerms.length > 1 && matchedTermCount >= 2) {
        score += (matchedTermCount / queryTerms.length) * 5.0;
      }

      if (score > 0) {
        scored.push({
          id: chunk.id,
          sourceId: chunk.sourceId,
          sourceName: chunk.source.name,
          content: chunk.content,
          pageNumber: chunk.pageNumber,
          score,
        });
      }
    }

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit);
  }
}
