import React, { useEffect, useState } from 'react';
import {
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    useColorScheme,
    View,
    Button,
    Alert,
    PermissionsAndroid,
    Platform,
} from 'react-native';
import { supabase } from './lib/supabaseClient'; // We will create this
import SmsAndroid from 'react-native-get-sms-android';
import CallDetectorManager from 'react-native-call-detection';

// Types
type Task = {
    id: string;
    type: string;
    message_content: string;
    customer_phone: string;
    status: string;
};

function App(): JSX.Element {
    const isDarkMode = useColorScheme() === 'dark';
    const [status, setStatus] = useState('Idle');
    const [tasks, setTasks] = useState<Task[]>([]);

    useEffect(() => {
        requestPermissions();
        startCallListener();
        subscribeToTasks();
    }, []);

    const requestPermissions = async () => {
        if (Platform.OS === 'android') {
            try {
                const grants = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.SEND_SMS,
                    PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
                    PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
                    PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
                ]);
                console.log('Permissions:', grants);
            } catch (err) {
                console.warn(err);
            }
        }
    };

    const startCallListener = () => {
        // Basic call detection setup
        try {
            new CallDetectorManager((event: string, phoneNumber: string) => {
                console.log('Call event:', event, phoneNumber);
                if (event === 'Disconnected') {
                    // Handle call ended - Trigger Smart Callback
                    handleCallEnded(phoneNumber);
                }
            },
                true, // read phone number
                () => { }, // permission denied callback
                {
                    title: 'Phone State Permission',
                    message: 'This app needs access to your phone state to detect calls.',
                });
        } catch (e) {
            console.error("Call detector error", e);
        }
    };

    const handleCallEnded = (phoneNumber: string) => {
        // Logic to check if we should send a callback
        // For MVP, just log it
        console.log(`Call ended with ${phoneNumber}. Checking for callback rules...`);
        setStatus(`Call ended: ${phoneNumber}`);
    };

    const subscribeToTasks = () => {
        // Listen for new tasks assigned to this user (simplified)
        const channel = supabase
            .channel('public:tasks')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'tasks' },
                (payload) => {
                    console.log('New task received:', payload);
                    const newTask = payload.new as Task;
                    if (newTask.status === 'pending' && newTask.type === 'send_sms') {
                        processSmsTask(newTask);
                    }
                }
            )
            .subscribe();

        setStatus('Listening for tasks...');
    };

    const processSmsTask = (task: Task) => {
        // Throttling logic would go here (Queue system)
        // For MVP, send immediately
        sendSms(task.customer_phone, task.message_content, task.id);
    };

    const sendSms = (phoneNumber: string, message: string, taskId: string) => {
        SmsAndroid.autoSend(
            phoneNumber,
            message,
            (fail) => {
                console.error('Failed to send SMS:', fail);
                updateTaskStatus(taskId, 'failed');
            },
            (success) => {
                console.log('SMS sent successfully:', success);
                updateTaskStatus(taskId, 'completed');
            }
        );
    };

    const updateTaskStatus = async (taskId: string, status: string) => {
        await supabase.from('tasks').update({ status }).eq('id', taskId);
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
            <ScrollView contentContainerStyle={styles.scrollView}>
                <View style={styles.header}>
                    <Text style={styles.title}>BizConnect Mobile</Text>
                    <Text style={styles.subtitle}>Status: {status}</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Today's Stats</Text>
                    <Text>Sent: 0</Text>
                    <Text>Failed: 0</Text>
                </View>

                <Button title="Test Permission" onPress={requestPermissions} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    scrollView: {
        padding: 20,
    },
    header: {
        marginBottom: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    subtitle: {
        fontSize: 14,
        color: '#4B5563',
        marginTop: 5,
    },
    card: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    }
});

export default App;
