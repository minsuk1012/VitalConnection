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
  const [html, setHtml] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const url = buildPreviewUrl(state)
    if (!url) {
      setHtml(null)
      setError(null)
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    // 400ms 디바운스 — 텍스트 입력 중 연속 호출 방지
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(url, {
          credentials: 'same-origin',
          signal: controller.signal,
        })

        const text = await res.text()
        if (!res.ok) {
          throw new Error(text || `프리뷰 요청 실패 (${res.status})`)
        }

        setHtml(text)
      } catch (err: any) {
        if (controller.signal.aborted) return
        setHtml(null)
        setError(err?.message ?? '프리뷰를 불러오지 못했습니다.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 400)

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
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
        {error ? (
          <div className="w-full aspect-square rounded-xl border border-dashed border-gray-300 bg-white p-4 flex items-center justify-center text-center">
            <div>
              <div className="text-sm font-semibold text-gray-800">프리뷰를 불러오지 못했습니다</div>
              <div className="mt-2 text-[11px] leading-5 text-gray-500 whitespace-pre-wrap break-words">
                {error}
              </div>
            </div>
          </div>
        ) : html ? (
          <iframe
            srcDoc={html}
            title="Thumbnail preview"
            className="w-full aspect-square rounded-xl shadow-lg border border-gray-200 bg-white"
            style={{ transform: 'scale(0.95)', transformOrigin: 'center' }}
          />
        ) : loading ? (
          <Skeleton className="w-full aspect-square rounded-xl" />
        ) : (
          <div className="w-full aspect-square rounded-xl border border-dashed border-gray-300 bg-white flex items-center justify-center text-center px-6">
            <div className="text-[11px] leading-5 text-gray-400">
              레이아웃과 효과를 선택하면 미리보기가 표시됩니다.
            </div>
          </div>
        )}
      </div>
      <div className="p-3 text-center">
        <span className="text-[10px] text-gray-400">1080 × 1080</span>
      </div>
    </div>
  )
}
