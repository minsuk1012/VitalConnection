import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import InstagramClient from './components/InstagramClient'

export default async function InstagramPage() {
  const cookieStore = await cookies()
  if (!cookieStore.has('admin_session')) {
    redirect('/admin/login')
  }

  return <InstagramClient />
}
