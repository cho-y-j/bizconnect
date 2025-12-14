/**
 * Supabase에서 tasks와 sms_logs 상태 확인 스크립트
 * Supabase REST API를 직접 사용
 */

// Supabase 연결 정보
const supabaseUrl = 'https://hdeebyhwoogxawjkwufx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkZWVieWh3b29neGF3amt3dWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MTEzNzMsImV4cCI6MjA4MDQ4NzM3M30.4PF-zTWwg4ZFwgbqPTZHVlQl69WYIgAGGi_-KaVKY7w';

async function fetchFromSupabase(table, query = '') {
  const url = `${supabaseUrl}/rest/v1/${table}${query}`;
  const response = await fetch(url, {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}, ${await response.text()}`);
  }
  
  return await response.json();
}

async function checkTasksStatus() {
  console.log('🔍 ===== Supabase Tasks & SMS Logs 상태 확인 =====\n');

  try {
    // 1. 최근 tasks 확인 (최근 10개)
    console.log('📋 최근 tasks 확인 중...');
    let tasks;
    try {
      tasks = await fetchFromSupabase('tasks', '?select=id,status,type,customer_phone,message_content,created_at,updated_at&order=created_at.desc&limit=10');
    } catch (tasksError) {
      console.error('❌ Tasks 조회 실패:', tasksError.message);
      tasks = [];
    }
    
    if (tasks && tasks.length > 0) {
      console.log(`✅ Tasks 조회 성공: ${tasks?.length || 0}개\n`);
      if (tasks && tasks.length > 0) {
        console.log('📊 최근 Tasks:');
        tasks.forEach((task, index) => {
          console.log(`  ${index + 1}. ID: ${task.id}`);
          console.log(`     Status: ${task.status}`);
          console.log(`     Type: ${task.type}`);
          console.log(`     Phone: ${task.customer_phone}`);
          console.log(`     Message: ${task.message_content?.substring(0, 30)}...`);
          console.log(`     Created: ${task.created_at}`);
          console.log(`     Updated: ${task.updated_at}`);
          console.log('');
        });
      }
    }

    // 2. 최근 sms_logs 확인 (최근 10개)
    console.log('\n📋 최근 sms_logs 확인 중...');
    let logs;
    try {
      logs = await fetchFromSupabase('sms_logs', '?select=id,task_id,status,phone_number,message,sent_at,error_message&order=sent_at.desc&limit=10');
    } catch (logsError) {
      console.error('❌ SMS Logs 조회 실패:', logsError.message);
      logs = [];
    }
    
    if (logs && logs.length > 0) {
      console.log(`✅ SMS Logs 조회 성공: ${logs?.length || 0}개\n`);
      if (logs && logs.length > 0) {
        console.log('📊 최근 SMS Logs:');
        logs.forEach((log, index) => {
          console.log(`  ${index + 1}. ID: ${log.id}`);
          console.log(`     Task ID: ${log.task_id}`);
          console.log(`     Status: ${log.status}`);
          console.log(`     Phone: ${log.phone_number}`);
          console.log(`     Message: ${log.message?.substring(0, 30)}...`);
          console.log(`     Sent At: ${log.sent_at}`);
          if (log.error_message) {
            console.log(`     Error: ${log.error_message}`);
          }
          console.log('');
        });
      }
    }

    // 3. 상태별 통계
    console.log('\n📊 상태별 통계:');
    
    // Tasks 상태별 카운트
    let tasksStats;
    try {
      tasksStats = await fetchFromSupabase('tasks', '?select=status&order=created_at.desc&limit=100');
    } catch (e) {
      tasksStats = [];
    }

    if (tasksStats && tasksStats.length > 0) {
      const statusCounts = {};
      tasksStats.forEach(task => {
        statusCounts[task.status] = (statusCounts[task.status] || 0) + 1;
      });
      console.log('  Tasks 상태:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`    ${status}: ${count}개`);
      });
    }

    // SMS Logs 상태별 카운트
    let logsStats;
    try {
      logsStats = await fetchFromSupabase('sms_logs', '?select=status&order=sent_at.desc&limit=100');
    } catch (e) {
      logsStats = [];
    }

    if (logsStats && logsStats.length > 0) {
      const statusCounts = {};
      logsStats.forEach(log => {
        statusCounts[log.status] = (statusCounts[log.status] || 0) + 1;
      });
      console.log('  SMS Logs 상태:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`    ${status}: ${count}개`);
      });
    }

    // 4. Pending 상태 작업 확인
    console.log('\n⏳ Pending 상태 작업 확인:');
    let pendingTasks;
    try {
      pendingTasks = await fetchFromSupabase('tasks', '?select=id,status,created_at,updated_at&status=eq.pending&order=created_at.desc&limit=10');
    } catch (pendingError) {
      console.error('❌ Pending tasks 조회 실패:', pendingError.message);
      pendingTasks = [];
    }
    
    if (pendingTasks && pendingTasks.length > 0) {
      console.log(`  Pending tasks: ${pendingTasks?.length || 0}개`);
      if (pendingTasks && pendingTasks.length > 0) {
        console.log('  ⚠️  Pending 상태인 작업들 (모바일 앱이 처리하지 못한 것):');
        pendingTasks.forEach(task => {
          const created = new Date(task.created_at);
          const now = new Date();
          const minutesAgo = Math.floor((now - created) / 1000 / 60);
          console.log(`    - ID: ${task.id}, 생성된 지 ${minutesAgo}분 전`);
        });
      }
    }

    // 5. Pending 상태 SMS Logs 확인
    let pendingLogs;
    try {
      pendingLogs = await fetchFromSupabase('sms_logs', '?select=id,task_id,status,sent_at&status=eq.pending&order=sent_at.desc&limit=10');
    } catch (pendingLogsError) {
      console.error('❌ Pending SMS logs 조회 실패:', pendingLogsError.message);
      pendingLogs = [];
    }
    
    if (pendingLogs && pendingLogs.length > 0) {
      console.log(`  Pending SMS logs: ${pendingLogs?.length || 0}개`);
      if (pendingLogs && pendingLogs.length > 0) {
        console.log('  ⚠️  Pending 상태인 SMS 로그들 (모바일 앱이 처리하지 못한 것):');
        pendingLogs.forEach(log => {
          const sent = new Date(log.sent_at);
          const now = new Date();
          const minutesAgo = Math.floor((now - sent) / 1000 / 60);
          console.log(`    - Task ID: ${log.task_id}, 생성된 지 ${minutesAgo}분 전`);
        });
      }
    }

    console.log('\n✅ ===== 확인 완료 =====');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

checkTasksStatus();

