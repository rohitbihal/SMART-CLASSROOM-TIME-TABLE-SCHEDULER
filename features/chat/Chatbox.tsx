import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChatMessage, User } from '../../types';
import { SendIcon, ProfileIcon, UsersIcon, AIIcon } from '../../components/Icons';

export interface Conversation {
    id: string; // channel id
    name: string;
    type: 'class' | 'dm';
}

interface ChatboxProps {
    conversations: Conversation[];
    messages: ChatMessage[];
    onSendMessage: (channel: string, text: string) => Promise<void>;
    currentUser: User;
}

const Message = ({ msg, currentUser }: { msg: ChatMessage, currentUser: User }) => {
    const isUser = msg.authorId === currentUser.profileId;
    const alignment = isUser ? 'justify-end' : 'justify-start';
    const bubbleColor = isUser ? 'bg-accent-primary text-accent-text' : 'bg-bg-tertiary text-text-primary';
    const avatar = <ProfileIcon className="h-5 w-5" />;
    const avatarBg = isUser ? 'bg-blue-100 dark:bg-slate-600 text-accent-primary' : 'bg-bg-tertiary text-text-secondary';

    return (
        <div className={`flex items-end gap-3 w-full ${alignment}`}>
            {!isUser && (
                <div className={`h-10 w-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold ${avatarBg}`}>
                    {msg.author.charAt(0)}
                </div>
            )}
            <div className="flex flex-col gap-1 max-w-[80%]">
                <p className={`text-xs text-text-secondary ${isUser ? 'text-right' : 'text-left'}`}>{msg.author}</p>
                <div className={`rounded-2xl p-3.5 ${bubbleColor}`}>
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                </div>
            </div>
             {isUser && (
                <div className={`h-10 w-10 rounded-full flex-shrink-0 flex items-center justify-center ${avatarBg}`}>
                    {avatar}
                </div>
             )}
        </div>
    );
};

export const Chatbox = ({ conversations, messages, onSendMessage, currentUser }: ChatboxProps) => {
    const [activeChannel, setActiveChannel] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const conversationMap = useMemo(() => new Map(conversations.map(c => [c.id, c.name])), [conversations]);

    useEffect(() => {
        if (conversations.length > 0 && !activeChannel) {
            setActiveChannel(conversations[0].id);
        }
    }, [conversations, activeChannel]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, activeChannel]);

    const messagesInChannel = useMemo(() => {
        return messages.filter(m => m.channel === activeChannel);
    }, [messages, activeChannel]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const text = newMessage.trim();
        if (!text || !activeChannel) return;

        setIsSending(true);
        try {
            await onSendMessage(activeChannel, text);
            setNewMessage('');
        } catch (error) {
            console.error("Failed to send message:", error);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="card-base flex h-[75vh] p-0">
            <div className="w-full md:w-1/3 border-r border-border-primary flex flex-col">
                <div className="p-4 border-b border-border-primary">
                    <h2 className="text-lg font-bold">Conversations</h2>
                </div>
                <div className="flex-grow overflow-y-auto">
                    {conversations.map(conv => (
                        <button key={conv.id} onClick={() => setActiveChannel(conv.id)}
                            className={`w-full text-left p-4 flex items-center gap-3 transition-colors ${activeChannel === conv.id ? 'bg-accent-primary/10' : 'hover:bg-bg-tertiary'}`}
                        >
                            <div className="h-10 w-10 rounded-full bg-bg-tertiary flex items-center justify-center font-bold flex-shrink-0">
                                {conv.type === 'class' ? <UsersIcon className="h-5 w-5" /> : conv.name.charAt(0)}
                            </div>
                            <div>
                                <p className="font-semibold truncate">{conv.name}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
            <div className="w-full md:w-2/3 flex flex-col">
                {activeChannel ? (
                    <>
                        <div className="p-4 border-b border-border-primary">
                             <h2 className="text-lg font-bold">{conversationMap.get(activeChannel) || 'Chat'}</h2>
                        </div>
                        <div ref={chatContainerRef} className="flex-1 p-6 space-y-6 overflow-y-auto bg-gray-50 dark:bg-slate-900/50">
                           {messagesInChannel.length > 0 ? messagesInChannel.map(msg => (
                               <Message key={msg.id} msg={msg} currentUser={currentUser} />
                           )) : (
                            <div className="text-center text-text-secondary p-8">No messages in this chat yet.</div>
                           )}
                        </div>
                        <div className="p-4 border-t border-border-primary bg-bg-primary/50">
                            <form onSubmit={handleSubmit} className="flex items-center gap-3">
                               <input
                                    type="text"
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    className="input-base"
                                    disabled={isSending}
                                />
                               <button type="submit" className="btn-primary p-3" disabled={isSending || !newMessage.trim()}>
                                   <SendIcon className="h-6 w-6" />
                               </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-text-secondary p-4 text-center">
                        <p>Select a conversation to start chatting.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
