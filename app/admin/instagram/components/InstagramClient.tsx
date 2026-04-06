'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import CollectTab from './CollectTab'
import ResultsTab from './ResultsTab'
import InfluencerTab from './InfluencerTab'
import Link from 'next/link'

export default function InstagramClient() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">인스타그램 수집</h1>
            <p className="text-muted-foreground">해시태그, 프로필, 위치, 키워드 기반 데이터 수집</p>
          </div>
          <Link href="/admin">
            <Button variant="outline">← 대시보드</Button>
          </Link>
        </div>

        <Separator />

        <Tabs defaultValue="collect">
          <TabsList>
            <TabsTrigger value="collect">🔍 수집</TabsTrigger>
            <TabsTrigger value="results">📊 수집 결과</TabsTrigger>
            <TabsTrigger value="influencers">⭐ 인플루언서</TabsTrigger>
          </TabsList>

          <TabsContent value="collect" className="mt-6">
            <CollectTab />
          </TabsContent>
          <TabsContent value="results" className="mt-6">
            <ResultsTab />
          </TabsContent>
          <TabsContent value="influencers" className="mt-6">
            <InfluencerTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
