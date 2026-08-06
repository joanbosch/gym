import { getSessionCookie } from "better-auth/cookies"
import { NextResponse, type NextRequest } from "next/server"

export function proxy(request: NextRequest) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET) return NextResponse.next({ request })

  const sessionCookie = getSessionCookie(request, { cookiePrefix: "gym-joan" })
  const pathname = request.nextUrl.pathname
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/recuperar") || pathname.startsWith("/restablecer") || pathname.startsWith("/activar")
  const isPublic = isAuthPage || pathname.startsWith("/api/auth") || pathname.startsWith("/api/webhooks") || pathname.startsWith("/api/email")

  if (!sessionCookie && !isPublic) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }
  if (sessionCookie && (pathname.startsWith("/login") || pathname.startsWith("/recuperar"))) {
    return NextResponse.redirect(new URL("/hoy", request.url))
  }
  return NextResponse.next({ request })
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|sw.js|manifest.webmanifest).*)"],
}
