// app/admin/thumbnail/builder/_components/PreviewPane.tsx
'use client'
import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import type { BuilderState } from '../_types'

interface Props {
  state: BuilderState
}

function buildPreviewUrl(state: BuilderState): string | null {
  if (!state.layoutTokenId || !state.effectTokenId) return null

  const ko = state.texts.ko
  const params = new URLSearchParams({
    layoutToken:  state.layoutTokenId,
    effectToken:  state.effectTokenId,
    headline:     ko.headline    || '시술명',
    sub:          ko.subheadline || '',
    brandEn:      ko.brandEn     || 'CLINIC',
    brandKo:      ko.brandKo     || '',
    price:        ko.price       || '',
    fontFamily:   state.fontFamily,
    accentColor:  state.accentColor,
    panelColor:   state.panelColor,
    ...(state.selectedImageFile
      ? state.imageType === 'cutout'
        ? { cutout: state.selectedImageFile }
        : { model:  state.selectedImageFile }
      : {}),
  })
  return `/api/thumbnail/builder/preview?${params}`
}

export function PreviewPane({ state }: Props) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    const url = buildPreviewUrl(state)
    if (!url) return
    // 400ms 디바운스 — 텍스트 입력 중 연속 호출 방지
    const timer = setTimeout(() => setSrc(url), 400)
    return () => clearTimeout(timer)
  }, [
    state.layoutTokenId, state.effectTokenId, state.texts.ko,
    state.fontFamily, state.accentColor, state.panelColor,
    state.archetype, state.selectedImageFile, state.imageType,
  ])

  return (
    <div className="w-72 shrink-0 bg-gray-50 border-l border-gray-100 flex flex-col">
      <div className="p-3 border-b border-gray-100 bg-white">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
          Preview
        </span>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        {src ? (
          <iframe
            src={src}
            className="w-full aspect-square rounded-xl shadow-lg border border-gray-200 bg-white"
            style={{ transform: 'scale(0.95)', transformOrigin: 'center' }}
          />
        ) : (
          <Skeleton className="w-full aspect-square rounded-xl" />
        )}
      </div>
      <div className="p-3 text-center">
        <span className="text-[10px] text-gray-400">1080 × 1080</span>
      </div>
    </div>
  )
}
