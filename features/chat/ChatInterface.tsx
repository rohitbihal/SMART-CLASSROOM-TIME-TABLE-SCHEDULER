import React, { useState, useEffect, useRef } from 'react';
import { User, ChatMessage, Class } from '../../types';
import { SendIcon, ProfileIcon, AIIcon } from '../../components/Icons';

interface ChatInterfaceProps {
    user: User;
    messages: ChatMessage[];
    onSendMessage: (text: string, messageId: string) => Promise<void>;
    isLoading: boolean;
    classProfile?: Class;
}

const TypingIndicator = () => (
    <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center">
             <AIIcon className="h-6 w-6 text-slate-500" />
        </div>
        <div className="bg-slate-200 dark:bg-slate-700 rounded-xl p-3">
            <div className="flex items-center justify-center gap-1.5">
                <div className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="h-2 w-2 bg-slate-400 rounded-full animate-bounce"></div>
            </div>
        </div>
    </div>
);

const Message = ({ msg, isUser }: { msg: ChatMessage, isUser: boolean }) => {
    const alignment = isUser ? 'justify-end' : 'justify-start';
    const bubbleColor = isUser ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100';
    const avatar = isUser
        ? <ProfileIcon className="h-5 w-5" />
        : <AIIcon className="h-5 w-5" />;
    const avatarBg = isUser ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-500';

    const formattedText = msg.text.split('\n').map((line, index) => 
        <span key={index}>{line}<br /></span>
    );

    return (
        <div className={`flex items-end gap-3 w-full ${alignment}`}>
            {!isUser && <div className={`h-10 w-10 rounded-full flex-shrink-0 flex items-center justify-center ${avatarBg}`}>{avatar}</div>}
            <div className="flex flex-col gap-1" style={{ maxWidth: '80%' }}>
                <p className={`text-xs text-slate-500 ${isUser ? 'text-right' : 'text-left'}`}>{msg.author}</p>
                <div className={`rounded-2xl p-3.5 ${bubbleColor}`}>
                    <p className="text-sm leading-relaxed">{formattedText}</p>
                </div>
            </div>
            {isUser && <div className={`h-10 w-10 rounded-full flex-shrink-0 flex items-center justify-center ${avatarBg}`}>{avatar}</div>}
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
            const messageId = `user-msg-${Date.now()}`;
            onSendMessage(trimmedMessage, messageId);
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
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-sm flex flex-col h-[70vh]">
            <div ref={chatContainerRef} className="flex-1 p-6 space-y-8 overflow-y-auto">
                {displayMessages.map((msg) => 
                    <Message key={msg.id} msg={msg} isUser={msg.author === user.username} />
                )}
                {isLoading && <TypingIndicator />}
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-b-2xl">
                <form onSubmit={handleSubmit} className="flex items-center gap-3">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder="Ask about your schedule..."
                        className="flex-1 w-full px-4 py-3 bg-slate-100 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        className="bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-all active:scale-95"
                        disabled={isLoading || !newMessage.trim()}
                    >
                        <SendIcon className="h-6 w-6" />
                    </button>
                </form>
            </div>
        </div>
    );
};