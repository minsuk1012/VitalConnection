// app/admin/thumbnail/builder/page.tsx
'use client'
import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { StepSidebar } from './_components/StepSidebar'
import { PreviewPane } from './_components/PreviewPane'
import { Step1ImageSelect } from './_components/Step1ImageSelect'
import { Step2LayoutSuggest } from './_components/Step2LayoutSuggest'
import { Step3EffectSelect } from './_components/Step3EffectSelect'
import { Step4TextEdit } from './_components/Step4TextEdit'
import { Step5Export } from './_components/Step5Export'
import { INITIAL_STATE, type BuilderState, type StepId, type Lang } from './_types'
import type { LayoutToken, EffectToken } from './_types'

export default function BuilderPage() {
  const [state, setState] = useState<BuilderState>(INITIAL_STATE)
  const [step, setStep] = useState<StepId>('image')
  const [layouts, setLayouts] = useState<LayoutToken[]>([])
  const [effects, setEffects] = useState<EffectToken[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [generatingText, setGeneratingText] = useState(false)

  useEffect(() => {
    fetch('/api/thumbnail/builder/tokens')
      .then(r => r.json())
      .then(d => { setLayouts(d.layouts ?? []); setEffects(d.effects ?? []) })
  }, [])

  const patch = useCallback((p: Partial<BuilderState>) => {
    setState(prev => ({ ...prev, ...p }))
  }, [])

  const handleAnalyze = useCallback(async () => {
    setAnalyzing(true)
    try {
      const res = await fetch('/api/thumbnail/builder/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageType:         state.imageType,
          archetype:         state.archetype,
          selectedImageFile: state.selectedImageFile,
          layouts,
        }),
      })
      if (res.ok) {
        const { suggestions } = await res.json()
        patch({ suggestions, layoutTokenId: suggestions[0]?.layoutTokenId ?? null })
      }
    } finally {
      setAnalyzing(false)
    }
  }, [state.imageType, state.archetype, state.selectedImageFile, layouts, patch])

  const handleGenerateText = useCallback(async (lang: Lang) => {
    setGeneratingText(true)
    try {
      const res = await fetch('/api/thumbnail/builder/generate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ko: state.texts.ko, targetLang: lang }),
      })
      if (res.ok) {
        const generated = await res.json()
        patch({ texts: { ...state.texts, [lang]: generated } })
      }
    } finally {
      setGeneratingText(false)
    }
  }, [state.texts, patch])

  const handleRender = useCallback(async () => {
    const langs: Lang[] = ['ko', 'en', 'ja', 'zh']
    const sessionId = new Date().toISOString().slice(0, 19).replace(/[:.T]/g, '-')
    for (const lang of langs) {
      await fetch('/api/thumbnail/builder/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layoutTokenId: state.layoutTokenId,
          effectTokenId: state.effectTokenId,
          headline:    state.texts[lang].headline,
          subheadline: state.texts[lang].subheadline,
          brandEn:     state.texts[lang].brandEn,
          brandKo:     state.texts[lang].brandKo,
          price:       state.texts[lang].price,
          fontFamily:  state.fontFamily,
          accentColor: state.accentColor,
          panelColor:  state.panelColor,
          model:  state.imageType !== 'cutout' ? state.selectedImageFile : undefined,
          cutout: state.imageType === 'cutout'  ? state.selectedImageFile : undefined,
          sessionId,
          lang,
        }),
      })
    }
    patch({ rendered: true })
  }, [state, patch])

  const stepProps = { state, onChange: patch }

  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="h-11 border-b border-gray-100 bg-white flex items-center px-4 gap-3 shrink-0">
        <Link href="/admin/thumbnail" className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-3.5 h-3.5" /> 에디터
        </Link>
        <span className="text-gray-200">|</span>
        <span className="text-[12px] font-semibold text-gray-700">새 썸네일 만들기</span>
      </div>

      <div className="flex flex-1 overflow-hidden min-w-0">
        <StepSidebar activeStep={step} onStepClick={setStep} state={state} />

        <div className="flex flex-1 overflow-hidden min-w-0">
          {step === 'image'  && <Step1ImageSelect {...stepProps} onNext={() => setStep('layout')} />}
          {step === 'layout' && <Step2LayoutSuggest {...stepProps} layouts={layouts} onAnalyze={handleAnalyze} analyzing={analyzing} onNext={() => setStep('effect')} onPrev={() => setStep('image')} />}
          {step === 'effect' && <Step3EffectSelect {...stepProps} effects={effects} layouts={layouts} onNext={() => setStep('text')} onPrev={() => setStep('layout')} />}
          {step === 'text'   && <Step4TextEdit {...stepProps} onGenerateText={handleGenerateText} generating={generatingText} onNext={() => setStep('export')} onPrev={() => setStep('effect')} />}
          {step === 'export' && <Step5Export {...stepProps} layouts={layouts} effects={effects} onRender={handleRender} onPrev={() => setStep('text')} />}
        </div>

        <PreviewPane state={state} />
      </div>
    </div>
  )
}
