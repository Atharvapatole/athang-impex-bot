import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { KnowledgeRetriever } from "@/lib/kb/retriever";

export async function POST(req: NextRequest) {
  try {
    await requireAuth(["OWNER", "ADMIN", "SUPPORT_AGENT"]);
    const { businessId, query } = await req.json();

    if (!businessId || !query) {
      return NextResponse.json({ error: "businessId and query are required" }, { status: 400 });
    }

    const chunks = await KnowledgeRetriever.retrieveChunks(businessId, query, 5);

    return NextResponse.json({
      success: true,
      query,
      results: chunks,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
