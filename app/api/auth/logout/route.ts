import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", req.url), { status: 303 });
  response.cookies.delete("auth_token");
  return response;
}
