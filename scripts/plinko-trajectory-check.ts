import {
  computeBinomialWeights,
  generateDecisionPath,
  generateVisualSeed,
  getFinalSlot,
  getPathDuration,
  getPathPosition,
  simulateBallPath,
} from "../lib/plinko-simulator"

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

for (let rows = 1; rows <= 32; rows++) {
  for (let slot = 0; slot <= rows; slot++) {
    const seed = generateVisualSeed(0x5eedc0den, String(rows * 1000 + slot), slot, slot)
    const decisions = generateDecisionPath(rows, slot, seed)
    assert(decisions.length === rows, `wrong decision count for ${rows}/${slot}`)
    assert(decisions.filter((decision) => decision === "R").length === slot, `wrong R count for ${rows}/${slot}`)
    assert(decisions.every((decision) => decision === "L" || decision === "R"), `invalid decision for ${rows}/${slot}`)
    const replay = generateDecisionPath(rows, slot, seed)
    assert(JSON.stringify(decisions) === JSON.stringify(replay), `non-deterministic path for ${rows}/${slot}`)
  }

  for (let ballIndex = 0; ballIndex < 8; ballIndex++) {
    const baseSeed = BigInt(rows * 1000 + ballIndex + 1)
    const gameId = String(100000 + rows)
    const expected = getFinalSlot(baseSeed, gameId, ballIndex, rows, computeBinomialWeights(rows))
    const path = simulateBallPath(baseSeed, gameId, ballIndex, rows)
    const contacts = path.filter((point) => point.pegRow !== undefined)
    assert(contacts.length === rows, `wrong contact count for rows=${rows}, ball=${ballIndex}`)
    for (let contactIndex = 1; contactIndex < contacts.length; contactIndex++) {
      const previous = contacts[contactIndex - 1]
      const current = contacts[contactIndex]
      assert(current.pegRow === (previous.pegRow ?? 0) + 1, `non-adjacent peg row for rows=${rows}, ball=${ballIndex}`)
      assert(Math.abs((current.pegIndex ?? 0) - (previous.pegIndex ?? 0)) <= 1, `impossible horizontal jump for rows=${rows}, ball=${ballIndex}`)
    }
    const finalPoint = getPathPosition(path, 1)
    if (rows >= 16) assert(getPathDuration(path) >= 1800 && getPathDuration(path) <= 2800, `duration outside energetic range for rows=${rows}`)
    const actual = Math.max(0, Math.min(rows, Math.floor(((finalPoint.x - 17) / 66) * (rows + 1))))
    assert(actual === expected, `visual path ended in ${actual}, expected ${expected} for rows=${rows}, ball=${ballIndex}`)
    assert(finalPoint.y >= 84, `visual path did not reach the bucket floor for rows=${rows}, ball=${ballIndex}`)
  }
}

const sameBucketA = generateDecisionPath(12, 6, 1n)
const sameBucketB = generateDecisionPath(12, 6, 2n)
assert(JSON.stringify(sameBucketA) !== JSON.stringify(sameBucketB), "equivalent target paths should vary by seed")

console.log("Plinko trajectory checks passed: every tested bucket/path is deterministic and ends in its authoritative slot.")
