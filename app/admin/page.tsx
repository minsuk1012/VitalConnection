import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getConsultations, logoutAdmin } from './actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'

export default async function AdminDashboard() {
  const cookieStore = await cookies()
  if (!cookieStore.has('admin_session')) {
    redirect('/admin/login')
  }

  const consultations = await getConsultations()

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">관리자 대시보드</h1>
            <p className="text-muted-foreground">상담 신청 현황 및 인스타그램 수집 관리</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/instagram">
              <Button variant="default">인스타그램 수집</Button>
            </Link>
            <form action={logoutAdmin}>
              <Button variant="destructive">로그아웃</Button>
            </form>
          </div>
        </div>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle>상담 신청 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>신청일시</TableHead>
                  <TableHead>병원명</TableHead>
                  <TableHead>담당자</TableHead>
                  <TableHead>연락처</TableHead>
                  <TableHead>이메일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consultations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      아직 신청된 상담이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  consultations.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>{new Date(item.created_at).toLocaleString('ko-KR')}</TableCell>
                      <TableCell className="font-medium">{item.hospital_name}</TableCell>
                      <TableCell>{item.contact_name}</TableCell>
                      <TableCell>{item.phone}</TableCell>
                      <TableCell>{item.email}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
