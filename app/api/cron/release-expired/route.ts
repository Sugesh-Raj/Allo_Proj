import { NextRequest, NextResponse } from "next/server";
import { releaseExpiredReservations } from "@/lib/expiry";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    
    // Authenticate cron caller via Bearer token comparison
    const expectedSecret = process.env.CRON_SECRET || "allo_health_cron_secret_token_12345!";
    const isAuthorized = authHeader === `Bearer ${expectedSecret}`;

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized cron execution." },
        { status: 401 }
      );
    }

    const releasedCount = await releaseExpiredReservations();
    
    return NextResponse.json({
      success: true,
      releasedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron Release API Error:", error);
    return NextResponse.json(
      { error: "Cron execution failed" },
      { status: 500 }
    );
  }
}

// Fallback to GET for simple manual verification in staging/development if secrets match
export async function GET(req: NextRequest) {
  const authHeader = req.nextUrl.searchParams.get("secret");
  const expectedSecret = process.env.CRON_SECRET || "allo_health_cron_secret_token_12345!";
  
  if (authHeader !== expectedSecret) {
    return NextResponse.json(
      { error: "Unauthorized cron execution." },
      { status: 401 }
    );
  }

  const releasedCount = await releaseExpiredReservations();
  return NextResponse.json({
    success: true,
    releasedCount,
    timestamp: new Date().toISOString(),
  });
}
