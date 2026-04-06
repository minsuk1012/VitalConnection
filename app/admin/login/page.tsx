'use client'

import { useState } from 'react'
import { loginAdmin } from '../actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function AdminLogin() {
  const [errorMessage, setErrorMessage] = useState('')

  async function handleLogin(formData: FormData) {
    setErrorMessage('')
    const result = await loginAdmin(formData)
    if (result?.error) {
      setErrorMessage(result.error)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">관리자 로그인</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">아이디</label>
              <Input type="text" name="id" required placeholder="아이디 입력" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">비밀번호</label>
              <Input type="password" name="password" required placeholder="비밀번호 입력" />
            </div>

            {errorMessage && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
                {errorMessage}
              </div>
            )}

            <Button type="submit" className="w-full">
              로그인
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
