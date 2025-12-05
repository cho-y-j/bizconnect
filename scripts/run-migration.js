/**
 * Supabase 마이그레이션 실행 스크립트
 * 
 * 사용법:
 * 1. Supabase 프로젝트의 Service Role Key가 필요합니다
 * 2. 환경 변수 설정:
 *    SUPABASE_URL=your_supabase_url
 *    SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
 * 3. 실행: node scripts/run-migration.js
 */

const fs = require('fs');
const path = require('path');

// Supabase Management API를 사용하여 SQL 실행
async function runMigration() {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://hdeebyhwoogxawjkwufx.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY 환경 변수가 설정되지 않았습니다.');
    console.log('\n📝 설정 방법:');
    console.log('1. Supabase Dashboard > Settings > API');
    console.log('2. Service Role Key 복사');
    console.log('3. 환경 변수 설정:');
    console.log('   Windows PowerShell: $env:SUPABASE_SERVICE_ROLE_KEY="your_key"');
    console.log('   Windows CMD: set SUPABASE_SERVICE_ROLE_KEY=your_key');
    console.log('   Linux/Mac: export SUPABASE_SERVICE_ROLE_KEY=your_key');
    process.exit(1);
  }

  // 마이그레이션 파일 읽기
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migration.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('🚀 Supabase 마이그레이션 시작...');
  console.log(`📁 파일: ${migrationPath}`);
  console.log(`🔗 URL: ${supabaseUrl}\n`);

  try {
    // Supabase REST API를 사용하여 SQL 실행
    // 참고: Supabase는 직접 SQL 실행 API를 제공하지 않으므로,
    // Supabase CLI를 사용하거나 Dashboard에서 실행해야 합니다.
    
    console.log('⚠️  Supabase Management API는 직접 SQL 실행을 지원하지 않습니다.');
    console.log('\n✅ 대신 다음 방법 중 하나를 사용하세요:\n');
    
    console.log('방법 1: Supabase CLI 사용 (권장)');
    console.log('  1. npm install -g supabase');
    console.log('  2. supabase login');
    console.log('  3. supabase db push --db-url "postgresql://postgres:[password]@[host]:5432/postgres"');
    console.log('     또는 supabase link --project-ref [project-ref]');
    console.log('  4. supabase db reset 또는 supabase migration up\n');
    
    console.log('방법 2: Supabase Dashboard 사용');
    console.log('  1. https://supabase.com/dashboard 접속');
    console.log('  2. 프로젝트 선택');
    console.log('  3. SQL Editor 메뉴 클릭');
    console.log('  4. supabase/migration.sql 파일 내용 복사하여 붙여넣기');
    console.log('  5. Run 버튼 클릭\n');
    
    console.log('방법 3: 이 스크립트를 수정하여 psql 사용');
    console.log('  (PostgreSQL 클라이언트 필요)\n');

    // 대안: psql을 사용하는 방법 안내
    console.log('💡 psql을 사용하려면:');
    console.log(`  psql "postgresql://postgres:[password]@[host]:5432/postgres" -f ${migrationPath}`);
    
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
}

runMigration();

