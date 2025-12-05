/**
 * psql을 사용하여 Supabase 마이그레이션 실행
 * 
 * 필수 조건:
 * - PostgreSQL 클라이언트 (psql) 설치 필요
 * - Supabase 데이터베이스 연결 정보 필요
 * 
 * 사용법:
 * 1. 환경 변수 설정:
 *    SUPABASE_DB_URL="postgresql://postgres:[password]@[host]:5432/postgres"
 * 2. 실행: node scripts/run-migration-psql.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dbUrl = process.env.SUPABASE_DB_URL;

if (!dbUrl) {
  console.error('❌ SUPABASE_DB_URL 환경 변수가 설정되지 않았습니다.');
  console.log('\n📝 설정 방법:');
  console.log('1. Supabase Dashboard > Settings > Database');
  console.log('2. Connection string 복사');
  console.log('3. 환경 변수 설정:');
  console.log('   Windows PowerShell: $env:SUPABASE_DB_URL="postgresql://..."');
  console.log('   Windows CMD: set SUPABASE_DB_URL=postgresql://...');
  console.log('   Linux/Mac: export SUPABASE_DB_URL="postgresql://..."');
  console.log('\n예시:');
  console.log('postgresql://postgres:[YOUR-PASSWORD]@db.hdeebyhwoogxawjkwufx.supabase.co:5432/postgres');
  process.exit(1);
}

const migrationPath = path.join(__dirname, '..', 'supabase', 'migration.sql');

if (!fs.existsSync(migrationPath)) {
  console.error(`❌ 마이그레이션 파일을 찾을 수 없습니다: ${migrationPath}`);
  process.exit(1);
}

console.log('🚀 Supabase 마이그레이션 시작...');
console.log(`📁 파일: ${migrationPath}`);
console.log(`🔗 DB: ${dbUrl.replace(/:[^:@]+@/, ':***@')}\n`);

try {
  // psql 명령 실행
  const command = `psql "${dbUrl}" -f "${migrationPath}"`;
  
  console.log('실행 중...\n');
  const output = execSync(command, { 
    encoding: 'utf-8',
    stdio: 'inherit'
  });
  
  console.log('\n✅ 마이그레이션 완료!');
  console.log('\n다음 단계:');
  console.log('1. Supabase Dashboard > Table Editor에서 테이블 확인');
  console.log('2. RLS 정책 확인');
  console.log('3. web/.env.local 파일에 환경 변수 설정');
  
} catch (error) {
  console.error('\n❌ 오류 발생:', error.message);
  console.log('\n💡 psql이 설치되어 있는지 확인하세요:');
  console.log('   Windows: https://www.postgresql.org/download/windows/');
  console.log('   Mac: brew install postgresql');
  console.log('   Linux: sudo apt-get install postgresql-client');
  process.exit(1);
}

