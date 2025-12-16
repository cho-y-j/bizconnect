export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">이미지를 찾을 수 없습니다</h1>
        <p className="text-gray-600 mb-4">
          요청하신 이미지가 존재하지 않거나 삭제되었습니다.
        </p>
        <a
          href="/dashboard/send"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          문자 보내기로 돌아가기
        </a>
      </div>
    </div>
  )
}












