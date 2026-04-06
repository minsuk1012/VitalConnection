import { SectionCards } from '@/components/section-cards'

export default async function AdminDashboard() {
  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <SectionCards />
    </div>
  )
}
