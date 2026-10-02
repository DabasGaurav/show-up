import { NextResponse, type NextRequest } from "next/server";

// Signed-out visitors to the signed-in pages get a real redirect to sign-in, before
// any page renders. (The pages still check the cookie's signature themselves.)
export function proxy(request: NextRequest) {
  if (request.cookies.has("su_uid") || request.cookies.has("su_as")) return NextResponse.next();
  const url = request.nextUrl.clone();
  const next = request.nextUrl.pathname + request.nextUrl.search;
  url.pathname = "/signin";
  url.search = `?next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/dashboard/:path*", "/me/:path*", "/account/:path*"] };
