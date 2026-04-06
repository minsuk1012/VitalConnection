'use client'

import { usePathname } from 'next/navigation'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

const TITLES: Record<string, string> = {
  '/admin': '대시보드',
  '/admin/instagram': '수집',
  '/admin/instagram/results': '수집 결과',
  '/admin/instagram/influencers': '인플루언서',
}

export function SiteHeader() {
  const pathname = usePathname()
  const title = TITLES[pathname] || '관리자'

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <h1 className="text-sm font-medium">{title}</h1>
    </header>
  )
}
