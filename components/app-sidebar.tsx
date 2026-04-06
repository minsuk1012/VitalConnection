'use client'

import { LayoutDashboard, LogOut, Radar, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

const INSTAGRAM_SUBS = [
  { title: '수집', href: '/admin/instagram' },
  { title: '탐색', href: '/admin/instagram/explore' },
  { title: '후보 관리', href: '/admin/instagram/candidates' },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const isInstagramActive = pathname.startsWith('/admin/instagram')

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/admin" />}>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">VitalConnection</span>
                <span className="truncate text-xs text-muted-foreground">관리자</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>메뉴</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href="/admin" />} isActive={pathname === '/admin'}>
                  <LayoutDashboard />
                  <span>대시보드</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <Collapsible defaultOpen={isInstagramActive} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger className="w-full">
                    <SidebarMenuButton isActive={isInstagramActive}>
                      <Radar />
                      <span>인스타그램</span>
                      <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {INSTAGRAM_SUBS.map(sub => (
                        <SidebarMenuSubItem key={sub.href}>
                          <SidebarMenuSubButton render={<Link href={sub.href} />} isActive={pathname === sub.href}>
                            <span>{sub.title}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<a href="/admin/logout" />}>
              <LogOut />
              <span>로그아웃</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
