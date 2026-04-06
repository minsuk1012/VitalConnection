'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import CollectTab from './CollectTab'
import ResultsTab from './ResultsTab'
import InfluencerTab from './InfluencerTab'

export default function InstagramClient() {
  return (
    <div className="flex flex-1 flex-col gap-4 py-4 px-4 md:gap-6 md:py-6 lg:px-6">
      <Tabs defaultValue="collect">
        <TabsList>
          <TabsTrigger value="collect">수집</TabsTrigger>
          <TabsTrigger value="results">수집 결과</TabsTrigger>
          <TabsTrigger value="influencers">인플루언서</TabsTrigger>
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
  )
}
