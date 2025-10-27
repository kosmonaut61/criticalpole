"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { generateTrack, type TrackData } from "@/lib/track-generator"
import { Button } from "@/components/ui/button"
import Link from "next/link"

type QualifyingResult = {
  turnNumber: number
  roll: number
}

export default function GamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [track, setTrack] = useState<TrackData | null>(null)
  const [hoveredTurn, setHoveredTurn] = useState<number | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)

  const [isQualifying, setIsQualifying] = useState(false)
  const [qualifyingResults, setQualifyingResults] = useState<QualifyingResult[]>([])
  const [selectedTurn, setSelectedTurn] = useState<number | null>(null)
  const [isRolling, setIsRolling] = useState(false)
  const [currentRoll, setCurrentRoll] = useState<number | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    // Generate track on mount
    const newTrack = generateTrack()
    setTrack(newTrack)
  }, [])

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!track || !canvasRef.current) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const scale = canvas.width * 0.9
    const offsetX = canvas.width * 0.05
    const offsetY = canvas.height * 0.05

    let foundTurn: number | null = null
    for (const turn of track.turns) {
      const turnX = turn.x * scale + offsetX
      const turnY = turn.y * scale + offsetY
      const distance = Math.sqrt((mouseX - turnX) ** 2 + (mouseY - turnY) ** 2)

      if (distance < 18) {
        foundTurn = turn.turnNumber!
        setTooltipPos({ x: e.clientX, y: e.clientY })
        break
      }
    }

    setHoveredTurn(foundTurn)
  }

  const handleMouseLeave = () => {
    setHoveredTurn(null)
    setTooltipPos(null)
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isQualifying || !track || !canvasRef.current) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const scale = canvas.width * 0.9
    const offsetX = canvas.width * 0.05
    const offsetY = canvas.height * 0.05

    for (const turn of track.turns) {
      const turnX = turn.x * scale + offsetX
      const turnY = turn.y * scale + offsetY
      const distance = Math.sqrt((mouseX - turnX) ** 2 + (mouseY - turnY) ** 2)

      if (distance < 18) {
        setSelectedTurn(turn.turnNumber!)
        setCurrentRoll(null)
        break
      }
    }
  }

  useEffect(() => {
    if (!track || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const maxSize = 672 // max-w-2xl in pixels
    const size = Math.min(window.innerWidth - 32, window.innerHeight - 200, maxSize)
    canvas.width = size
    canvas.height = size

    setContainerWidth(size + 8)

    // Clear canvas with light blue background
    ctx.fillStyle = "#bfdac7"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw track
    const points = track.controlPoints
    const scale = canvas.width * 0.9
    const offsetX = canvas.width * 0.05
    const offsetY = canvas.height * 0.05

    // Draw track outline (wider)
    ctx.strokeStyle = "#170f08"
    ctx.lineWidth = 40
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.beginPath()

    points.forEach((point, i) => {
      const x = point.x * scale + offsetX
      const y = point.y * scale + offsetY
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })

    ctx.stroke()

    // Draw inner track (lighter to show road)
    ctx.strokeStyle = "#2a2520"
    ctx.lineWidth = 30
    ctx.beginPath()

    points.forEach((point, i) => {
      const x = point.x * scale + offsetX
      const y = point.y * scale + offsetY
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })

    ctx.stroke()

    track.turns.forEach((turn) => {
      const turnX = turn.x * scale + offsetX
      const turnY = turn.y * scale + offsetY
      const isHovered = hoveredTurn === turn.turnNumber
      const qualifyingResult = qualifyingResults.find((r) => r.turnNumber === turn.turnNumber)

      ctx.fillStyle = "#170f08"
      ctx.beginPath()
      ctx.arc(turnX, turnY, isHovered ? 16 : 14, 0, Math.PI * 2)
      ctx.fill()

      // Determine color based on qualifying result
      let fillColor = "#fcf2e9" // default beige (not qualified)
      if (qualifyingResult) {
        // Color code based on roll: 15-20 = purple (excellent), 10-14 = yellow (good), 5-9 = orange (medium), 1-4 = red-ish
        if (qualifyingResult.roll >= 15) {
          fillColor = "#4400d8" // purple - excellent
        } else if (qualifyingResult.roll >= 10) {
          fillColor = "#e7ff57" // yellow - good
        } else if (qualifyingResult.roll >= 5) {
          fillColor = "#de4f14" // orange - medium
        } else {
          fillColor = "#8B0000" // dark red - poor
        }
      } else if (isHovered && isQualifying) {
        fillColor = "#e7ff57" // yellow for hover during qualifying
      } else if (isHovered) {
        fillColor = "#e7ff57" // yellow for hover
      }

      ctx.fillStyle = fillColor
      ctx.beginPath()
      ctx.arc(turnX, turnY, isHovered ? 14 : 12, 0, Math.PI * 2)
      ctx.fill()

      if (qualifyingResult) {
        ctx.fillStyle = "#170f08"
        ctx.font = "bold 16px monospace"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(qualifyingResult.roll.toString(), turnX, turnY)
      }
    })

    // Draw start/finish line
    const startPoint = points[0]
    const secondPoint = points[1]
    const startX = startPoint.x * scale + offsetX
    const startY = startPoint.y * scale + offsetY

    // Calculate perpendicular for start line
    const dx = secondPoint.x - startPoint.x
    const dy = secondPoint.y - startPoint.y
    const len = Math.sqrt(dx * dx + dy * dy)
    const perpX = -dy / len
    const perpY = dx / len

    ctx.strokeStyle = "#fcf2e9"
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(startX + perpX * 15, startY + perpY * 15)
    ctx.lineTo(startX - perpX * 15, startY - perpY * 15)
    ctx.stroke()

    // Draw start position marker
    ctx.fillStyle = "#de4f14"
    ctx.beginPath()
    ctx.arc(startX, startY, 8, 0, Math.PI * 2)
    ctx.fill()
  }, [track, hoveredTurn, isQualifying, qualifyingResults])

  const handleNewTrack = () => {
    const newTrack = generateTrack()
    setTrack(newTrack)
    setHoveredTurn(null)
    setTooltipPos(null)
    setIsQualifying(false)
    setQualifyingResults([])
    setSelectedTurn(null)
  }

  const handleStartQualifying = () => {
    setIsQualifying(true)
    setQualifyingResults([])
    setSelectedTurn(null)
  }

  const handleRollDice = () => {
    if (!selectedTurn || isRolling) return

    setIsRolling(true)
    setCurrentRoll(null)

    // Simulate dice rolling animation
    let rollCount = 0
    const rollInterval = setInterval(() => {
      setCurrentRoll(Math.floor(Math.random() * 20) + 1)
      rollCount++
      if (rollCount >= 10) {
        clearInterval(rollInterval)
        // Final roll
        const finalRoll = Math.floor(Math.random() * 20) + 1
        setCurrentRoll(finalRoll)

        // Save result
        setTimeout(() => {
          setQualifyingResults((prev) => {
            // Remove existing result for this turn if any
            const filtered = prev.filter((r) => r.turnNumber !== selectedTurn)
            return [...filtered, { turnNumber: selectedTurn, roll: finalRoll }].sort(
              (a, b) => a.turnNumber - b.turnNumber,
            )
          })
          setSelectedTurn(null)
          setIsRolling(false)
        }, 1000)
      }
    }, 100)
  }

  const handleExitQualifying = () => {
    setIsQualifying(false)
    setQualifyingResults([])
    setSelectedTurn(null)
  }

  const totalScore = qualifyingResults.reduce((sum, result) => sum + result.roll, 0)
  const bestTurn =
    qualifyingResults.length > 0
      ? qualifyingResults.reduce((best, current) => (current.roll > best.roll ? current : best))
      : null
  const worstTurn =
    qualifyingResults.length > 0
      ? qualifyingResults.reduce((worst, current) => (current.roll < worst.roll ? current : worst))
      : null
  const averageRoll = qualifyingResults.length > 0 ? (totalScore / qualifyingResults.length).toFixed(2) : 0
  const allTurnsQualified = track && qualifyingResults.length === track.turns.length

  return (
    <main className="min-h-screen bg-[#bfdac7] p-4 flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-4 w-full max-w-4xl">
        <div className="relative w-full flex flex-col items-center">
          {isQualifying && track && (
            <div
              className="bg-[#170f08] text-[#fcf2e9] p-4 rounded-t-lg border-4 border-b-0 border-[#170f08]"
              style={{ width: containerWidth > 0 ? `${containerWidth}px` : "auto" }}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-bold">QUALIFYING MODE</span>
                  <span className="text-[#fcf2e9]/60 ml-3">
                    {qualifyingResults.length} / {track.turns.length} turns
                  </span>
                </div>

                {qualifyingResults.length > 0 && (
                  <div className="text-right">
                    <div className="text-xs text-[#fcf2e9]/60">Total Score</div>
                    <div className="text-xl font-bold text-[#e7ff57]">{totalScore}</div>
                  </div>
                )}
              </div>

              {allTurnsQualified && (
                <div className="mt-3 pt-3 border-t border-[#fcf2e9]/20 grid grid-cols-3 gap-3 text-center text-xs">
                  <div>
                    <div className="text-[#fcf2e9]/60">Average</div>
                    <div className="font-bold text-lg">{averageRoll}</div>
                  </div>
                  {bestTurn && (
                    <div>
                      <div className="text-[#fcf2e9]/60">Best</div>
                      <div className="font-bold text-lg text-[#4400d8]">
                        T{bestTurn.turnNumber}: {bestTurn.roll}
                      </div>
                    </div>
                  )}
                  {worstTurn && (
                    <div>
                      <div className="text-[#fcf2e9]/60">Worst</div>
                      <div className="font-bold text-lg text-[#de4f14]">
                        T{worstTurn.turnNumber}: {worstTurn.roll}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {!isQualifying && (
            <div className="mb-4 flex gap-3">
              <Link href="/">
                <Button
                  variant="outline"
                  className="border-[#170f08] text-[#170f08] hover:bg-[#170f08]/10 font-semibold bg-transparent"
                >
                  BACK TO MENU
                </Button>
              </Link>
              <Button
                onClick={handleNewTrack}
                className="bg-[#170f08] hover:bg-[#170f08]/90 text-[#fcf2e9] font-semibold"
              >
                NEW TRACK
              </Button>
              <Button
                onClick={handleStartQualifying}
                className="bg-[#170f08] hover:bg-[#170f08]/90 text-[#fcf2e9] font-semibold"
                disabled={!track}
              >
                START QUALIFYING
              </Button>
            </div>
          )}

          <canvas
            ref={canvasRef}
            className={`border-4 border-[#170f08] shadow-lg cursor-pointer ${isQualifying ? "" : "rounded-lg"}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={handleCanvasClick}
          />

          {isQualifying && track && (
            <div
              className="bg-[#170f08] text-[#fcf2e9] p-4 rounded-b-lg border-4 border-t-0 border-[#170f08]"
              style={{ width: containerWidth > 0 ? `${containerWidth}px` : "auto" }}
            >
              <div className="flex justify-between items-center">
                <Link href="/">
                  <Button
                    variant="outline"
                    className="border-[#fcf2e9] text-[#fcf2e9] hover:bg-[#fcf2e9]/10 font-semibold bg-transparent"
                  >
                    BACK TO MENU
                  </Button>
                </Link>
                <Button
                  onClick={handleExitQualifying}
                  className="bg-[#de4f14] hover:bg-[#de4f14]/90 text-[#fcf2e9] font-semibold"
                >
                  EXIT QUALIFYING
                </Button>
              </div>
            </div>
          )}

          {hoveredTurn !== null && tooltipPos && (
            <div
              className="fixed bg-[#170f08] text-[#fcf2e9] px-3 py-2 rounded-md text-sm font-semibold pointer-events-none z-50 shadow-lg"
              style={{
                left: tooltipPos.x + 15,
                top: tooltipPos.y - 10,
              }}
            >
              Turn {hoveredTurn}
              {isQualifying && (
                <div className="text-xs text-[#fcf2e9]/60">
                  {qualifyingResults.find((r) => r.turnNumber === hoveredTurn)
                    ? "Click to re-qualify"
                    : "Click to qualify"}
                </div>
              )}
            </div>
          )}
        </div>

        {selectedTurn !== null && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#170f08] text-[#fcf2e9] p-8 rounded-lg shadow-2xl max-w-sm w-full mx-4">
              <h3 className="text-2xl font-bold text-center mb-4">Turn {selectedTurn}</h3>
              {currentRoll !== null ? (
                <div className="text-center">
                  <div className="text-6xl font-bold text-[#e7ff57] mb-4">{currentRoll}</div>
                  {!isRolling && <div className="text-sm text-[#fcf2e9]/60">Saving result...</div>}
                </div>
              ) : (
                <div className="text-center">
                  <Button
                    onClick={handleRollDice}
                    disabled={isRolling}
                    className="bg-[#de4f14] hover:bg-[#de4f14]/90 text-[#fcf2e9] font-bold text-xl px-8 py-6 mb-4"
                  >
                    {isRolling ? "ROLLING..." : "ROLL D20"}
                  </Button>
                  <Button
                    onClick={() => setSelectedTurn(null)}
                    variant="outline"
                    className="border-[#fcf2e9] text-[#fcf2e9] hover:bg-[#fcf2e9]/10 w-full"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
