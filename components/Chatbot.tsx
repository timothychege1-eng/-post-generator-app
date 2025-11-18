

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Chat } from '@google/genai';
import { ChatBubbleIcon, CloseIcon, SendIcon, LoadingSpinner } from './icons';
import { getAiClient } from '../services/geminiService';

interface Message {
    role: 'user' | 'model';
    text: string;
}

const Chatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', text: "Hello! I'm your AI assistant for the Kenya Data & AI Society. How can we spark a great conversation today?" }
    ]);
    const chatRef = useRef<Chat | null>(null);
    const isInitializing = useRef(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const initializeChat = useCallback(async () => {
        if (chatRef.current || isInitializing.current) return;

        isInitializing.current = true;
        try {
            const ai = getAiClient();
            chatRef.current = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: {
                    systemInstruction: 'You are a friendly and expert AI assistant for the Kenya Data & AI Society. Your role is to help our community members brainstorm content ideas, refine their messaging, and explore topics related to data, AI, leadership, and public speaking within a Kenyan context. Embody our brand voice: welcoming, inspiring, and community-focused. Provide clear, concise, and actionable advice.',
                },
            });
        } catch (error: any) {
            console.error("Failed to initialize chatbot:", error);
            setMessages(prev => [...prev, { role: 'model', text: `I'm currently offline. ${error.message}` }]);
        } finally {
            isInitializing.current = false;
        }
    }, []);

    const handleToggleOpen = () => {
        setIsOpen(prev => {
            const newIsOpen = !prev;
            if (newIsOpen && !chatRef.current) {
                initializeChat();
            }
            return newIsOpen;
        });
    };

    const handleSendMessage = useCallback(async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim() || isLoading || !chatRef.current) return;

        const userMessage: Message = { role: 'user', text: input.trim() };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await chatRef.current.sendMessage({ message: userMessage.text });
            const modelMessage: Message = { role: 'model', text: response.text };
            setMessages(prev => [...prev, modelMessage]);
        } catch (error) {
            console.error("Error sending message to Gemini:", error);
            const errorMessage: Message = { role: 'model', text: "Sorry, I encountered an error. Please try again." };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading]);

    return (
        <>
            <button
                onClick={handleToggleOpen}
                className="fixed bottom-6 right-6 bg-[var(--color-accent-primary)] text-white p-3 rounded-full shadow-lg hover:bg-[var(--color-accent-primary-hover)] transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--color-bg-primary)] focus:ring-[var(--color-accent-primary)] z-50"
                aria-label={isOpen ? "Close chat" : "Open chat"}
            >
                {isOpen ? <CloseIcon/> : <ChatBubbleIcon />}
            </button>

            {isOpen && (
                <div className="fixed bottom-24 right-6 w-full max-w-sm h-[70vh] max-h-[600px] bg-[var(--color-bg-secondary)] rounded-xl shadow-2xl border border-[var(--color-border-primary)] flex flex-col z-50 animate-fade-in-up">
                    <header className="flex items-center justify-between p-4 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]/80 backdrop-blur-sm rounded-t-xl">
                        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">AI Assistant</h3>
                        <button onClick={() => setIsOpen(false)} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]" aria-label="Close chat">
                            <CloseIcon />
                        </button>
                    </header>

                    <div className="flex-1 p-4 overflow-y-auto space-y-4 overscroll-contain">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-lg px-4 py-2 ${msg.role === 'user' ? 'bg-[var(--color-accent-primary)] text-white' : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]'}`}>
                                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                </div>
                            </div>
                        ))}
                         {isLoading && (
                            <div className="flex justify-start">
                                <div className="max-w-[80%] rounded-lg px-4 py-2 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] flex items-center">
                                    <LoadingSpinner />
                                    <span className="ml-2 text-sm">Thinking...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="p-4 border-t border-[var(--color-border-primary)]">
                        <div className="flex items-center bg-[var(--color-bg-tertiary)] rounded-lg">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask me anything..."
                                className="w-full bg-transparent p-3 text-[var(--color-text-primary)] focus:outline-none"
                                disabled={isLoading || !chatRef.current}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        handleSendMessage(e);
                                    }
                                }}
                            />
                            <button type="submit" disabled={!input.trim() || isLoading} className="p-3 text-[var(--color-text-secondary)] hover:text-[var(--color-text-accent)] disabled:text-[var(--color-bg-interactive)] disabled:cursor-not-allowed transition-colors">
                                <SendIcon />
                            </button>
                        </div>
                    </form>
                </div>
            )}
            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(1rem); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.3s ease-out forwards;
                }
            `}</style>
        </>
    );
};

export default Chatbot;