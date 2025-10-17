import React, { useState, useEffect, useRef } from 'react';
import { User, ChatMessage, Class } from '../../types';
import { SendIcon, ProfileIcon, AIIcon } from '../../components/Icons';

interface ChatInterfaceProps {
    user: User;
    messages: ChatMessage[];
    onSendMessage: (text: string) => Promise<void>;
    isLoading: boolean;
    classProfile?: Class;
}

const TypingIndicator = () => (
    <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center">
             <AIIcon className="h-5 w-5 text-gray-500" />
        </div>
        <div className="bg-gray-200 dark:bg-slate-700 rounded-lg p-3">
            <div className="flex items-center justify-center gap-1.5">
                <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></div>
            </div>
        </div>
    </div>
);

const Message = ({ msg, isUser }: { msg: ChatMessage, isUser: boolean }) => {
    const alignment = isUser ? 'justify-end' : 'justify-start';
    const bubbleColor = isUser ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-gray-100';
    const avatar = isUser
        ? <ProfileIcon className="h-5 w-5" />
        : <AIIcon className="h-5 w-5" />;
    const avatarBg = isUser ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600' : 'bg-gray-200 dark:bg-slate-700 text-gray-500';

    const formattedText = msg.text.split('\n').map((line, index) => 
        <span key={index}>{line}<br /></span>
    );

    return (
        <div className={`flex items-start gap-3 w-full ${alignment}`}>
            {!isUser && <div className={`h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center ${avatarBg}`}>{avatar}</div>}
            <div className="flex flex-col" style={{ maxWidth: '80%' }}>
                <div className={`rounded-lg p-3 ${bubbleColor}`}>
                    <p className="text-sm">{formattedText}</p>
                </div>
                <p className={`text-xs text-gray-400 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>{msg.author}</p>
            </div>
            {isUser && <div className={`h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center ${avatarBg}`}>{avatar}</div>}
        </div>
    );
};

export const ChatInterface = ({ user, messages, onSendMessage, isLoading, classProfile }: ChatInterfaceProps) => {
    const [newMessage, setNewMessage] = useState('');
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedMessage = newMessage.trim();
        if (trimmedMessage) {
            onSendMessage(trimmedMessage);
            setNewMessage('');
        }
    };

    const initialMessage: ChatMessage = {
        id: `init-msg-${Date.now()}`,
        channel: 'query',
        author: 'Campus AI',
        role: 'admin',
        text: `Hello ${user.username}! I'm your campus assistant. How can I help you today? You can ask me about your schedule, subjects, or faculty for your class (${classProfile?.name || 'N/A'}).`,
        timestamp: Date.now(),
        classId: classProfile?.id || ''
    };
    
    const displayMessages = messages.length > 0 ? messages : [initialMessage];

    return (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-md flex flex-col h-[70vh]">
            <div ref={chatContainerRef} className="flex-1 p-6 space-y-6 overflow-y-auto">
                {displayMessages.map((msg, index) => 
                    <Message key={`${msg.timestamp}-${index}`} msg={msg} isUser={msg.author === user.username} />
                )}
                {isLoading && <TypingIndicator />}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-slate-700">
                <form onSubmit={handleSubmit} className="flex items-center gap-3">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder="Ask about your schedule..."
                        className="flex-1 w-full px-4 py-3 bg-gray-100 dark:bg-slate-900/50 border border-gray-300 dark:border-slate-600 text-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        className="bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                        disabled={isLoading || !newMessage.trim()}
                    >
                        <SendIcon className="h-6 w-6" />
                    </button>
                </form>
            </div>
        </div>
    );
};