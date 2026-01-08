export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    thought?: string;
    status?: 'sending' | 'sent' | 'error';
}

export interface Chat {
    id: string;
    title: string;
    lastMessage?: string;
    updatedAt: string;
}

export type RootStackParamList = {
    Login: undefined;
    Home: undefined;
    Chat: { chatId?: string };
};
