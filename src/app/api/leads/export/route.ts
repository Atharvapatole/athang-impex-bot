import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(["OWNER", "ADMIN"]);
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");

    const where: any = {};
    if (businessId) where.businessId = businessId;

    const leads = await prisma.lead.findMany({
      where,
      include: {
        business: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const headers = [
      "Lead ID",
      "Business",
      "Buyer Name",
      "Company",
      "Country",
      "Destination Port",
      "Product of Interest",
      "Quantity & Unit",
      "Packaging",
      "Timeline",
      "Contact Email/Phone",
      "Order Reference",
      "Support Topic",
      "Status",
      "Created At",
    ];

    const escapeCsv = (str?: string | null) => {
      if (!str) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = leads.map((l) => [
      escapeCsv(l.id),
      escapeCsv(l.business.name),
      escapeCsv(l.buyerName),
      escapeCsv(l.company),
      escapeCsv(l.country),
      escapeCsv(l.destinationPort),
      escapeCsv(l.productOfInterest),
      escapeCsv(l.quantityAndUnit),
      escapeCsv(l.packagingPreference),
      escapeCsv(l.purchaseTimeline),
      escapeCsv(l.emailOrPhone),
      escapeCsv(l.orderReference),
      escapeCsv(l.supportTopic),
      escapeCsv(l.status),
      escapeCsv(l.createdAt.toISOString()),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="leads_export_${Date.now()}.csv"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
