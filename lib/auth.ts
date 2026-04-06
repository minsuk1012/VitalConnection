import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function checkAdmin(): Promise<NextResponse | null> {
  const cookieStore = await cookies()
  if (!cookieStore.has('admin_session')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
