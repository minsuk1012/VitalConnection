import { cookies, headers } from 'next/headers'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

// 사이드바 레이아웃을 우회할 경로 목록
const SIDEBAR_EXCLUDED = ['/admin/thumbnail']

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const hasSession = cookieStore.has('admin_session')
  const headerStore = await headers()
  const pathname = headerStore.get('x-pathname') ?? ''

  const isSidebarExcluded = SIDEBAR_EXCLUDED.some(p => pathname.startsWith(p))

  if (!hasSession || isSidebarExcluded) {
    return <>{children}</>
  }

  return (
    <SidebarProvider
      style={{
        '--sidebar-width': 'calc(var(--spacing) * 72)',
        '--header-height': 'calc(var(--spacing) * 12)',
      } as React.CSSProperties}
    >
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
