import { NextResponse, type NextRequest } from "next/server";
import { isRouteHidden } from "@/lib/flags/routes";

const MODE = process.env.APP_MODE === "mvp" ? "mvp" : "prototype";

// Routes outside the current mode return 404 for everyone, signed in or not.
export function proxy(request: NextRequest) {
  if (isRouteHidden(request.nextUrl.pathname, MODE)) {
    return NextResponse.rewrite(new URL("/_hidden-in-this-mode", request.url), { status: 404 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/feed/:path*", "/verify/id/:path*", "/me/:path*", "/standby/:path*", "/ngo/tasks/:path*", "/admin/:path*", "/lab/:path*", "/api/messages"],
};
