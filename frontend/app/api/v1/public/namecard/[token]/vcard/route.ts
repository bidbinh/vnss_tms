import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const res = await fetch(`${API_BASE}/public/namecard/${token}/vcard`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Name card not found" },
        { status: res.status }
      );
    }

    const vcardContent = await res.text();

    // Get filename from response headers or generate default
    const contentDisposition = res.headers.get("content-disposition");
    let filename = "contact.vcf";
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match) {
        filename = match[1];
      }
    }

    return new NextResponse(vcardContent, {
      headers: {
        "Content-Type": "text/vcard",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error fetching vcard:", error);
    return NextResponse.json(
      { error: "Failed to fetch vcard" },
      { status: 500 }
    );
  }
}
