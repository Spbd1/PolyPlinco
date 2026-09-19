import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Rate limiting map (IP -> { count, resetTime })
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

// Rate limit: 100 requests per minute per IP
const RATE_LIMIT = 100
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute

export function middleware(request: NextRequest) {
  // Only apply rate limiting to API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    // Nginx overwrites X-Real-IP from the socket address. Do not trust a
    // client-supplied X-Forwarded-For value for application rate limiting.
    const ip = request.headers.get("x-real-ip")?.trim() || "unknown"
    const now = Date.now()

    // Get or initialize rate limit entry
    let entry = rateLimitMap.get(ip)

    if (!entry || now > entry.resetTime) {
      // New window
      entry = { count: 1, resetTime: now + RATE_LIMIT_WINDOW }
      rateLimitMap.set(ip, entry)
    } else {
      // Increment count
      entry.count++

      if (entry.count > RATE_LIMIT) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Try again later." },
          {
            status: 429,
            headers: {
              "Retry-After": String(Math.ceil((entry.resetTime - now) / 1000)),
            },
          },
        )
      }
    }
  }

  // Add security headers
  const response = NextResponse.next()
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")

  return response
}

export const config = {
  matcher: ["/api/:path*"],
}
