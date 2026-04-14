import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

// 어드민 사이드바 레이아웃을 우회 — 풀스크린 에디터 전용
export default async function ThumbnailLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  if (!cookieStore.has('admin_session')) redirect('/admin/login')
  return <>{children}</>
}
