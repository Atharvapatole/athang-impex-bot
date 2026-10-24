import pdfParse from "pdf-parse";
import { prisma } from "../prisma";
import { validateSafePdfUrl } from "./ssrf-validator";

const MAX_PDF_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
const FETCH_TIMEOUT_MS = 25000; // 25 seconds
const CHUNK_SIZE_CHARS = 750;
const CHUNK_OVERLAP_CHARS = 100;

export interface IngestionResult {
  sourceId: string;
  name: string;
  fileSizeBytes: number;
  pageCount: number;
  chunkCount: number;
  preview: string;
}

export class PdfIngestor {
  /**
   * Fetches, validates, extracts, chunks, and indexes a hosted PDF URL.
   */
  static async ingestPdfUrl(
    businessId: string,
    url: string,
    customName?: string
  ): Promise<IngestionResult> {
    // 1. SSRF and destination validation
    const { safeUrl } = await validateSafePdfUrl(url);

    // 2. Fetch with strict timeout and size limit
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let buffer: Buffer;
    let contentType = "";

    try {
      const response = await fetch(safeUrl.toString(), {
        method: "GET",
        headers: {
          "User-Agent": "AthangImpex-ChatbotPlatform-PdfIngestor/1.0",
          Accept: "application/pdf,application/octet-stream;q=0.9",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to download PDF. Server returned HTTP ${response.status}`);
      }

      contentType = (response.headers.get("content-type") || "").toLowerCase();
      const contentLengthHeader = response.headers.get("content-length");
      if (contentLengthHeader && parseInt(contentLengthHeader, 10) > MAX_PDF_SIZE_BYTES) {
        throw new Error(
          `PDF exceeds maximum allowed size of ${MAX_PDF_SIZE_BYTES / (1024 * 1024)}MB`
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);

      if (buffer.length > MAX_PDF_SIZE_BYTES) {
        throw new Error(
          `Downloaded PDF size (${(buffer.length / (1024 * 1024)).toFixed(1)}MB) exceeds limit`
        );
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new Error(`PDF download timed out after ${FETCH_TIMEOUT_MS / 1000}s`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    // 3. Verify magic bytes (%PDF-)
    if (buffer.length < 5 || buffer.toString("utf8", 0, 5) !== "%PDF-") {
      throw new Error("Invalid file signature: Content is not a valid PDF document");
    }

    // 4. Parse PDF
    let parsed: any;
    try {
      parsed = await pdfParse(buffer);
    } catch (parseErr: any) {
      throw new Error(`Failed to parse PDF document: ${parseErr.message}`);
    }

    const rawText = (parsed.text || "").trim();
    const pageCount = parsed.numpages || 1;

    // 5. Scanned PDF check
    if (!rawText || rawText.length < 30) {
      throw new Error(
        "Scanned PDF detected without extractable text. OCR text processing is required for image-based PDFs."
      );
    }

    // 6. Clean and split into overlapping chunks
    const chunks = this.chunkText(rawText, CHUNK_SIZE_CHARS, CHUNK_OVERLAP_CHARS);
    if (chunks.length === 0) {
      throw new Error("No usable text chunks could be extracted from the document.");
    }

    const docName =
      customName?.trim() ||
      safeUrl.pathname.split("/").pop()?.replace(/%20/g, " ") ||
      "Document Knowledge Base";

    const preview = rawText.slice(0, 300).replace(/\s+/g, " ") + "...";

    // 7. Persist in database inside a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Upsert KnowledgeBaseSource
      const source = await tx.knowledgeBaseSource.create({
        data: {
          businessId,
          sourceUrl: safeUrl.toString(),
          name: docName,
          status: "INDEXED",
          fileSizeBytes: buffer.length,
          pageCount,
          chunkCount: chunks.length,
          extractedPreview: preview,
          lastSyncedAt: new Date(),
        },
      });

      // Insert chunks
      const chunkData = chunks.map((chunk, index) => ({
        businessId,
        sourceId: source.id,
        chunkIndex: index,
        content: chunk,
        tokenEstimate: Math.ceil(chunk.length / 4),
      }));

      await tx.knowledgeBaseChunk.createMany({
        data: chunkData,
      });

      return {
        sourceId: source.id,
        name: docName,
        fileSizeBytes: buffer.length,
        pageCount,
        chunkCount: chunks.length,
        preview,
      };
    });

    return result;
  }

  /**
   * Splits text into overlapping chunks, attempting to break on paragraph or sentence boundaries.
   */
  static chunkText(text: string, chunkSize: number, overlap: number): string[] {
    const cleaned = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ");
    const chunks: string[] = [];

    let start = 0;
    while (start < cleaned.length) {
      let end = start + chunkSize;

      if (end >= cleaned.length) {
        const lastSlice = cleaned.slice(start).trim();
        if (lastSlice.length > 20) {
          chunks.push(lastSlice);
        }
        break;
      }

      // Try to find a sentence or newline break near end
      const lookback = cleaned.slice(Math.max(start, end - 150), end);
      const match = lookback.match(/[.\n?!]\s+/);
      if (match && match.index !== undefined) {
        end = Math.max(start, end - 150) + match.index + match[0].length;
      }

      const chunk = cleaned.slice(start, end).trim();
      if (chunk.length > 20) {
        chunks.push(chunk);
      }

      start = end - overlap;
    }

    return chunks;
  }
}
