'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const ADMIN_ID = process.env.ADMIN_ID!
const ADMIN_PW = process.env.ADMIN_PW!
const COOKIE_NAME = 'admin_session'

export async function loginAdmin(formData: FormData) {
  const id = formData.get('id') as string
  const password = formData.get('password') as string

  if (id === ADMIN_ID && password === ADMIN_PW) {
    const cookieStore = await cookies()
    cookieStore.set(COOKIE_NAME, 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    })
    redirect('/admin')
  } else {
    return { error: '아이디 또는 비밀번호가 잘못되었습니다.' }
  }
}

export async function logoutAdmin() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
  redirect('/admin/login')
}

export async function getConsultations() {
  const cookieStore = await cookies()
  const hasSession = cookieStore.has(COOKIE_NAME)

  if (!hasSession) {
    throw new Error("Unauthorized")
  }

  return []
}
