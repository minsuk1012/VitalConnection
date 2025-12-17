import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getConsultations, logoutAdmin } from './actions'

export default async function AdminDashboard() {
  const cookieStore = await cookies()
  const hasSession = cookieStore.has('admin_session')

  if (!hasSession) {
    redirect('/admin/login')
  }

  const consultations = await getConsultations()

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">상담 신청 현황</h1>
          <form action={logoutAdmin}>
            <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition">
              로그아웃
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-100 text-gray-900 uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">신청일시</th>
                  <th className="px-6 py-4">병원명</th>
                  <th className="px-6 py-4">담당자</th>
                  <th className="px-6 py-4">연락처</th>
                  <th className="px-6 py-4">이메일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {consultations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                      아직 신청된 상담이 없습니다.
                    </td>
                  </tr>
                ) : (
                  consultations.map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        {new Date(item.created_at).toLocaleString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">{item.hospital_name}</td>
                      <td className="px-6 py-4">{item.contact_name}</td>
                      <td className="px-6 py-4">{item.phone}</td>
                      <td className="px-6 py-4">{item.email}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
