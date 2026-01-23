import React, { useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';

const MessageList = ({ messages }) => {
    const bottomRef = useRef(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    if (!messages || messages.length === 0) {
        return null;
    }

    return (
        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6 scrollbar-hide min-h-0">
            {messages.map((msg, index) => (
                <div key={msg.id || index} className="group">
                    <MessageBubble
                        message={msg}
                        isUser={msg.role === 'user'}
                    />
                </div>
            ))}
            <div ref={bottomRef} />
        </div>
    );
};

export default MessageList;
