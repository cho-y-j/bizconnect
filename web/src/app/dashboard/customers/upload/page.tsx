'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentUser } from '@/lib/auth'

interface CSVRow {
  name: string
  phone: string
  birthday?: string
  anniversary?: string
  industry_type?: string
  notes?: string
  address?: string
  occupation?: string
  age?: number
  birth_year?: number
}

export default function UploadCustomersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [preview, setPreview] = useState<CSVRow[]>([])
  const [file, setFile] = useState<File | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setError('')
    setSuccess('')
    setPreview([])

    // CSV 파일 읽기
    const text = await selectedFile.text()
    const lines = text.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      setError('CSV 파일에 헤더와 최소 1개의 데이터 행이 필요합니다.')
      return
    }

    // 헤더 파싱
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const requiredHeaders = ['name', 'phone']
    
    if (!requiredHeaders.every(h => headers.includes(h))) {
      setError(`CSV 파일에 필수 컬럼이 없습니다: ${requiredHeaders.join(', ')}`)
      return
    }

    // 데이터 파싱
    const rows: CSVRow[] = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      const row: CSVRow = {
        name: '',
        phone: '',
      }

      headers.forEach((header, index) => {
        const value = values[index] || ''
        if (header === 'name') row.name = value
        else if (header === 'phone') row.phone = value.replace(/\D/g, '')
        else if (header === 'birthday' || header === '생일') row.birthday = value
        else if (header === 'anniversary' || header === '기념일') row.anniversary = value
        else if (header === 'industry_type' || header === '업종') row.industry_type = value
        else if (header === 'notes' || header === '메모') row.notes = value
      })

      if (row.name && row.phone) {
        rows.push(row)
      }
    }

    if (rows.length === 0) {
      setError('유효한 데이터가 없습니다.')
      return
    }

    setPreview(rows.slice(0, 5)) // 처음 5개만 미리보기
  }

  const handleUpload = async () => {
    if (!file) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // CSV 파일 다시 읽기
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

      const customers = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        const row: CSVRow = {
          name: '',
          phone: '',
        }

        headers.forEach((header, index) => {
          const value = values[index] || ''
          if (header === 'name') row.name = value
          else if (header === 'phone') row.phone = value.replace(/\D/g, '')
          else if (header === 'birthday' || header === '생일') row.birthday = value
          else if (header === 'anniversary' || header === '기념일') row.anniversary = value
          else if (header === 'industry_type' || header === '업종') row.industry_type = value
          else if (header === 'notes' || header === '메모') row.notes = value
          else if (header === 'address' || header === '주소') row.address = value
          else if (header === 'occupation' || header === '직업') row.occupation = value
          else if (header === 'age' || header === '나이') row.age = value ? parseInt(value) : undefined
          else if (header === 'birth_year' || header === '출생년도') row.birth_year = value ? parseInt(value) : undefined
        })

        if (row.name && row.phone && row.phone.length >= 10) {
          customers.push({
            user_id: user.id,
            name: row.name.trim(),
            phone: row.phone,
            birthday: row.birthday || null,
            anniversary: row.anniversary || null,
            industry_type: row.industry_type || 'general',
            notes: row.notes || null,
            address: row.address || null,
            occupation: row.occupation || null,
            age: row.age || null,
            birth_year: row.birth_year || null,
          })
        }
      }

      if (customers.length === 0) {
        setError('업로드할 유효한 고객 데이터가 없습니다.')
        setLoading(false)
        return
      }

      // 일괄 삽입 (중복 무시)
      const { error: insertError } = await supabase
        .from('customers')
        .upsert(customers, {
          onConflict: 'user_id,phone',
          ignoreDuplicates: false,
        })

      if (insertError) {
        setError('고객 업로드 중 오류가 발생했습니다: ' + insertError.message)
      } else {
        setSuccess(`${customers.length}명의 고객이 성공적으로 등록되었습니다.`)
        setTimeout(() => {
          router.push('/dashboard/customers')
        }, 2000)
      }
    } catch (err) {
      console.error('Error:', err)
      setError('고객 업로드 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/customers" className="text-2xl font-bold text-blue-600">
              비즈커넥트
            </Link>
            <span className="text-gray-400">/</span>
            <Link href="/dashboard/customers" className="text-gray-600 hover:text-gray-900">
              고객 관리
            </Link>
            <span className="text-gray-400">/</span>
            <h1 className="text-xl font-semibold text-gray-900">CSV 업로드</h1>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">CSV 파일로 고객 일괄 등록</h2>
            <p className="text-gray-600">
              CSV 파일을 업로드하여 여러 고객을 한 번에 등록할 수 있습니다.
            </p>
          </div>

          {/* CSV 형식 안내 */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">CSV 파일 형식</h3>
            <p className="text-sm text-blue-800 mb-2">
              필수 컬럼: <code className="bg-blue-100 px-1 rounded">name</code>, <code className="bg-blue-100 px-1 rounded">phone</code>
            </p>
            <p className="text-sm text-blue-800 mb-2">
              선택 컬럼: <code className="bg-blue-100 px-1 rounded">birthday</code>, <code className="bg-blue-100 px-1 rounded">anniversary</code>, <code className="bg-blue-100 px-1 rounded">industry_type</code>, <code className="bg-blue-100 px-1 rounded">notes</code>
            </p>
            <div className="mt-3 text-xs text-blue-700 bg-white p-2 rounded font-mono">
              name,phone,birthday,anniversary,industry_type,notes<br />
              홍길동,01012345678,1990-01-01,2020-01-01,general,메모
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {success}
            </div>
          )}

          {/* 파일 선택 */}
          <div className="mb-6">
            <label htmlFor="csv-file" className="block text-sm font-medium text-gray-700 mb-2">
              CSV 파일 선택
            </label>
            <input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 미리보기 */}
          {preview.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">미리보기 (처음 5개)</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">이름</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">전화번호</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">업종</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {preview.map((row, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm">{row.name}</td>
                        <td className="px-4 py-2 text-sm">{row.phone}</td>
                        <td className="px-4 py-2 text-sm">{row.industry_type || 'general'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-4">
            <button
              onClick={handleUpload}
              disabled={loading || !file || preview.length === 0}
              className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '업로드 중...' : '업로드'}
            </button>
            <Link
              href="/dashboard/customers"
              className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors text-center"
            >
              취소
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

