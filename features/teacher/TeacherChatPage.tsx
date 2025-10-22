import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChatMessage } from '../../types';
import { SendIcon, ProfileIcon, AIIcon, SearchIcon } from '../../components/Icons';
import { useAppContext } from '../../context/AppContext';

const TypingIndicator = () => (
    <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-bg-tertiary flex-shrink-0 flex items-center justify-center">
             <AIIcon className="h-6 w-6 text-text-secondary" />
        </div>
        <div className="bg-bg-tertiary rounded-xl p-3">
            <div className="flex items-center justify-center gap-1.5">
                <div className="h-2 w-2 bg-text-secondary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="h-2 w-2 bg-text-secondary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="h-2 w-2 bg-text-secondary rounded-full animate-bounce"></div>
            </div>
        </div>
    </div>
);

const Message = ({ msg, isUser }: { msg: ChatMessage, isUser: boolean }) => {
    const alignment = isUser ? 'justify-end' : 'justify-start';
    const bubbleColor = isUser ? 'bg-accent-primary text-accent-text' : 'bg-bg-tertiary text-text-primary';
    const avatar = isUser ? <ProfileIcon className="h-5 w-5" /> : <AIIcon className="h-5 w-5" />;
    const avatarBg = isUser ? 'bg-blue-100 dark:bg-slate-600 text-accent-primary' : 'bg-bg-tertiary text-text-secondary';
    const formattedText = msg.text.split('\n').map((line, index) => <span key={index}>{line}<br /></span>);

    return (
        <div className={`flex items-end gap-3 w-full ${alignment}`}>
            {!isUser && <div className={`h-10 w-10 rounded-full flex-shrink-0 flex items-center justify-center ${avatarBg}`}>{avatar}</div>}
            <div className="flex flex-col gap-1 w-full max-w-[80%]">
                <p className={`text-xs text-text-secondary ${isUser ? 'text-right' : 'text-left'}`}>{msg.author}</p>
                <div className={`rounded-2xl p-3.5 ${bubbleColor}`}>
                    <p className="text-sm leading-relaxed">{formattedText}</p>
                </div>
                {msg.groundingChunks && msg.groundingChunks.length > 0 && (
                    <div className="mt-2 text-xs">
                        <p className="font-semibold text-text-secondary mb-1">Sources:</p>
                        <div className="flex flex-wrap gap-2">
                            {msg.groundingChunks.map((chunk, index) => chunk.web && (
                                <a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" key={index} className="bg-bg-primary border border-border-primary px-2 py-1 rounded-md hover:bg-border-primary truncate max-w-xs">
                                    <SearchIcon className="h-3 w-3 inline-block mr-1" />
                                    {chunk.web.title}
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            {isUser && <div className={`h-10 w-10 rounded-full flex-shrink-0 flex items-center justify-center ${avatarBg}`}>{avatar}</div>}
        </div>
    );
};

export const TeacherChatPage = () => {
    const { user, chatMessages, handleTeacherAskAI } = useAppContext();
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    
    const channelId = useMemo(() => user ? `teacher-ai-${user.profileId}` : '', [user]);

    const teacherAiMessages = useMemo(() => {
        return chatMessages.filter(m => m.channel === channelId);
    }, [chatMessages, channelId]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [teacherAiMessages, isLoading]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedMessage = newMessage.trim();
        if (trimmedMessage && user) {
            const messageId = `user-msg-${Date.now()}`;
            setIsLoading(true);
            try {
                await handleTeacherAskAI(trimmedMessage, messageId);
            } catch (error) {
                console.error("Failed to get AI response:", error);
            } finally {
                setIsLoading(false);
            }
            setNewMessage('');
        }
    };

    if (!user) return null;

    const initialMessage: ChatMessage = {
        id: `init-msg-teacher`,
        channel: channelId,
        classId: channelId,
        author: 'Campus AI',
        role: 'admin',
        text: `Hello ${user.username}! As your AI assistant, I can help find teaching resources, explain concepts, or draft lesson plans. What can I help you with today?`,
        timestamp: Date.now(),
    };

    const displayMessages = teacherAiMessages.length > 0 ? teacherAiMessages : [initialMessage];

    return (
        <div className="card-base flex flex-col h-[75vh] p-0">
            <div ref={chatContainerRef} className="flex-1 p-6 space-y-8 overflow-y-auto">
                {displayMessages.map((msg) => 
                    <Message key={msg.id} msg={msg} isUser={msg.author === user.username} />
                )}
                {isLoading && <TypingIndicator />}
            </div>
            <div className="p-4 border-t border-border-primary bg-bg-primary/50 rounded-b-xl">
                <form onSubmit={handleSubmit} className="flex items-center gap-3">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder="Ask for lesson ideas, resources..."
                        className="input-base"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        className="btn-primary p-3"
                        disabled={isLoading || !newMessage.trim()}
                    >
                        <SendIcon className="h-6 w-6" />
                    </button>
                </form>
            </div>
        </div>
    );
};