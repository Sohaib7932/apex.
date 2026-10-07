import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "apex_session";

/**
 * Seller Central needs an account: visitors without a session cookie are sent to
 * sign in and come back to the exact page (path and query). This is only the fast
 * path; every /seller page still verifies the session and the store on the server.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  const { pathname, search } = request.nextUrl;
  const login = new URL("/login", request.url);
  login.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/seller", "/seller/:path*"],
};
