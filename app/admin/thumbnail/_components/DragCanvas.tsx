// app/admin/thumbnail/_components/DragCanvas.tsx
'use client'

import { useRef, useState, useCallback } from 'react'
import type { ElementInstance } from '@/lib/thumbnail-element-schema'

interface Props {
  elements:       ElementInstance[]
  frameRef:       React.RefObject<HTMLIFrameElement | null>
  canvasSize:     number          // 실제 표시 크기(px) e.g. 480
  sourceSize:     number          // 원본 크기 e.g. 1080
  onElementMove:  (cssTarget: string, x: number, y: number) => void
}

const SCALE_COLORS: Record<string, string> = {
  'brand-ko':    '#6366f1',
  'headline':    '#2563eb',
  'headline-ko': '#7c3aed',
  'subheadline': '#059669',
  'price':       '#db2777',
}

function getColor(cssTarget: string) {
  return SCALE_COLORS[cssTarget] ?? '#6b7280'
}

export function DragCanvas({ elements, frameRef, canvasSize, sourceSize, onElementMove }: Props) {
  const scale = canvasSize / sourceSize

  const draggingRef = useRef<{
    cssTarget: string
    startMouseX: number
    startMouseY: number
    startX: number
    startY: number
  } | null>(null)

  const [activeTarget, setActiveTarget] = useState<string | null>(null)

  // 요소별 현재 위치 (드래그 중 낙관적 업데이트용)
  const [localPositions, setLocalPositions] = useState<Record<string, { x: number; y: number }>>({})

  const getPos = (el: ElementInstance) => {
    const local = localPositions[el.cssTarget]
    return {
      x: local?.x ?? (el.props.x as number ?? 0),
      y: local?.y ?? (el.props.y as number ?? 0),
    }
  }

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
  }, [localPositions])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const d = draggingRef.current
    if (!d) return

    const dx = (e.clientX - d.startMouseX) / scale
    const dy = (e.clientY - d.startMouseY) / scale
    const newX = Math.round(Math.max(0, Math.min(sourceSize, d.startX + dx)))
    const newY = Math.round(Math.max(0, Math.min(sourceSize, d.startY + dy)))

    // iframe CSS 변수 즉시 주입 (reload 없이)
    try {
      const iframeDoc = frameRef.current?.contentDocument
      if (iframeDoc) {
        iframeDoc.documentElement.style.setProperty(`--${d.cssTarget}-x`, `${newX}px`)
        iframeDoc.documentElement.style.setProperty(`--${d.cssTarget}-y`, `${newY}px`)
      }
    } catch { /* cross-origin 등 무시 */ }

    // 핸들 위치 낙관적 업데이트
    setLocalPositions(prev => ({ ...prev, [d.cssTarget]: { x: newX, y: newY } }))
  }, [scale, sourceSize, frameRef])

  const handleMouseUp = useCallback(() => {
    const d = draggingRef.current
    if (!d) return
    const local = localPositions[d.cssTarget]
    if (local) {
      onElementMove(d.cssTarget, local.x, local.y)
    }
    draggingRef.current = null
    setActiveTarget(null)
  }, [localPositions, onElementMove])

  // 위치가 있는 요소만 렌더
  const positionedEls = elements.filter(el =>
    el.props.x !== undefined && el.props.y !== undefined
  )

  if (positionedEls.length === 0) return null

  return (
    <div
      className="absolute inset-0 z-10"
      style={{ cursor: activeTarget ? 'grabbing' : 'default' }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {positionedEls.map(el => {
        const { x, y } = getPos(el)
        const isActive = activeTarget === el.cssTarget
        const color = getColor(el.cssTarget)

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
            {/* 드래그 핸들 점 */}
            <div
              style={{
                width:        8,
                height:       8,
                borderRadius: '50%',
                background:   color,
                cursor:       'grab',
                border:       `2px solid white`,
                boxShadow:    isActive
                  ? `0 0 0 2px ${color}, 0 2px 8px rgba(0,0,0,0.3)`
                  : `0 1px 3px rgba(0,0,0,0.3)`,
              }}
            />
            {/* 호버/활성 시 라벨 */}
            {isActive && (
              <div style={{
                position:   'absolute',
                top:        12,
                left:       0,
                background: color,
                color:      'white',
                fontSize:   9,
                fontWeight: 600,
                padding:    '1px 5px',
                borderRadius: 3,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                boxShadow:  '0 1px 4px rgba(0,0,0,0.2)',
              }}>
                {el.label} ({Math.round(x)}, {Math.round(y)})
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
