'use client'

import { useState } from 'react'
import CollectTab from './CollectTab'
import ResultsTab from './ResultsTab'
import InfluencerTab from './InfluencerTab'

const TABS = [
  { id: 'collect', label: '🔍 수집' },
  { id: 'results', label: '📊 수집 결과' },
  { id: 'influencers', label: '⭐ 인플루언서' },
] as const

type TabId = typeof TABS[number]['id']

export default function InstagramClient() {
  const [activeTab, setActiveTab] = useState<TabId>('collect')

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">인스타그램 수집</h1>
          <a href="/admin" className="text-sm text-gray-500 hover:text-gray-700">
            ← 대시보드
          </a>
        </div>

        <div className="flex gap-1 border-b border-gray-200 mb-6">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'collect' && <CollectTab />}
        {activeTab === 'results' && <ResultsTab />}
        {activeTab === 'influencers' && <InfluencerTab />}
      </div>
    </div>
  )
}
