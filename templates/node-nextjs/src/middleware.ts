import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const start = Date.now();
  const response = NextResponse.next();

  response.headers.set("x-request-start", start.toString());
  response.headers.set("x-request-path", request.nextUrl.pathname);
  response.headers.set("x-request-method", request.method);

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
