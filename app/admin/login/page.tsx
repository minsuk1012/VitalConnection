'use client'

import { useState } from 'react'
import { loginAdmin } from '../actions'
import { GalleryVerticalEnd } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function AdminLogin() {
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(formData: FormData) {
    setErrorMessage('')
    setLoading(true)
    const result = await loginAdmin(formData)
    if (result?.error) {
      setErrorMessage(result.error)
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="/" className="flex items-center gap-2 self-center font-medium">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GalleryVerticalEnd className="size-4" />
          </div>
          VitalConnection
        </a>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">관리자 로그인</CardTitle>
            <CardDescription>관리자 계정으로 로그인하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleLogin}>
              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="id">아이디</Label>
                  <Input id="id" name="id" type="text" required placeholder="아이디 입력" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">비밀번호</Label>
                  <Input id="password" name="password" type="password" required placeholder="비밀번호 입력" />
                </div>

                {errorMessage && (
                  <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    {errorMessage}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? '로그인 중...' : '로그인'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
