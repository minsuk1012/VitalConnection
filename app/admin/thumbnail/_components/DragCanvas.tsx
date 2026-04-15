// app/admin/thumbnail/_components/DragCanvas.tsx
'use client'

import { useRef, useState, useCallback } from 'react'
import type { ElementInstance } from '@/lib/thumbnail-element-schema'

interface Props {
  elements:      ElementInstance[]
  frameRef:      React.RefObject<HTMLIFrameElement | null>
  canvasSize:    number   // 실제 표시 크기(px) e.g. 480
  sourceSize:    number   // 원본 크기 e.g. 1080
  onElementMove: (cssTarget: string, x: number, y: number) => void
}

// 스냅 임계값 (source 좌표 기준, px)
const SNAP_THRESHOLD = 8

const ELEMENT_COLORS: Record<string, string> = {
  'brand-ko':    '#6366f1',
  'headline':    '#2563eb',
  'headline-ko': '#7c3aed',
  'subheadline': '#059669',
  'price':       '#db2777',
}
const DEFAULT_COLOR = '#6b7280'

function getColor(cssTarget: string) {
  return ELEMENT_COLORS[cssTarget] ?? DEFAULT_COLOR
}

interface GuideLines {
  x: number | null  // 세로선 (x축 정렬, source 좌표)
  y: number | null  // 가로선 (y축 정렬, source 좌표)
}

export function DragCanvas({ elements, frameRef, canvasSize, sourceSize, onElementMove }: Props) {
  const scale = canvasSize / sourceSize

  const draggingRef = useRef<{
    cssTarget:   string
    startMouseX: number
    startMouseY: number
    startX:      number
    startY:      number
  } | null>(null)

  const [activeTarget,    setActiveTarget]    = useState<string | null>(null)
  const [localPositions,  setLocalPositions]  = useState<Record<string, { x: number; y: number }>>({})
  const [guides,          setGuides]          = useState<GuideLines>({ x: null, y: null })

  const getPos = useCallback((el: ElementInstance) => {
    const local = localPositions[el.cssTarget]
    return {
      x: local?.x ?? (el.props.x as number ?? 0),
      y: local?.y ?? (el.props.y as number ?? 0),
    }
  }, [localPositions])

  /** 현재 드래그 중인 요소를 제외한 나머지 요소들의 x/y 목록 */
  const getOtherPositions = useCallback((activeCssTarget: string) => {
    return elements
      .filter(el => el.cssTarget !== activeCssTarget && el.props.x !== undefined)
      .map(el => getPos(el))
  }, [elements, getPos])

  /** 스냅 검사: rawX/rawY에 가장 가까운 가이드가 있으면 스냅, 없으면 그대로 */
  const computeSnap = useCallback((rawX: number, rawY: number, activeCssTarget: string) => {
    const others = getOtherPositions(activeCssTarget)
    let snappedX = rawX
    let snappedY = rawY
    let guideX: number | null = null
    let guideY: number | null = null

    for (const other of others) {
      if (guideX === null && Math.abs(rawX - other.x) <= SNAP_THRESHOLD) {
        snappedX = other.x
        guideX   = other.x
      }
      if (guideY === null && Math.abs(rawY - other.y) <= SNAP_THRESHOLD) {
        snappedY = other.y
        guideY   = other.y
      }
    }

    return { snappedX, snappedY, guideX, guideY }
  }, [getOtherPositions])

  const handleMouseDown = useCallback((e: React.MouseEvent, el: ElementInstance) => {
    e.preventDefault()
    e.stopPropagation()
    const pos = getPos(el)
    draggingRef.current = {
      cssTarget:   el.cssTarget,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX:      pos.x,
      startY:      pos.y,
    }
    setActiveTarget(el.cssTarget)
    setGuides({ x: null, y: null })
  }, [getPos])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const d = draggingRef.current
    if (!d) return

    const rawX = Math.round(Math.max(0, Math.min(sourceSize, d.startX + (e.clientX - d.startMouseX) / scale)))
    const rawY = Math.round(Math.max(0, Math.min(sourceSize, d.startY + (e.clientY - d.startMouseY) / scale)))

    const { snappedX, snappedY, guideX, guideY } = computeSnap(rawX, rawY, d.cssTarget)

    // iframe CSS 변수 즉시 주입
    try {
      const root = frameRef.current?.contentDocument?.documentElement
      if (root) {
        root.style.setProperty(`--${d.cssTarget}-x`, `${snappedX}px`)
        root.style.setProperty(`--${d.cssTarget}-y`, `${snappedY}px`)
      }
    } catch { /* cross-origin 무시 */ }

    setLocalPositions(prev => ({ ...prev, [d.cssTarget]: { x: snappedX, y: snappedY } }))
    setGuides({ x: guideX, y: guideY })
  }, [scale, sourceSize, frameRef, computeSnap])

  const handleMouseUp = useCallback(() => {
    const d = draggingRef.current
    if (!d) return
    const local = localPositions[d.cssTarget]
    if (local) onElementMove(d.cssTarget, local.x, local.y)
    draggingRef.current = null
    setActiveTarget(null)
    setGuides({ x: null, y: null })
  }, [localPositions, onElementMove])

  const positionedEls = elements.filter(el =>
    el.props.x !== undefined && el.props.y !== undefined
  )
  if (positionedEls.length === 0) return null

  return (
    <div
      className="absolute inset-0 z-10"
      style={{ cursor: activeTarget ? 'grabbing' : 'default', userSelect: 'none' }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* ── 정렬 가이드선 ── */}
      {guides.x !== null && (
        <div style={{
          position:   'absolute',
          left:       guides.x * scale,
          top:        0,
          width:      1,
          height:     '100%',
          background: '#3b82f6',
          opacity:    0.8,
          pointerEvents: 'none',
          zIndex:     30,
          boxShadow:  '0 0 3px rgba(59,130,246,0.6)',
        }} />
      )}
      {guides.y !== null && (
        <div style={{
          position:   'absolute',
          left:       0,
          top:        guides.y * scale,
          width:      '100%',
          height:     1,
          background: '#3b82f6',
          opacity:    0.8,
          pointerEvents: 'none',
          zIndex:     30,
          boxShadow:  '0 0 3px rgba(59,130,246,0.6)',
        }} />
      )}

      {/* ── 드래그 핸들 ── */}
      {positionedEls.map(el => {
        const { x, y } = getPos(el)
        const isActive = activeTarget === el.cssTarget
        const color    = getColor(el.cssTarget)

        return (
          <div
            key={el.cssTarget}
            style={{
              position:  'absolute',
              left:      x * scale,
              top:       y * scale,
              transform: 'translate(-4px, -4px)',
              zIndex:    isActive ? 20 : 10,
            }}
            onMouseDown={e => handleMouseDown(e, el)}
          >
            {/* 핸들 점 */}
            <div style={{
              width:        8,
              height:       8,
              borderRadius: '50%',
              background:   color,
              cursor:       'grab',
              border:       '2px solid white',
              boxShadow:    isActive
                ? `0 0 0 2px ${color}, 0 2px 8px rgba(0,0,0,0.3)`
                : '0 1px 3px rgba(0,0,0,0.3)',
            }} />

            {/* 드래그 중 라벨 + 좌표 */}
            {isActive && (
              <div style={{
                position:      'absolute',
                top:           12,
                left:          0,
                background:    color,
                color:         'white',
                fontSize:      9,
                fontWeight:    600,
                padding:       '2px 6px',
                borderRadius:  3,
                whiteSpace:    'nowrap',
                pointerEvents: 'none',
                boxShadow:     '0 1px 4px rgba(0,0,0,0.25)',
              }}>
                {el.label}  {Math.round(x)}, {Math.round(y)}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
