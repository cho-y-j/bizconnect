import { NextResponse } from 'next/server'

/**
 * AI 환경 변수 확인 API
 * GET /api/check-ai-env
 */
export async function GET() {
  const deepseekKey = process.env.DEEPSEEK_API_KEY

  return NextResponse.json({
    hasDeepSeekKey: !!deepseekKey,
    keyPreview: deepseekKey ? `${deepseekKey.substring(0, 10)}...` : 'NOT SET',
    message: deepseekKey 
      ? '✅ DeepSeek API 키가 설정되어 있습니다.' 
      : '❌ DeepSeek API 키가 설정되지 않았습니다.',
  })
}

