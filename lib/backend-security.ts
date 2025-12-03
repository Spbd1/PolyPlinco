/**
 * Backend Security Utilities for PolyPlinko
 * Enhanced security measures for API routes and backend operations
 */

import { createHash, randomBytes } from "crypto"

// Request signature verification
export function verifyRequestSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = createHash("sha256")
    .update(payload + secret)
    .digest("hex")

  return signature === expectedSignature
}

// Generate CSRF token
export function generateCSRFToken(): string {
  return randomBytes(32).toString("hex")
}

// Validate Ethereum address
export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

// Sanitize user input
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, "") // Remove HTML tags
    .replace(/[^\w\s.-]/g, "") // Remove special characters except . - and whitespace
    .trim()
    .slice(0, 100) // Max length
}

// IP-based rate limiting with exponential backoff
interface RateLimitEntry {
  count: number
  resetTime: number
  violations: number
  bannedUntil?: number
}

const ipRateLimits = new Map<string, RateLimitEntry>()

export function checkRateLimit(
  ip: string,
  limit = 100,
  windowMs = 60000,
): { allowed: boolean; retryAfter?: number; reason?: string } {
  const now = Date.now()
  let entry = ipRateLimits.get(ip)

  // Check if IP is banned
  if (entry?.bannedUntil && now < entry.bannedUntil) {
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.bannedUntil - now) / 1000),
      reason: "IP temporarily banned due to excessive violations",
    }
  }

  if (!entry || now > entry.resetTime) {
    // New window
    entry = {
      count: 1,
      resetTime: now + windowMs,
      violations: entry?.violations || 0,
    }
    ipRateLimits.set(ip, entry)
    return { allowed: true }
  }

  entry.count++

  if (entry.count > limit) {
    entry.violations++

    // Ban IP after 5 violations
    if (entry.violations >= 5) {
      entry.bannedUntil = now + 24 * 60 * 60 * 1000 // 24 hour ban
      return {
        allowed: false,
        retryAfter: 86400,
        reason: "IP banned for 24 hours due to repeated violations",
      }
    }

    return {
      allowed: false,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      reason: "Rate limit exceeded",
    }
  }

  return { allowed: true }
}

// Detect suspicious patterns
export function detectSuspiciousActivity(
  events: {
    timestamp: number
    type: string
    value: number
  }[],
): { suspicious: boolean; reason?: string } {
  // Check for rapid-fire identical bets
  const recentBets = events.filter((e) => e.type === "bet" && Date.now() - e.timestamp < 60000)

  if (recentBets.length > 20) {
    return {
      suspicious: true,
      reason: "Excessive bet frequency detected",
    }
  }

  // Check for unusual bet patterns (same amount repeatedly)
  const betAmounts = recentBets.map((e) => e.value)
  const uniqueAmounts = new Set(betAmounts)

  if (betAmounts.length > 10 && uniqueAmounts.size === 1) {
    return {
      suspicious: true,
      reason: "Repeated identical bets detected",
    }
  }

  return { suspicious: false }
}

// Clean up old rate limit entries (run periodically)
export function cleanupRateLimitCache(): number {
  const now = Date.now()
  let cleaned = 0

  for (const [ip, entry] of ipRateLimits.entries()) {
    // Remove entries older than 1 hour
    if (now > entry.resetTime + 60 * 60 * 1000) {
      ipRateLimits.delete(ip)
      cleaned++
    }
  }

  return cleaned
}

// Log security events
export function logSecurityEvent(event: {
  type: "rate_limit" | "invalid_input" | "suspicious_activity" | "auth_failure"
  ip: string
  details: string
  timestamp?: number
}): void {
  const log = {
    ...event,
    timestamp: event.timestamp || Date.now(),
    severity: event.type === "suspicious_activity" ? "high" : "medium",
  }

  // In production, send to logging service (Sentry, DataDog, etc.)
  console.warn("[SECURITY]", JSON.stringify(log))
}
