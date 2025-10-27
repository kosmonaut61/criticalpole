export type SegmentType = "straight" | "corner" | "chicane" | "s_curve"
export type SegmentLength = "S" | "M" | "L"
export type CornerSeverity = "mild" | "medium" | "hard"
export type Direction = "L" | "R"

export interface TrackSegment {
  type: SegmentType
  len: SegmentLength
  severity?: CornerSeverity
  dir?: Direction
  hasPitLane?: boolean
  hasDRS?: boolean
  isOvertakeCorner?: boolean
}

export interface ControlPoint {
  x: number
  y: number
  turnNumber?: number
}

export interface TrackData {
  segments: TrackSegment[]
  controlPoints: ControlPoint[]
  turns: ControlPoint[]
  metrics: {
    totalCorners: number
    totalStraights: number
    leftCorners: number
    rightCorners: number
    hairpins: number
    chicanes: number
    sweepers: number
    esses: number
  }
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function generateTrack(): TrackData {
  const segments: TrackSegment[] = []

  // Target counts based on spec
  const targetCorners = randomInt(12, 18)
  const targetStraights = randomInt(5, 7)
  const hairpins = randomInt(0, 2)
  const chicanes = randomInt(1, 3)
  const sweepers = randomInt(1, 3)
  const esses = randomInt(0, 2)

  let cornersAdded = 0
  let straightsAdded = 0
  let leftCorners = 0
  let rightCorners = 0
  let hairpinsAdded = 0
  let chicanesAdded = 0
  let sweepersAdded = 0
  let essesAdded = 0

  // Track balance
  let lastDir: Direction | null = null
  let consecutiveCorners = 0

  // Start with a straight
  const firstStraight: TrackSegment = {
    type: "straight",
    len: randomChoice(["M", "L"] as SegmentLength[]),
    hasPitLane: true, // Pit lane on first straight
  }
  segments.push(firstStraight)
  straightsAdded++

  // Build the track
  while (cornersAdded < targetCorners || straightsAdded < targetStraights) {
    const needsCorner = cornersAdded < targetCorners
    const needsStraight = straightsAdded < targetStraights

    if (consecutiveCorners >= 2 && needsStraight) {
      // Add a straight
      const straight: TrackSegment = {
        type: "straight",
        len: randomChoice(["S", "M", "L"] as SegmentLength[]),
      }

      // Maybe add DRS zone
      if (straight.len !== "S" && Math.random() < 0.3) {
        straight.hasDRS = true
      }

      segments.push(straight)
      straightsAdded++
      consecutiveCorners = 0
      continue
    }

    if (needsCorner && Math.random() < 0.7) {
      // Decide what type of corner feature to add
      let segmentToAdd: TrackSegment | null = null
      let cornerIncrement = 1

      // Try to add special features first
      if (essesAdded < esses && Math.random() < 0.3) {
        segmentToAdd = {
          type: "s_curve",
          len: randomChoice(["M", "L"] as SegmentLength[]),
        }
        essesAdded++
        cornersAdded += 2 // S-curve counts as 2 corners
        cornerIncrement = 2 // S-curves add 2 to consecutive counter
      } else if (chicanesAdded < chicanes && Math.random() < 0.3) {
        segmentToAdd = {
          type: "chicane",
          len: "S",
        }
        chicanesAdded++
        cornersAdded += 2 // Chicane counts as 2 corners
        cornerIncrement = 2 // Chicanes add 2 to consecutive counter
      } else if (hairpinsAdded < hairpins && Math.random() < 0.2) {
        // Hairpin
        const dir: Direction = lastDir === "L" ? "R" : "L"
        segmentToAdd = {
          type: "corner",
          len: "S",
          severity: "hard",
          dir,
        }
        hairpinsAdded++
        cornersAdded++
        lastDir = dir
        if (dir === "L") leftCorners++
        else rightCorners++
      } else if (sweepersAdded < sweepers && Math.random() < 0.3) {
        // Sweeper
        const dir: Direction = lastDir === "L" ? "R" : "L"
        segmentToAdd = {
          type: "corner",
          len: randomChoice(["M", "L"] as SegmentLength[]),
          severity: "mild",
          dir,
        }
        sweepersAdded++
        cornersAdded++
        lastDir = dir
        if (dir === "L") leftCorners++
        else rightCorners++
      } else {
        // Regular corner
        const dir: Direction = lastDir === "L" ? "R" : "L"
        segmentToAdd = {
          type: "corner",
          len: randomChoice(["S", "M"] as SegmentLength[]),
          severity: randomChoice(["mild", "medium", "hard"] as CornerSeverity[]),
          dir,
        }
        cornersAdded++
        lastDir = dir
        if (dir === "L") leftCorners++
        else rightCorners++

        // Maybe mark as overtake corner if after a long straight
        if (
          segments.length > 0 &&
          segments[segments.length - 1].type === "straight" &&
          segments[segments.length - 1].len !== "S" &&
          segmentToAdd.severity === "hard"
        ) {
          segmentToAdd.isOvertakeCorner = true
        }
      }

      if (segmentToAdd) {
        segments.push(segmentToAdd)
        consecutiveCorners += cornerIncrement // Use proper increment based on segment type
      }
    } else if (needsStraight) {
      // Add a straight
      const straight: TrackSegment = {
        type: "straight",
        len: randomChoice(["S", "M", "L"] as SegmentLength[]),
      }

      // Maybe add DRS zone
      if (straight.len !== "S" && Math.random() < 0.3) {
        straight.hasDRS = true
      }

      segments.push(straight)
      straightsAdded++
      consecutiveCorners = 0
    }
  }

  // Generate control points for the track
  const { controlPoints, turns } = generateControlPoints(segments)

  return {
    segments,
    controlPoints,
    turns,
    metrics: {
      totalCorners: cornersAdded,
      totalStraights: straightsAdded,
      leftCorners,
      rightCorners,
      hairpins: hairpinsAdded,
      chicanes: chicanesAdded,
      sweepers: sweepersAdded,
      esses: essesAdded,
    },
  }
}

function generateControlPoints(segments: TrackSegment[]): { controlPoints: ControlPoint[]; turns: ControlPoint[] } {
  const points: ControlPoint[] = []

  const centerX = 0.5
  const centerY = 0.5

  // Calculate total segments for angle distribution
  const totalSegments = segments.length
  const anglePerSegment = (Math.PI * 2) / totalSegments

  // Base radius and variation
  const baseRadius = 0.3

  let currentAngle = -Math.PI / 2 // Start at top

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]

    // Determine how many points to add for this segment
    let numPoints = 1
    if (segment.type === "corner") {
      numPoints = segment.severity === "hard" ? 3 : 2
    } else if (segment.type === "chicane") {
      numPoints = 3
    } else if (segment.type === "s_curve") {
      numPoints = 4
    } else if (segment.type === "straight") {
      numPoints = segment.len === "L" ? 2 : 1
    }

    // Calculate radius variation based on segment type
    let radiusModifier = 0
    if (segment.type === "straight") {
      radiusModifier = segment.len === "L" ? 0.12 : segment.len === "M" ? 0.08 : 0.04
    } else if (segment.type === "corner") {
      radiusModifier = segment.severity === "hard" ? -0.08 : segment.severity === "medium" ? -0.04 : 0.02
    }

    for (let j = 0; j < numPoints; j++) {
      const segmentProgress = j / numPoints
      const angle = currentAngle + anglePerSegment * segmentProgress

      // Add some controlled randomness to radius
      const randomRadius = (Math.random() - 0.5) * 0.08
      const radius = baseRadius + radiusModifier + randomRadius

      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius

      points.push({ x, y })
    }

    currentAngle += anglePerSegment
  }

  // Close the loop by adding the first point at the end
  points.push({ ...points[0] })

  const normalizedPoints = normalizeAndCenterPoints(points)

  const turnsWithNumbers = detectTurnsFromAngles(normalizedPoints)

  return { controlPoints: normalizedPoints, turns: turnsWithNumbers }
}

function detectTurnsFromAngles(points: ControlPoint[]): ControlPoint[] {
  const turns: ControlPoint[] = []
  const angleThreshold = 25 // degrees - minimum angle change to be considered a turn
  const minDistanceBetweenTurns = 0.08 // minimum distance between turn markers to avoid clustering

  let turnNumber = 0
  let lastTurnPoint: ControlPoint | null = null

  // Calculate angle between three consecutive points
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const next = points[i + 1]

    // Calculate vectors
    const v1x = curr.x - prev.x
    const v1y = curr.y - prev.y
    const v2x = next.x - curr.x
    const v2y = next.y - curr.y

    // Calculate angles
    const angle1 = Math.atan2(v1y, v1x)
    const angle2 = Math.atan2(v2y, v2x)

    // Calculate angle difference
    let angleDiff = ((angle2 - angle1) * 180) / Math.PI
    // Normalize to [-180, 180]
    while (angleDiff > 180) angleDiff -= 360
    while (angleDiff < -180) angleDiff += 360

    const absAngleDiff = Math.abs(angleDiff)

    // If angle change is significant, mark as turn
    if (absAngleDiff > angleThreshold) {
      // Check distance from last turn to avoid clustering
      if (lastTurnPoint) {
        const dx = curr.x - lastTurnPoint.x
        const dy = curr.y - lastTurnPoint.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < minDistanceBetweenTurns) {
          continue // Skip this turn, too close to previous one
        }
      }

      turnNumber++
      const turnPoint = { ...curr, turnNumber }
      turns.push(turnPoint)
      lastTurnPoint = turnPoint

      // Update the original point with turn number
      points[i].turnNumber = turnNumber
    }
  }

  console.log(`[v0] Detected ${turnNumber} turns based on angle changes`)

  return turns
}

function normalizeAndCenterPoints(points: ControlPoint[]): ControlPoint[] {
  // Find bounds
  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const point of points) {
    minX = Math.min(minX, point.x)
    maxX = Math.max(maxX, point.x)
    minY = Math.min(minY, point.y)
    maxY = Math.max(maxY, point.y)
  }

  // Calculate dimensions
  const width = maxX - minX
  const height = maxY - minY
  const maxDim = Math.max(width, height)

  // Scale to fit in [0.1, 0.9] range with padding
  const scale = 0.8 / maxDim
  const targetWidth = width * scale
  const targetHeight = height * scale

  // Center in the canvas
  const offsetX = (1 - targetWidth) / 2 - minX * scale
  const offsetY = (1 - targetHeight) / 2 - minY * scale

  // Apply transformation
  return points.map((point) => ({
    x: point.x * scale + offsetX,
    y: point.y * scale + offsetY,
    turnNumber: point.turnNumber,
  }))
}
