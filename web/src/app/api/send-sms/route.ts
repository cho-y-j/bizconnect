import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { customerId, message, type = 'send_sms' } = body;

        if (!customerId || !message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Insert task into Supabase
        const { data, error } = await supabase
            .from('tasks')
            .insert([
                {
                    customer_id: customerId,
                    message_content: message,
                    type: type,
                    status: 'pending',
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

