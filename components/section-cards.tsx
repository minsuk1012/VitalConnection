'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Database, Users, FileText, TrendingUp } from 'lucide-react'

interface Stats {
  totalCollections: number
  totalPosts: number
  totalInfluencers: number
  recentCollections: number
}

export function SectionCards() {
  const [stats, setStats] = useState<Stats>({ totalCollections: 0, totalPosts: 0, totalInfluencers: 0, recentCollections: 0 })

  useEffect(() => {
    async function load() {
      try {
        const [results, influencers] = await Promise.all([
          fetch('/api/instagram/results?page=1').then(r => r.json()),
          fetch('/api/instagram/influencers?page=1').then(r => r.json()),
        ])
        setStats({
          totalCollections: results.collections?.length || 0,
          totalPosts: results.total || 0,
          totalInfluencers: influencers.total || 0,
          recentCollections: results.collections?.filter((c: any) => c.status === 'completed').length || 0,
        })
      } catch {}
    }
    load()
  }, [])

  const cards = [
    { title: '수집 작업', value: stats.totalCollections, icon: Database, desc: `완료 ${stats.recentCollections}건` },
    { title: '수집 게시물', value: stats.totalPosts, icon: FileText, desc: '전체 누적' },
    { title: '인플루언서', value: stats.totalInfluencers, icon: Users, desc: '자동 분석' },
    { title: '평균 Engagement', value: stats.totalPosts > 0 ? '-' : '0', icon: TrendingUp, desc: '좋아요+댓글' },
  ]

  return (
    <div className="grid gap-4 px-4 md:grid-cols-2 lg:grid-cols-4 lg:px-6">
      {cards.map(card => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{typeof card.value === 'number' ? card.value.toLocaleString() : card.value}</div>
            <p className="text-xs text-muted-foreground">{card.desc}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
