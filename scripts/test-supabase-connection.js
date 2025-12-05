/**
 * Supabase 연결 테스트 스크립트
 * node scripts/test-supabase-connection.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './web/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hdeebyhwoogxawjkwufx.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkZWVieWh3b29neGF3amt3dWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MTEzNzMsImV4cCI6MjA4MDQ4NzM3M30.4PF-zTWwg4ZFwgbqPTZHVlQl69WYIgAGGi_-KaVKY7w';

console.log('🔍 Supabase 연결 테스트 시작...\n');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseAnonKey.substring(0, 20) + '...\n');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    // 1. 기본 연결 테스트
    console.log('1️⃣ 기본 연결 테스트...');
    const { data: health, error: healthError } = await supabase
      .from('customers')
      .select('count')
      .limit(0);
    
    if (healthError && healthError.code !== 'PGRST116') {
      console.log('❌ 연결 실패:', healthError.message);
      return;
    }
    console.log('✅ 기본 연결 성공\n');

    // 2. 테이블 존재 확인
    console.log('2️⃣ 테이블 존재 확인...');
    const tables = ['customers', 'tasks', 'sms_logs', 'daily_limits', 'user_settings'];
    
    for (const table of tables) {
      const { error } = await supabase.from(table).select('*').limit(0);
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: 존재함`);
      }
    }
    console.log('');

    // 3. RLS 정책 확인 (인증 없이 접근 시도)
    console.log('3️⃣ RLS 정책 확인...');
    const { data: rlsTest, error: rlsError } = await supabase
      .from('customers')
      .select('*')
      .limit(1);
    
    if (rlsError && rlsError.code === 'PGRST301') {
      console.log('✅ RLS 정책 작동 중 (인증 필요)');
    } else if (rlsError) {
      console.log('⚠️  RLS 에러:', rlsError.message);
    } else {
      console.log('⚠️  RLS가 비활성화되었거나 정책이 없습니다');
    }
    console.log('');

    // 4. Auth 서비스 확인
    console.log('4️⃣ Auth 서비스 확인...');
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.log('⚠️  Auth 에러:', authError.message);
    } else {
      console.log('✅ Auth 서비스 정상');
      console.log('   현재 세션:', session ? '로그인됨' : '로그인 안됨');
    }
    console.log('');

    // 5. 실시간 구독 확인
    console.log('5️⃣ 실시간 구독 확인...');
    const channel = supabase.channel('test-connection');
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ 실시간 구독 가능');
        channel.unsubscribe();
      }
    });

    console.log('\n✅ 모든 테스트 완료!');
    
  } catch (error) {
    console.error('❌ 테스트 중 오류:', error.message);
    console.error(error);
  }
}

testConnection();

