import { createClient } from '@supabase/supabase-js'
import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = 'https://hdeebyhwoogxawjkwufx.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkZWVieWh3b29neGF3amt3dWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MTEzNzMsImV4cCI6MjA4MDQ4NzM3M30.4PF-zTWwg4ZFwgbqPTZHVlQl69WYIgAGGi_-KaVKY7w'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
})
