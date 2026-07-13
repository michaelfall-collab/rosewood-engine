import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Gate the internal cockpit and the deploy API behind a shared passphrase (HTTP Basic Auth).
// The client-facing picker at "/" is intentionally NOT matched — clients never hit this.
export const config = {
  matcher: ["/studio/:path*", "/api/deploy/:path*"],
};

export function middleware(request: NextRequest) {
  const password = process.env.STUDIO_PASSWORD || "rosewood";
  const header = request.headers.get("authorization");

  if (header?.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const supplied = decoded.slice(decoded.indexOf(":") + 1);
      if (supplied === password) return NextResponse.next();
    } catch {
      /* fall through to challenge */
    }
  }

  return new NextResponse("Rosewood Studio — authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Rosewood Studio", charset="UTF-8"' },
  });
}
