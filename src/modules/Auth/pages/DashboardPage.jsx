import React, { useState, useCallback } from 'react';
import PageWrapper from '@/components/ui/PageWrapper';
import MainLayout from '@/components/layout/MainLayout';
import ChatHeader from '@/modules/Chat/components/ChatHeader';
import WelcomeScreen from '@/modules/Chat/components/WelcomeScreen';
import ChatInput from '@/modules/Chat/components/ChatInput';
import MessageList from '@/modules/Chat/components/MessageList';

const DashboardPage = () => {
    const [messages, setMessages] = useState([]);

    const handleSendMessage = useCallback((content) => {
        const userMessage = {
            id: Date.now(),
            role: 'user',
            content: content,
        };

        setMessages(prev => [...prev, userMessage]);

        // Simular resposta da IA (será substituída pela integração real na Fase 3)
        setTimeout(() => {
            const aiMessage = {
                id: Date.now() + 1,
                role: 'assistant',
                content: `Esta é uma resposta simulada da Luna para: "${content}"`,
            };
            setMessages(prev => [...prev, aiMessage]);
        }, 1000);
    }, []);

    const hasMessages = messages.length > 0;

    return (
        <MainLayout>
            <ChatHeader />
            <PageWrapper className="flex-1 flex flex-col bg-transparent overflow-hidden min-h-0">
                {hasMessages ? (
                    <MessageList messages={messages} />
                ) : (
                    <WelcomeScreen />
                )}
                <ChatInput onSend={handleSendMessage} />
            </PageWrapper>
        </MainLayout>
    );
};

export default DashboardPage;
