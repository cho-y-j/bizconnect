export interface Customer {
    id: string;
    name: string;
    phone_number: string;
    group?: string;
    birthday?: string;
    notes?: string;
    created_at: string;
}

export interface MessageTemplate {
    id: string;
    title: string;
    content: string;
    category: 'birthday' | 'insurance' | 'car' | 'real_estate' | 'general';
}

export interface Task {
    id: string;
    type: 'send_sms' | 'call_back';
    status: 'pending' | 'completed' | 'failed';
    customer_id: string;
    customer_name: string;
    customer_phone: string;
    message_content: string;
    scheduled_at?: string;
    created_at: string;
}
