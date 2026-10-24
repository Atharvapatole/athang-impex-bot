import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { PdfIngestor } from "@/lib/kb/pdf-ingestor";

export async function POST(req: NextRequest) {
  try {
    await requireAuth(["OWNER", "ADMIN"]);
    const { businessId, pdfUrl, sourceName } = await req.json();

    if (!businessId || !pdfUrl) {
      return NextResponse.json({ error: "businessId and pdfUrl are required" }, { status: 400 });
    }

    const result = await PdfIngestor.ingestPdfUrl(businessId, pdfUrl.trim(), sourceName);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
