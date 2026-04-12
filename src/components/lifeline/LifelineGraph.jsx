import { useEffect, useRef, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  CURRENT_YEAR,
  eventScore,
  formatTimeLabel,
} from '@/lib/lifelineStore'

// LifelineGraph — ported near-verbatim from lifeline.ourchapteros.com.
// The pure label-placement algorithm is the heart of this file: it
// processes dots left-to-right, tries 24 unrotated + 32 rotated
// candidate placements per label, and picks the best-scoring one
// against the SVG viewport, chart inner area, and already-placed
// neighbours. Three relaxation passes clean up any overlaps the
// greedy pass left behind.
//
// Props:
//   events       — array of LifeEvent (camelCase, from the store)
//   birthYear    — current member's birth year (for age-event placement)
//   onEventClick — called with the LifeEvent when a dot is clicked
//
// Inline SVG colors stay as hex literals because putting CSS variable
// references inside SVG `fill`/`stroke` attributes is noisy; they match
// the lifeline-* palette exactly.

// ─── Constants ────────────────────────────────────────────────

const CHART_MARGIN = { top: 58, right: 44, left: 48, bottom: 68 }
const CHART_ASPECT = 16 / 7
const MIN_GAP = 26 // minimum clearance (px) between any two label AABBs

// charW = average px-per-character for serif text at the given fontSize.
// Sized generously so the background rect always fits the text.
const LABEL_NORMAL = { fontSize: 9, maxChars: 26, charW: 5.6, pad: 8, h: 11 }
const LABEL_DENSE = { fontSize: 8, maxChars: 21, charW: 5.0, pad: 7, h: 10 }

// Candidate distances from dot center to label center (px)
const DISTANCES = [46, 68, 94]

// Rotation options tried only when non-rotated placement still overlaps
const ROTATIONS = [38, -38, 52, -52]
// Extra base penalty so rotated candidates only win when clearly better
const ROTATION_PENALTY = 28

// 8 candidate directions: up, up-left, up-right, left, right,
// down-left, down-right, down.
const ALL_ANGLES = (() => {
  const P = Math.PI
  return [-P / 2, (-P * 3) / 4, -P / 4, -P, 0, P / 4, (P * 3) / 4, P / 2]
})()

// ─── Math helpers ─────────────────────────────────────────────

/** Minimum angular distance between two angles, in [0, π]. */
function angleDiff(a, b) {
  let d = Math.abs(a - b) % (2 * Math.PI)
  if (d > Math.PI) d = 2 * Math.PI - d
  return d
}

/**
 * Returns ALL_ANGLES sorted by preference for this dot:
 *   1. If nearby dots exist, place the label AWAY from their weighted
 *      centroid so it's clearly associated with its own dot.
 *   2. Fallback (no neighbours): valence default (positive=up, negative=down).
 */
function contextAwareAngles(cx, cy, isPositive, nearbyDots) {
  const P = Math.PI
  const valenceDefault = isPositive ? -P / 2 : P / 2 // up or down

  let awayAngle = null

  if (nearbyDots.length > 0) {
    let sumX = 0
    let sumY = 0
    let sumW = 0
    for (const [nx, ny] of nearbyDots) {
      const d = Math.sqrt((nx - cx) ** 2 + (ny - cy) ** 2)
      if (d < 1) continue
      const w = 1 / d
      sumX += nx * w
      sumY += ny * w
      sumW += w
    }
    if (sumW > 0) {
      awayAngle = Math.atan2(cy - sumY / sumW, cx - sumX / sumW)
    }
  }

  const primary = awayAngle ?? valenceDefault
  return [...ALL_ANGLES].sort((a, b) => {
    const pa = angleDiff(a, primary)
    const pb = angleDiff(b, primary)
    if (Math.abs(pa - pb) > 0.01) return pa - pb
    return angleDiff(a, valenceDefault) - angleDiff(b, valenceDefault)
  })
}

/** Axis-aligned bounding box for a (possibly rotated) label. */
function aabbOf(lcx, lcy, w, h, rotDeg) {
  if (rotDeg === 0) return { x: lcx - w / 2, y: lcy - h / 2, w, h }
  const rad = (Math.abs(rotDeg) * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const aw = w * cos + h * sin
  const ah = w * sin + h * cos
  return { x: lcx - aw / 2, y: lcy - ah / 2, w: aw, h: ah }
}

function overlapArea(a, b) {
  const ox = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x))
  const oy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))
  return ox * oy
}

function gap(a, b) {
  const dx = Math.max(
    0,
    Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w)
  )
  const dy = Math.max(
    0,
    Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h)
  )
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Score a candidate label placement. Lower = better.
 *
 * Boundary strategy:
 *  - HARD limit is the full SVG viewport: going outside means the
 *    label is physically clipped, so the penalty is huge (×120/px).
 *  - SOFT limit is the inner chart area (inside axis margins).
 *    Going into axis-margin zones is tolerated with small penalties.
 */
function scoreAABB(aabb, others, bounds) {
  let s = 0

  // Hard: off-viewport penalty
  const overL = Math.max(0, bounds.svgL - aabb.x)
  const overR = Math.max(0, aabb.x + aabb.w - bounds.svgR)
  const overT = Math.max(0, bounds.svgT - aabb.y)
  const overB = Math.max(0, aabb.y + aabb.h - bounds.svgB)
  s += (overL + overR + overT + overB) * 120

  // Soft: prefer staying inside the inner chart area
  if (aabb.x < bounds.softL) s += (bounds.softL - aabb.x) * 0.8
  if (aabb.x + aabb.w > bounds.softR) s += (aabb.x + aabb.w - bounds.softR) * 0.8
  if (aabb.y + aabb.h > bounds.softB) s += (aabb.y + aabb.h - bounds.softB) * 1.5

  // Per-neighbour overlap + proximity
  for (const o of others) {
    s += overlapArea(aabb, o) * 55
    const g = gap(aabb, o)
    if (g < MIN_GAP) s += (MIN_GAP - g) * 14
  }
  return s
}

// ─── Core label placement algorithm ───────────────────────────

function computeLabelPositions(points, containerWidth, xDomain) {
  const innerW = containerWidth - CHART_MARGIN.left - CHART_MARGIN.right
  const innerH =
    containerWidth / CHART_ASPECT - CHART_MARGIN.top - CHART_MARGIN.bottom
  const totalH = containerWidth / CHART_ASPECT
  const xRange = xDomain[1] - xDomain[0]

  function toPx(year, score) {
    const px = ((year - xDomain[0]) / xRange) * innerW + CHART_MARGIN.left
    const py = ((5.5 - score) / 11) * innerH + CHART_MARGIN.top
    return [px, py]
  }

  const bounds = {
    svgL: 0,
    svgR: containerWidth,
    svgT: 0,
    svgB: totalH,
    softL: CHART_MARGIN.left,
    softR: containerWidth - CHART_MARGIN.right,
    softB: totalH - CHART_MARGIN.bottom + 20,
  }

  // ── Density detection ────────────────────────────────────
  // A point is "dense" if it has ≥2 neighbours within ±5 years.
  const dotPx = points.map((p) => toPx(p.year, p.score))
  const isDense = points.map((p, i) => {
    let n = 0
    for (let j = 0; j < points.length; j += 1) {
      if (i !== j && Math.abs(points[j].year - p.year) <= 5) n += 1
    }
    return n >= 2
  })

  // ── Label text & dimensions ──────────────────────────────
  const infos = points.map((p, i) => {
    const cfg = isDense[i] ? LABEL_DENSE : LABEL_NORMAL
    const text =
      p.displayLabel.length > cfg.maxChars
        ? p.displayLabel.slice(0, cfg.maxChars - 1) + '…'
        : p.displayLabel
    const labelW = Math.round(text.length * cfg.charW + cfg.pad)
    return { text, labelW, labelH: cfg.h, fontSize: cfg.fontSize }
  })

  // ── Candidate generation ─────────────────────────────────
  function candidates(i) {
    const [cx, cy] = dotPx[i]
    const { labelW, labelH } = infos[i]
    const isPositive = points[i].event.valence === 'positive'
    const nearbyDots = dotPx.filter((_, j) => {
      if (j === i) return false
      const [ox, oy] = dotPx[j]
      return Math.sqrt((ox - cx) ** 2 + (oy - cy) ** 2) < 150
    })
    const angles = contextAwareAngles(cx, cy, isPositive, nearbyDots)
    const result = []

    // Non-rotated: 8 angles × 3 distances = 24 candidates
    for (let di = 0; di < DISTANCES.length; di += 1) {
      const dist = DISTANCES[di]
      for (let ai = 0; ai < angles.length; ai += 1) {
        const angle = angles[ai]
        const lcx = cx + Math.cos(angle) * dist
        const lcy = cy + Math.sin(angle) * dist
        result.push({
          aabb: aabbOf(lcx, lcy, labelW, labelH, 0),
          angle,
          dist,
          rotation: 0,
          basePenalty: ai * 1.6 + di * 0.5,
        })
      }
    }

    // Rotated: top-4 preferred angles × last-2 distances × 4 rotations = 32
    for (let di = 1; di < DISTANCES.length; di += 1) {
      const dist = DISTANCES[di]
      for (let ai = 0; ai < 4; ai += 1) {
        const angle = angles[ai]
        const lcx = cx + Math.cos(angle) * dist
        const lcy = cy + Math.sin(angle) * dist
        for (const rotation of ROTATIONS) {
          result.push({
            aabb: aabbOf(lcx, lcy, labelW, labelH, rotation),
            angle,
            dist,
            rotation,
            basePenalty: ROTATION_PENALTY + ai * 1 + di * 0.5,
          })
        }
      }
    }

    // Ambiguity penalty: the label centre must be closer to its own dot
    // than to any other. Otherwise the label visually belongs to the
    // wrong neighbour.
    for (const c of result) {
      const lcx = cx + Math.cos(c.angle) * c.dist
      const lcy = cy + Math.sin(c.angle) * c.dist
      for (let j = 0; j < points.length; j += 1) {
        if (j === i) continue
        const [ox, oy] = dotPx[j]
        const dOther = Math.sqrt((lcx - ox) ** 2 + (lcy - oy) ** 2)
        if (dOther < c.dist) {
          c.basePenalty += (c.dist - dOther) * 0.5
        } else if (dOther < c.dist * 1.4) {
          c.basePenalty += (c.dist * 1.4 - dOther) * 0.12
        }
      }
    }

    return result
  }

  // Process dots left-to-right so left-edge labels don't crowd right-edge.
  const order = [...points.keys()].sort((a, b) => dotPx[a][0] - dotPx[b][0])
  const placements = new Array(points.length).fill(null)

  function pickBest(i, others) {
    const { text, labelW, labelH, fontSize } = infos[i]
    const cands = candidates(i)
    let best = null
    let bestS = Infinity
    for (const c of cands) {
      const s = scoreAABB(c.aabb, others, bounds) + c.basePenalty
      if (s < bestS) {
        bestS = s
        best = {
          angle: c.angle,
          dist: c.dist,
          labelText: text,
          labelW,
          labelH,
          fontSize,
          rotation: c.rotation,
          aabb: c.aabb,
        }
      }
    }
    // Guaranteed fallback so every dot gets some label, even in pathological edges.
    if (!best) {
      const c = cands[0]
      best = {
        angle: c.angle,
        dist: c.dist,
        labelText: text,
        labelW,
        labelH,
        fontSize,
        rotation: c.rotation,
        aabb: c.aabb,
      }
    }
    return best
  }

  // Initial greedy pass
  for (const i of order) {
    const others = order
      .filter((j) => placements[j] !== null)
      .map((j) => placements[j].aabb)
    placements[i] = pickBest(i, others)
  }

  // Relaxation: 3 passes. Re-place each dot against its current neighbours
  // if that strictly improves the score.
  for (let pass = 0; pass < 3; pass += 1) {
    for (const i of order) {
      const others = order
        .filter((j) => j !== i && placements[j] !== null)
        .map((j) => placements[j].aabb)
      const curScore = scoreAABB(placements[i].aabb, others, bounds)
      if (curScore > 0.5) {
        const candidate = pickBest(i, others)
        const newScore = scoreAABB(candidate.aabb, others, bounds)
        if (newScore < curScore - 0.5) {
          placements[i] = candidate
        }
      }
    }
  }

  const result = new Map()
  for (let i = 0; i < points.length; i += 1) {
    if (placements[i]) result.set(points[i].event.id, placements[i])
  }
  return result
}

// ─── Custom dot + leader line + label ─────────────────────────

function CustomDot({ cx, cy, payload, onEventClick, labelGeom }) {
  if (!payload || cx === undefined || cy === undefined || !labelGeom) return null

  const isPositive = payload.event.valence === 'positive'
  const r = 5 + payload.event.intensity * 1.5
  const fill = isPositive ? '#1a5c3a' : '#7d1e1e'
  const ring = isPositive ? '#a8d5b5' : '#f5b8b8'

  const { angle, dist, labelText, labelW, labelH, fontSize, rotation } = labelGeom
  const lcx = cx + Math.cos(angle) * dist
  const lcy = cy + Math.sin(angle) * dist

  // Leader line from the dot edge to just before the label box
  const leaderStart = r + 5
  const halfBox =
    rotation !== 0
      ? Math.sqrt((labelW / 2) ** 2 + (labelH / 2) ** 2)
      : Math.max(labelW / 2, labelH / 2)
  const leaderEnd = Math.max(leaderStart + 6, dist - halfBox - 4)
  const lx1 = cx + Math.cos(angle) * leaderStart
  const ly1 = cy + Math.sin(angle) * leaderStart
  const lx2 = cx + Math.cos(angle) * leaderEnd
  const ly2 = cy + Math.sin(angle) * leaderEnd

  // SVG text baseline correction — shift text ~2px up inside the rect
  const textY = lcy + labelH / 2 - 2

  return (
    <g
      onClick={() => onEventClick(payload.event)}
      style={{ cursor: 'pointer' }}
    >
      {/* Outer ring */}
      <circle cx={cx} cy={cy} r={r + 4} fill={ring} opacity={0.45} />
      {/* Main dot */}
      <circle cx={cx} cy={cy} r={r} fill={fill} />
      {/* Centre accent */}
      <circle cx={cx} cy={cy} r={r * 0.35} fill="white" opacity={0.6} />

      {/* Leader line */}
      <line
        x1={lx1}
        y1={ly1}
        x2={lx2}
        y2={ly2}
        stroke={fill}
        strokeWidth={1.5}
        strokeOpacity={0.6}
        strokeDasharray="2 2"
      />

      {/* Label */}
      <g
        transform={
          rotation !== 0 ? `rotate(${rotation},${lcx},${lcy})` : undefined
        }
      >
        <rect
          x={lcx - labelW / 2}
          y={lcy - labelH / 2}
          width={labelW}
          height={labelH}
          fill="rgba(246,241,233,0.90)"
          rx={2}
        />
        <text
          x={lcx}
          y={textY}
          textAnchor="middle"
          fill="#1a1714"
          fontSize={fontSize}
          fontFamily="var(--font-lifeline-body)"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          <title>{payload.event.title}</title>
          {labelText}
        </text>
      </g>
    </g>
  )
}

// ─── Tooltip ──────────────────────────────────────────────────

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  const isPositive = point.event.valence === 'positive'
  return (
    <div className="bg-lifeline-card border border-lifeline-border rounded shadow-lifeline-card px-3 py-2 max-w-[200px]">
      <p className="font-lifeline-body text-xs text-lifeline-ink-muted mb-0.5">
        {formatTimeLabel(point.event.timeType, point.event.timeValue)}
        {' · '}
        <span
          className={
            isPositive ? 'text-lifeline-positive' : 'text-lifeline-negative'
          }
        >
          {isPositive ? '+' : ''}
          {point.score}
        </span>
      </p>
      <p className="font-lifeline-body text-sm text-lifeline-ink leading-snug">
        {point.event.title}
      </p>
      <p className="font-lifeline-body text-xs text-lifeline-ink-muted mt-1 italic">
        Click to read more
      </p>
    </div>
  )
}

// ─── Y-axis tick ──────────────────────────────────────────────

function YAxisTick({ x, y, payload }) {
  if (!payload || x === undefined || y === undefined) return null
  const v = payload.value
  return (
    <text
      x={x}
      y={y}
      textAnchor="end"
      fill={v === 0 ? '#b8b0a6' : v > 0 ? '#1a5c3a' : '#7d1e1e'}
      fontSize={10}
      fontFamily="var(--font-lifeline-mono)"
      dy={4}
    >
      {v > 0 ? `+${v}` : v}
    </text>
  )
}

// ─── Main component ───────────────────────────────────────────

export function LifelineGraph({ events, birthYear, onEventClick }) {
  const containerRef = useRef(null)
  const [containerWidth, setContainerWidth] = useState(900)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return undefined
    setContainerWidth(el.offsetWidth)
    const ro = new ResizeObserver(([entry]) =>
      setContainerWidth(entry.contentRect.width)
    )
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  if (!events.length) return null

  // Sort by (year ASC, sortOrder ASC, createdAt ASC)
  const sorted = [...events].sort((a, b) => {
    if (a.computedYear !== b.computedYear) {
      return a.computedYear - b.computedYear
    }
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  // Spread same-year events along X so they don't stack
  const MAX_SPREAD = 0.75
  const yearGroups = new Map()
  for (const e of sorted) {
    yearGroups.set(e.computedYear, (yearGroups.get(e.computedYear) ?? 0) + 1)
  }
  const yearCounters = new Map()

  const chartData = sorted.map((event) => {
    const count = yearGroups.get(event.computedYear) ?? 1
    const idx = yearCounters.get(event.computedYear) ?? 0
    yearCounters.set(event.computedYear, idx + 1)

    let xYear = event.computedYear
    if (count > 1) {
      const spread = Math.min(MAX_SPREAD, (count - 1) * 0.4)
      xYear = event.computedYear + (idx / (count - 1) - 0.5) * spread
    }
    return {
      year: xYear,
      score: eventScore(event.valence, event.intensity),
      event,
      displayLabel: event.title,
    }
  })

  const minYear = Math.min(birthYear, sorted[0].computedYear)
  const maxYear = Math.max(
    CURRENT_YEAR,
    sorted[sorted.length - 1].computedYear
  )
  const xPad = Math.max(2, Math.round((maxYear - minYear) * 0.04))
  const xDomain = [minYear - xPad, maxYear + xPad]

  const tickInterval = maxYear - birthYear > 60 ? 10 : 5
  const xTicks = []
  for (
    let y = Math.ceil(xDomain[0] / tickInterval) * tickInterval;
    y <= xDomain[1];
    y += tickInterval
  ) {
    xTicks.push(y)
  }

  const labelPlacements = computeLabelPositions(
    chartData,
    containerWidth,
    xDomain
  )

  return (
    <div ref={containerRef} className="relative w-full">
      {/* HIGH / LOW labels pinned to the left gutter */}
      <div className="absolute left-0 top-0 bottom-10 w-8 flex flex-col justify-between items-end pr-1 pointer-events-none print:hidden">
        <span className="font-lifeline-mono text-[9px] text-lifeline-positive/60 tracking-widest">
          HIGH
        </span>
        <span className="font-lifeline-mono text-[9px] text-lifeline-negative/60 tracking-widest">
          LOW
        </span>
      </div>

      <ResponsiveContainer width="100%" aspect={CHART_ASPECT}>
        <LineChart data={chartData} margin={CHART_MARGIN}>
          <ReferenceArea y1={0} y2={5.5} fill="#1a5c3a" fillOpacity={0.04} />
          <ReferenceArea y1={-5.5} y2={0} fill="#7d1e1e" fillOpacity={0.04} />

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#dfd8cc"
            vertical={false}
            strokeOpacity={0.7}
          />

          <XAxis
            dataKey="year"
            type="number"
            domain={xDomain}
            ticks={xTicks}
            tick={{
              fontFamily: 'var(--font-lifeline-mono)',
              fontSize: 11,
              fill: '#857d74',
            }}
            axisLine={{ stroke: '#dfd8cc' }}
            tickLine={false}
            tickMargin={8}
          />
          <YAxis
            domain={[-5.5, 5.5]}
            ticks={[-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5]}
            tick={<YAxisTick />}
            axisLine={false}
            tickLine={false}
            width={36}
          />

          <ReferenceLine
            y={0}
            stroke="#dfd8cc"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
          <ReferenceLine
            x={birthYear}
            stroke="#dfd8cc"
            strokeWidth={1}
            label={{
              value: 'born',
              position: 'insideTopRight',
              fill: '#b8b0a6',
              fontSize: 9,
              fontFamily: 'var(--font-lifeline-mono)',
            }}
          />

          <Tooltip content={<CustomTooltip />} />

          <Line
            type="monotoneX"
            dataKey="score"
            stroke="#c84b0c"
            strokeWidth={2.5}
            dot={(dotProps) => (
              <CustomDot
                key={`dot-${dotProps.index}`}
                {...dotProps}
                onEventClick={onEventClick}
                labelGeom={labelPlacements.get(dotProps.payload?.event?.id)}
              />
            )}
            activeDot={false}
            isAnimationActive
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
