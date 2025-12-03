import { type NextRequest, NextResponse } from "next/server"
import { isValidEthereumAddress, detectSuspiciousActivity } from "@/lib/backend-security"

// Security check endpoint for monitoring
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const address = searchParams.get("address")

  if (!address || !isValidEthereumAddress(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 })
  }

  // Simulate checking recent activity
  // In production, fetch from blockchain or database
  const recentActivity = [] // Replace with actual data

  const analysis = detectSuspiciousActivity(recentActivity)

  return NextResponse.json({
    address,
    suspicious: analysis.suspicious,
    reason: analysis.reason,
    timestamp: Date.now(),
  })
}

export const runtime = "nodejs"
