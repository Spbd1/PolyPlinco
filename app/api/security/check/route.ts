import { type NextRequest, NextResponse } from "next/server"
import { isValidEthereumAddress } from "@/lib/backend-security"

// Security check endpoint for monitoring
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const address = searchParams.get("address")

  if (!address || !isValidEthereumAddress(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 })
  }

  return NextResponse.json({
    address,
    configured: false,
    suspicious: null,
    reason: "Activity analysis is not configured; this endpoint does not make a security determination.",
    timestamp: Date.now(),
  })
}

export const runtime = "nodejs"
