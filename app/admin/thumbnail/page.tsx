import Link from 'next/link'

export default function ThumbnailPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 py-4 px-4 md:gap-6 md:py-6 lg:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">썸네일 에디터</h1>
        <Link
          href="/admin/thumbnail/builder"
          className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-700 transition-colors">
          + 새 썸네일 만들기
        </Link>
      </div>
    </div>
  )
}
