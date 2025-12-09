import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { customerId, message, type = 'send_sms' } = body;

        if (!customerId || !message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 현재 사용자 가져오기
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 고객 정보 가져오기 (전화번호 필요)
        const { data: customer, error: customerError } = await supabase
            .from('customers')
            .select('id, phone, name, user_id')
            .eq('id', customerId)
            .eq('user_id', user.id)
            .single();

        if (customerError || !customer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        // Insert task into Supabase
        const { data, error } = await supabase
            .from('tasks')
            .insert([
                {
                    user_id: user.id,
                    customer_id: customerId,
                    customer_phone: customer.phone.replace(/\D/g, ''),
                    customer_name: customer.name,
                    message_content: message,
                    type: type,
                    status: 'pending',
                    priority: 0,
                },
            ])
            .select();

        if (error) {
            console.error('Supabase error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, task: data[0] });
    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

