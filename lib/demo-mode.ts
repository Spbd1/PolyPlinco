const DEMO_STORAGE_KEY = "polyplinko_demo_plays"
const PAID_STORAGE_KEY = "polyplinko_paid_plays"
const MAX_DEMO_PLAYS_PER_DAY = 10
const MAX_PAID_PLAYS_PER_DAY = 10000

interface DemoPlay {
  timestamp: number
  balls: number
}

interface PaidPlay {
  timestamp: number
  balls: number
  address: string
}

export function getDemoPlaysToday(): DemoPlay[] {
  if (typeof window === "undefined") return []

  const stored = localStorage.getItem(DEMO_STORAGE_KEY)
  if (!stored) return []

  const plays: DemoPlay[] = JSON.parse(stored)
  const today = new Date().setHours(0, 0, 0, 0)

  // Filter to only today's plays
  return plays.filter((play) => new Date(play.timestamp).setHours(0, 0, 0, 0) === today)
}

export function getRemainingDemoPlays(): number {
  const todayPlays = getDemoPlaysToday()
  const totalBalls = todayPlays.reduce((sum, play) => sum + play.balls, 0)
  return Math.max(0, MAX_DEMO_PLAYS_PER_DAY - totalBalls)
}

export function addDemoPlay(balls: number): boolean {
  const remaining = getRemainingDemoPlays()
  if (remaining < balls) return false

  const stored = localStorage.getItem(DEMO_STORAGE_KEY)
  const plays: DemoPlay[] = stored ? JSON.parse(stored) : []

  plays.push({ timestamp: Date.now(), balls })
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(plays))

  return true
}

export function canPlayDemo(balls: number): boolean {
  return getRemainingDemoPlays() >= balls
}

export function getPaidPlaysToday(address: string): PaidPlay[] {
  if (typeof window === "undefined") return []

  const stored = localStorage.getItem(PAID_STORAGE_KEY)
  if (!stored) return []

  const plays: PaidPlay[] = JSON.parse(stored)
  const today = new Date().setHours(0, 0, 0, 0)

  return plays.filter(
    (play) =>
      play.address.toLowerCase() === address.toLowerCase() && new Date(play.timestamp).setHours(0, 0, 0, 0) === today,
  )
}

export function getRemainingPaidPlays(address: string): number {
  const todayPlays = getPaidPlaysToday(address)
  const totalBalls = todayPlays.reduce((sum, play) => sum + play.balls, 0)
  return Math.max(0, MAX_PAID_PLAYS_PER_DAY - totalBalls)
}

export function addPaidPlay(address: string, balls: number): boolean {
  const remaining = getRemainingPaidPlays(address)
  if (remaining < balls) return false

  const stored = localStorage.getItem(PAID_STORAGE_KEY)
  const plays: PaidPlay[] = stored ? JSON.parse(stored) : []

  plays.push({ timestamp: Date.now(), balls, address })
  localStorage.setItem(PAID_STORAGE_KEY, JSON.stringify(plays))

  return true
}

export function canPlayPaid(address: string, balls: number): boolean {
  return getRemainingPaidPlays(address) >= balls
}
