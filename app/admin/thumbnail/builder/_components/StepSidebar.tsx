// app/admin/thumbnail/builder/_components/StepSidebar.tsx
'use client'
import { cn } from '@/lib/utils'
import { STEPS, type StepId, type BuilderState } from '../_types'

interface Props {
  activeStep: StepId
  onStepClick: (id: StepId) => void
  state: BuilderState
}

function isStepAccessible(stepId: StepId, state: BuilderState): boolean {
  switch (stepId) {
    case 'image':  return true
    case 'layout': return !!(state.imageType && state.archetype && state.selectedImageFile)
    case 'effect': return !!state.layoutTokenId
    case 'text':   return !!state.effectTokenId
    case 'export': return Object.values(state.texts.ko).some(v => v.trim())
    default:       return false
  }
}

export function StepSidebar({ activeStep, onStepClick, state }: Props) {
  return (
    <div className="w-52 shrink-0 border-r border-gray-100 bg-white flex flex-col py-4 gap-0.5">
      <div className="px-4 pb-3 mb-1 border-b border-gray-100">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
          Thumbnail Builder
        </span>
      </div>
      {STEPS.map((s, i) => {
        const accessible = isStepAccessible(s.id, state)
        const active = s.id === activeStep
        return (
          <button
            key={s.id}
            onClick={() => accessible && onStepClick(s.id)}
            disabled={!accessible}
            className={cn(
              'mx-2 px-3 py-2.5 rounded-lg flex items-center gap-2.5 text-left transition-colors',
              active     && 'bg-gray-900 text-white',
              !active && accessible  && 'text-gray-500 hover:bg-gray-50',
              !accessible && 'text-gray-300 cursor-not-allowed',
            )}
          >
            <span className="text-base">{s.icon}</span>
            <div className="flex flex-col">
              <span className="text-[11px] font-medium">{s.label}</span>
              <span className={cn('text-[9px]', active ? 'text-gray-300' : 'opacity-40')}>
                Step {i + 1}
              </span>
            </div>
            {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80" />}
          </button>
        )
      })}
    </div>
  )
}
