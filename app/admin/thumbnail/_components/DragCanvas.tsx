// app/admin/thumbnail/_components/DragCanvas.tsx
'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import type { ElementInstance } from '@/lib/thumbnail-element-schema'

interface Props {
  elements:        ElementInstance[]
  frameRef:        React.RefObject<HTMLIFrameElement | null>
  canvasSize:      number   // 실제 표시 크기(px) e.g. 480
  sourceSize:      number   // 원본 크기 e.g. 1080
  onElementMove:   (cssTarget: string, x: number, y: number) => void
  selectedTarget:  string | null
  onSelectTarget:  (t: string | null) => void
  onElementResize: (cssTarget: string, maxWidth: number) => void
}

// 스냅 임계값 (source 좌표 기준, px)
const SNAP_THRESHOLD = 8

// 리사이즈 핸들 정의
const RESIZE_HANDLES: Array<{
  id:      string
  style:   React.CSSProperties
  isHoriz: boolean  // true면 가로(width) 조절 핸들
}> = [
  { id: 'nw', isHoriz: true,  style: { top: -4,     left: -4,                               cursor: 'nw-resize' } },
  { id: 'n',  isHoriz: false, style: { top: -4,     left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize'  } },
  { id: 'ne', isHoriz: true,  style: { top: -4,     right: -4,                              cursor: 'ne-resize' } },
  { id: 'e',  isHoriz: true,  style: { top: '50%',  right: -4,   transform: 'translateY(-50%)', cursor: 'e-resize'  } },
  { id: 'se', isHoriz: true,  style: { bottom: -4,  right: -4,                              cursor: 'se-resize' } },
  { id: 's',  isHoriz: false, style: { bottom: -4,  left: '50%', transform: 'translateX(-50%)', cursor: 's-resize'  } },
  { id: 'sw', isHoriz: true,  style: { bottom: -4,  left: -4,                               cursor: 'sw-resize' } },
  { id: 'w',  isHoriz: true,  style: { top: '50%',  left: -4,    transform: 'translateY(-50%)', cursor: 'w-resize'  } },
]

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

export function DragCanvas({ elements, frameRef, canvasSize, sourceSize, onElementMove, selectedTarget, onSelectTarget, onElementResize }: Props) {
  const scale = canvasSize / sourceSize

  const draggingRef = useRef<{
    cssTarget:   string
    startMouseX: number
    startMouseY: number
    startX:      number
    startY:      number
  } | null>(null)

  const resizingRef = useRef<{
    cssTarget:   string
    isWest:      boolean
    startMouseX: number
    startW:      number
  } | null>(null)

  const [activeTarget,    setActiveTarget]    = useState<string | null>(null)
  const [localPositions,  setLocalPositions]  = useState<Record<string, { x: number; y: number }>>({})
  const [guides,          setGuides]          = useState<GuideLines>({ x: null, y: null })
  const [localRects,      setLocalRects]      = useState<Record<string, { x: number; y: number; w: number; h: number }>>({})

  // selectedTarget 변경 시 iframe DOM에서 실제 렌더 크기 읽기
  useEffect(() => {
    if (!selectedTarget) return
    const timer = setTimeout(() => {
      try {
        const el = frameRef.current?.contentDocument?.getElementById(selectedTarget)
        if (!el) return
        const rect = el.getBoundingClientRect()
        setLocalRects(prev => ({
          ...prev,
          [selectedTarget]: { x: rect.left, y: rect.top, w: rect.width, h: rect.height },
        }))
      } catch { /* cross-origin 무시 */ }
    }, 50)
    return () => clearTimeout(timer)
  }, [selectedTarget, frameRef])

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
    onSelectTarget(el.cssTarget)
    setGuides({ x: null, y: null })
  }, [getPos, onSelectTarget])

  const handleResizeMouseDown = useCallback((
    e: React.MouseEvent,
    handle: { id: string; isHoriz: boolean },
    cssTarget: string,
    startW: number,
  ) => {
    e.preventDefault()
    e.stopPropagation()
    if (!handle.isHoriz) return  // 상하 핸들은 무시 (height auto)
    const isWest = handle.id === 'w' || handle.id === 'nw' || handle.id === 'sw'
    resizingRef.current = { cssTarget, isWest, startMouseX: e.clientX, startW }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // 리사이즈 중
    const r = resizingRef.current
    if (r) {
      const sign = r.isWest ? -1 : 1
      const newW = Math.max(50, Math.round(r.startW + sign * (e.clientX - r.startMouseX) / scale))
      try {
        const root = frameRef.current?.contentDocument?.documentElement
        if (root) root.style.setProperty(`--${r.cssTarget}-max-width`, `${newW}px`)
      } catch {}
      setLocalRects(prev => {
        const curr = prev[r.cssTarget]
        if (!curr) return prev
        return { ...prev, [r.cssTarget]: { ...curr, w: newW } }
      })
      return
    }

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
    const r = resizingRef.current
    if (r) {
      const rect = localRects[r.cssTarget]
      if (rect) onElementResize(r.cssTarget, rect.w)
      resizingRef.current = null
      return
    }
    const d = draggingRef.current
    if (!d) return
    const local = localPositions[d.cssTarget]
    if (local) onElementMove(d.cssTarget, local.x, local.y)
    draggingRef.current = null
    setActiveTarget(null)
    setGuides({ x: null, y: null })
  }, [localPositions, localRects, onElementMove, onElementResize])

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
      onClick={() => onSelectTarget(null)}
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

      {/* ── 선택된 요소: 바운딩 박스 ── */}
      {selectedTarget && (() => {
        const rect = localRects[selectedTarget]
        const sel  = positionedEls.find(el => el.cssTarget === selectedTarget)
        if (!rect || !sel) return null
        const color = getColor(selectedTarget)
        return (
          <div
            style={{
              position:     'absolute',
              left:         rect.x * scale,
              top:          rect.y * scale,
              width:        rect.w * scale,
              height:       rect.h * scale,
              border:       `1.5px solid ${color}`,
              borderRadius: 2,
              zIndex:       25,
            }}
          >
            {/* 상단 라벨 */}
            <div style={{
              position:     'absolute',
              top:          -16,
              left:         0,
              background:   color,
              color:        'white',
              fontSize:     8,
              fontWeight:   700,
              padding:      '1px 5px',
              borderRadius: 2,
              whiteSpace:   'nowrap',
              pointerEvents: 'none',
            }}>
              {sel.label}  ({Math.round(rect.x)}, {Math.round(rect.y)})  {Math.round(rect.w)}×{Math.round(rect.h)}
            </div>

            {/* 8개 리사이즈 핸들 */}
            {RESIZE_HANDLES.map(handle => (
              <div
                key={handle.id}
                style={{
                  position:      'absolute',
                  width:         7,
                  height:        7,
                  background:    'white',
                  border:        `1.5px solid ${color}`,
                  borderRadius:  1,
                  pointerEvents: 'all',
                  zIndex:        30,
                  opacity:       handle.isHoriz ? 1 : 0.4,
                  ...handle.style,
                }}
                onMouseDown={e => handleResizeMouseDown(e, handle, selectedTarget!, rect.w)}
              />
            ))}
          </div>
        )
      })()}

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
