import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const apiGatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL?.replace(/\/$/, "");
    if (!apiGatewayUrl) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_API_GATEWAY_URL is not configured" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const targetUrl = `${apiGatewayUrl}/orders`;

    const res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `API Gateway returned status ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Proxy POST /api/orders error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
