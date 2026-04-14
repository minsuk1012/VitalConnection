// app/admin/thumbnail/builder/_components/Step1ImageSelect.tsx
'use client'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { BuilderState } from '../_types'

const IMAGE_TYPES = [
  { id: 'full',   label: '전체 이미지', desc: '배경 포함 AI 생성 이미지', icon: '📷' },
  { id: 'cutout', label: '누끼 이미지', desc: '배경 제거 + 색상 배경 합성', icon: '✂️' },
] as const

interface Archetype {
  id: string
  label: string
  procedures: string[]
  cutout?: boolean
  variants: { id: string; bgColor: string }[]
}

interface Props {
  state: BuilderState
  onChange: (patch: Partial<BuilderState>) => void
  onNext: () => void
}

export function Step1ImageSelect({ state, onChange, onNext }: Props) {
  const [archetypes, setArchetypes] = useState<Archetype[]>([])
  const [models, setModels] = useState<string[]>([])
  const [cutouts, setCutouts] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/thumbnail/asset/docs/archetypes.json')
      .then(r => r.json())
      .then(setArchetypes)
      .catch(() => {})
    fetch('/api/thumbnail/models?type=models').then(r => r.json()).then(d => setModels(d.files ?? []))
    fetch('/api/thumbnail/models?type=cutout').then(r => r.json()).then(d => setCutouts(d.files ?? []))
  }, [])

  const filtered = archetypes.filter(a =>
    state.imageType === 'cutout' ? a.cutout : !a.cutout
  )

  // 선택된 아키타입에 해당하는 실제 파일 목록 필터링
  // archetypes.json id가 'dewy-glow', 폴더명이 'dewy_glow' 형태로 다름 — 둘 다 시도
  const archetypeFiles = state.archetype
    ? (state.imageType === 'cutout' ? cutouts : models).filter(f => {
        const folder = f.split('/')[0]
        const id = state.archetype!
        return folder === id || folder === id.replace(/-/g, '_')
      })
    : []

  const canNext = !!(state.imageType && state.archetype && state.selectedImageFile)

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <div className="flex-1 p-6 space-y-6">

        {/* 이미지 타입 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-3">이미지 타입</h3>
          <div className="grid grid-cols-2 gap-3">
            {IMAGE_TYPES.map(t => (
              <button key={t.id}
                onClick={() => onChange({ imageType: t.id as 'full' | 'cutout', archetype: null, selectedImageFile: null })}
                className={cn(
                  'p-4 rounded-xl border-2 text-left transition-all',
                  state.imageType === t.id
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 bg-white hover:border-gray-300',
                )}>
                <div className="text-2xl mb-2">{t.icon}</div>
                <div className="text-sm font-semibold">{t.label}</div>
                <div className={cn('text-xs mt-0.5', state.imageType === t.id ? 'text-gray-300' : 'text-gray-400')}>
                  {t.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 아키타입 */}
        {state.imageType && (
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-1">시술 카테고리</h3>
            <p className="text-xs text-gray-400 mb-3">시술과 어울리는 AI 이미지 아키타입</p>
            <div className="grid grid-cols-3 gap-2">
              {filtered.map(a => (
                <button key={a.id}
                  onClick={() => onChange({ archetype: a.id, selectedImageFile: null })}
                  className={cn(
                    'p-3 rounded-xl border-2 text-left transition-all',
                    state.archetype === a.id ? 'border-gray-900 ring-2 ring-gray-900/10' : 'border-gray-200 hover:border-gray-300',
                  )}>
                  <div className="w-full h-10 rounded-lg mb-2 bg-gray-100 flex items-center justify-center text-lg" />
                  <div className="text-[11px] font-semibold text-gray-800 truncate">{a.label}</div>
                  <div className="text-[9px] text-gray-400 truncate">{a.procedures.slice(0, 3).join(', ')}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 변형 선택 — 실제 파일 목록 기반 */}
        {state.archetype && archetypeFiles.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">이미지 선택 ({archetypeFiles.length}장)</h3>
            <div className="grid grid-cols-3 gap-2">
              {archetypeFiles.map((file) => {
                const assetDir = state.imageType === 'cutout' ? 'models-cutout' : 'models'
                const previewUrl = `/api/thumbnail/asset/${assetDir}/${file.split('/').map(encodeURIComponent).join('/')}`
                const isSelected = state.selectedImageFile === file
                return (
                  <button key={file}
                    onClick={() => onChange({ selectedImageFile: file })}
                    className={cn(
                      'relative rounded-xl overflow-hidden border-2 transition-all aspect-square',
                      isSelected ? 'border-gray-900 ring-2 ring-gray-900/20' : 'border-gray-200 hover:border-gray-300',
                    )}>
                    <img src={previewUrl} alt="" className="w-full h-full object-cover" />
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-5 h-5 bg-gray-900 rounded-full flex items-center justify-center">
                        <span className="text-[9px] text-white font-bold">✓</span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 bg-white p-4 flex justify-end">
        <button
          onClick={onNext}
          disabled={!canNext}
          className="px-6 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors">
          다음: 레이아웃 추천 →
        </button>
      </div>
    </div>
  )
}
