'use client';

import React, {useState, useEffect, useRef} from 'react';
import ChatMessage from './ChatMessage';
import {sendMessage, getChatHistory} from '@/lib/api';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    country?: string;
    timestamp: string;
    error?: boolean;
}

const ChatInterface: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [retryMessage, setRetryMessage] = useState<{ question: string, country?: string } | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        loadChatHistory();

        // Initialize speech recognition
        if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;

            recognitionRef.current.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setInput(transcript);
                setIsListening(false);
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
                setError('Voice recognition failed. Please try typing instead.');
                setTimeout(() => setError(null), 3000);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
    };

    const loadChatHistory = async () => {
        try {
            const history = await getChatHistory();
            if (Array.isArray(history) && history.length > 0) {
                const formattedMessages = history.flatMap((item: any) => [
                    {
                        role: 'user' as const,
                        content: item.question,
                        timestamp: item.created_at
                    },
                    {
                        role: 'assistant' as const,
                        content: item.answer,
                        country: item.country,
                        timestamp: item.created_at
                    }
                ]);
                setMessages(formattedMessages);
            }
        } catch (error: any) {
            console.error('Failed to load chat history:', error);
        }
    };

    const handleSend = async (retryData?: { question: string, country?: string }) => {
        const questionToSend = retryData?.question || input.trim();
        const countryToUse = retryData?.country !== undefined ? retryData.country : selectedCountry;

        if (!questionToSend || loading) return;

        setError(null);
        setRetryMessage(null);

        const userMessage: Message = {
            role: 'user',
            content: questionToSend,
            timestamp: new Date().toISOString()
        };

        setMessages((prev) => [...prev, userMessage]);
        if (!retryData) setInput('');
        setLoading(true);

        try {
            const response = await sendMessage(questionToSend, countryToUse || undefined);

            const aiMessage: Message = {
                role: 'assistant',
                content: response.answer,
                country: response.country,
                timestamp: new Date().toISOString()
            };

            setMessages((prev) => [...prev, aiMessage]);
        } catch (error: any) {
            console.error('Failed to send message:', error);

            const errorMessage: Message = {
                role: 'assistant',
                content: error.message || 'Sorry, I encountered an error. Please try again.',
                timestamp: new Date().toISOString(),
                error: true
            };

            setMessages((prev) => [...prev, errorMessage]);
            setError(error.message || 'Failed to send message');
            setRetryMessage({question: questionToSend, country: countryToUse || undefined});
        } finally {
            setLoading(false);
        }
    };

    const handleRetry = () => {
        if (retryMessage) {
            handleSend(retryMessage);
        }
    };

    const handleVoiceInput = () => {
        if (!recognitionRef.current) {
            setError('Voice recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
            setTimeout(() => setError(null), 5000);
            return;
        }

        try {
            if (isListening) {
                recognitionRef.current.stop();
                setIsListening(false);
            } else {
                recognitionRef.current.start();
                setIsListening(true);
            }
        } catch (error) {
            console.error('Voice input error:', error);
            setError('Failed to start voice input. Please try again.');
            setTimeout(() => setError(null), 3000);
            setIsListening(false);
        }
    };

    const handleExportChat = () => {
        try {
            if (messages.length === 0) {
                setError('No messages to export');
                setTimeout(() => setError(null), 3000);
                return;
            }

            const chatText = messages.map(msg => {
                const time = new Date(msg.timestamp).toLocaleString();
                const role = msg.role === 'user' ? 'You' : 'AI Assistant';
                const country = msg.country ? ` [${msg.country}]` : '';
                return `[${time}] ${role}${country}:\n${msg.content}\n`;
            }).join('\n');

            const blob = new Blob([chatText], {type: 'text/plain'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `study-abroad-chat-${new Date().toISOString().split('T')[0]}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export error:', error);
            setError('Failed to export chat. Please try again.');
            setTimeout(() => setError(null), 3000);
        }
    };

    const handleClearChat = () => {
        if (confirm('Are you sure you want to clear the chat? This will only clear the display, not delete your history.')) {
            setMessages([]);
            setError(null);
            setRetryMessage(null);
        }
    };

    const filteredMessages = searchQuery
        ? messages.filter(msg => msg.content.toLowerCase().includes(searchQuery.toLowerCase()))
        : messages;

    // Country data with SVG icons
    const countries = [
        {
            name: 'All Countries',
            code: null,
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
            )
        },
        {
            name: 'USA',
            code: 'USA',
            icon: (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="4" width="20" height="16" rx="2" fill="#B22234"/>
                    <path d="M2 6h20M2 8h20M2 10h20M2 12h20M2 14h20M2 16h20M2 18h20" stroke="white" strokeWidth="1.2"/>
                    <rect x="2" y="4" width="9" height="7" rx="1" fill="#3C3B6E"/>
                    <circle cx="4" cy="6" r="0.5" fill="white"/>
                    <circle cx="6" cy="6" r="0.5" fill="white"/>
                    <circle cx="8" cy="6" r="0.5" fill="white"/>
                    <circle cx="10" cy="6" r="0.5" fill="white"/>
                </svg>
            )
        },
        {
            name: 'UK',
            code: 'UK',
            icon: (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="4" width="20" height="16" rx="2" fill="#012169"/>
                    <path d="M2 4L22 20M22 4L2 20" stroke="white" strokeWidth="2.5"/>
                    <path d="M2 4L22 20M22 4L2 20" stroke="#C8102E" strokeWidth="1.5"/>
                    <path d="M12 4V20M2 12H22" stroke="white" strokeWidth="4"/>
                    <path d="M12 4V20M2 12H22" stroke="#C8102E" strokeWidth="2.5"/>
                </svg>
            )
        },
        {
            name: 'Canada',
            code: 'Canada',
            icon: (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="4" width="20" height="16" rx="2" fill="white"/>
                    <rect x="2" y="4" width="5" height="16" fill="#FF0000"/>
                    <rect x="17" y="4" width="5" height="16" fill="#FF0000"/>
                    <path d="M12 7l1 3h3l-2.5 2 1 3L12 13l-2.5 2 1-3L8 10h3z" fill="#FF0000"/>
                </svg>
            )
        },
        {
            name: 'Australia',
            code: 'Australia',
            icon: (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="4" width="20" height="16" rx="2" fill="#00008B"/>
                    <path d="M2 4h9v7H2z" fill="#00008B"/>
                    <path d="M3 5l8 6M11 5l-8 6" stroke="white" strokeWidth="1.5"/>
                    <path d="M3 5l8 6M11 5l-8 6" stroke="#FF0000" strokeWidth="0.8"/>
                    <path d="M6.5 5v6M3 8h7" stroke="white" strokeWidth="2"/>
                    <path d="M6.5 5v6M3 8h7" stroke="#FF0000" strokeWidth="1.2"/>
                    <circle cx="17" cy="8" r="1" fill="white"/>
                    <circle cx="15" cy="12" r="0.8" fill="white"/>
                    <circle cx="19" cy="12" r="0.8" fill="white"/>
                    <circle cx="17" cy="15" r="0.8" fill="white"/>
                    <circle cx="20" cy="16" r="0.7" fill="white"/>
                </svg>
            )
        },
    ];

    // Suggested questions with SVG icons
    const suggestedQuestions = [
        {
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
            ),
            text: 'What are the visa requirements?'
        },
        {
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
            ),
            text: 'Tell me about living costs'
        },
        {
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m-2 0h5m-9 0h2m2 0h5v-4"/>
                </svg>
            ),
            text: 'What are the top universities?'
        },
        {
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
            ),
            text: 'What are post-study work opportunities?'
        },
        {
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                </svg>
            ),
            text: 'Tell me about accommodation options'
        },
        {
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/>
                </svg>
            ),
            text: 'What scholarships are available?'
        },
    ];

    // Quick actions with SVG icons (country-specific)
    const quickActions = [
        {
            icon: countries[1].icon,
            label: 'Study in USA',
            query: 'Tell me about studying in USA'
        },
        {
            icon: countries[2].icon,
            label: 'Study in UK',
            query: 'Tell me about studying in UK'
        },
        {
            icon: countries[3].icon,
            label: 'Study in Canada',
            query: 'Tell me about studying in Canada'
        },
        {
            icon: countries[4].icon,
            label: 'Study in Australia',
            query: 'Tell me about studying in Australia'
        },
    ];

    return (
        <div className="flex flex-col h-full">
            {/* Error Banner */}
            {error && (
                <div
                    className="flex-shrink-0 bg-red-50 dark:bg-red-900/20 border-b-2 border-red-500 px-6 py-3 animate-fadeIn">
                    <div className="flex items-center justify-between max-w-5xl mx-auto">
                        <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" fill="none"
                                 stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <span className="text-sm font-medium text-red-800 dark:text-red-200">{error}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {retryMessage && (
                                <button
                                    onClick={handleRetry}
                                    className="px-3 py-1 text-xs font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                                >
                                    Retry
                                </button>
                            )}
                            <button
                                onClick={() => setError(null)}
                                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Enhanced Header with Better Alignment */}
            <div
                className="flex-shrink-0 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                <div className="flex items-center justify-between gap-4">
                    {/* Country Filters - Left Side */}
                    <div className="flex items-center gap-2 flex-1 overflow-x-auto">
                        {countries.map((country) => (
                            <button
                                key={country.code || 'all'}
                                onClick={() => setSelectedCountry(country.code)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                                    selectedCountry === country.code
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform scale-105'
                                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
                                }`}
                            >
                                <span className="flex-shrink-0">{country.icon}</span>
                                <span className="hidden sm:inline">{country.name}</span>
                            </button>
                        ))}
                    </div>

                    {/* Action Buttons - Right Side */}
                    <div className="flex items-center gap-2">
                        {/* Search Button */}
                        <button
                            onClick={() => setShowSearch(!showSearch)}
                            className={`p-2.5 rounded-xl transition-all duration-200 ${
                                showSearch
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
                            }`}
                            title="Search in chat"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                            </svg>
                        </button>

                        {/* Export Button */}
                        <button
                            onClick={handleExportChat}
                            className="p-2.5 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Export chat"
                            disabled={messages.length === 0}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                            </svg>
                        </button>

                        {/* Clear Button */}
                        <button
                            onClick={handleClearChat}
                            className="p-2.5 bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Clear chat"
                            disabled={messages.length === 0}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                {showSearch && (
                    <div className="mt-4 animate-fadeIn">
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search in conversation..."
                                className="w-full pl-11 pr-10 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 text-sm"
                            />
                            <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="none"
                                 stroke="currentColor"
                                 viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                            </svg>
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M6 18L18 6M6 6l12 12"/>
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Messages Area */}
            <div
                className="flex-1 overflow-y-auto px-6 py-6 bg-gradient-to-br from-gray-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
                {filteredMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4">
                        <div
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-3xl shadow-2xl mb-8 animate-pulse">
                            <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-3">
                            Welcome to Your Study Abroad Assistant!
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 text-lg mb-8 max-w-2xl">
                            Ask me anything about studying in USA, UK, Canada, or Australia. I'm here to help with
                            visas, costs,
                            universities, and more!
                        </p>

                        {/* Quick Action Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 w-full max-w-3xl">
                            {quickActions.map((action, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setInput(action.query)}
                                    className="p-5 bg-white dark:bg-gray-800 rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 hover:-translate-y-1 border border-gray-200 dark:border-gray-700 group"
                                >
                                    <div
                                        className="text-blue-600 dark:text-blue-400 mb-3 group-hover:scale-110 transition-transform flex justify-center">
                                        {action.icon}
                                    </div>
                                    <div
                                        className="text-sm font-semibold text-gray-700 dark:text-gray-300">{action.label}</div>
                                </button>
                            ))}
                        </div>

                        {/* Suggested Questions */}
                        <div className="w-full max-w-2xl">
                            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wide">
                                Popular Questions
                            </p>
                            <div className="grid gap-3">
                                {suggestedQuestions.slice(0, 4).map((q, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setInput(q.text)}
                                        className="flex items-center gap-3 px-5 py-3.5 bg-white dark:bg-gray-800 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-gray-700 dark:hover:to-gray-700 transition-all duration-200 text-left border border-gray-200 dark:border-gray-700 group"
                                    >
                                        <span
                                            className="text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">{q.icon}</span>
                                        <span
                                            className="text-gray-700 dark:text-gray-300 font-medium flex-1">{q.text}</span>
                                        <svg
                                            className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform"
                                            fill="none"
                                            stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M9 5l7 7-7 7"/>
                                        </svg>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {filteredMessages.map((message, index) => (
                            <ChatMessage key={index} message={message}/>
                        ))}

                        {loading && (
                            <div className="flex justify-start mb-4 animate-fadeIn">
                                <div className="flex items-start gap-3">
                                    <div
                                        className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-lg">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor"
                                             viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 01-2 2v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                                        </svg>
                                    </div>
                                    <div
                                        className="bg-white dark:bg-gray-700 rounded-2xl rounded-tl-sm px-6 py-4 shadow-lg border border-gray-200 dark:border-gray-600">
                                        <div className="flex items-center gap-2">
                                            <div className="flex gap-1">
                                                <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                                                      style={{animationDelay: '0ms'}}></span>
                                                <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                                                      style={{animationDelay: '150ms'}}></span>
                                                <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                                                      style={{animationDelay: '300ms'}}></span>
                                            </div>
                                            <span
                                                className="text-sm text-gray-600 dark:text-gray-400">AI is thinking...</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef}/>
                    </>
                )}
            </div>

            {/* Enhanced Input Area with Better Alignment */}
            <div
                className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-b from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50 px-6 py-5">
                <div className="max-w-4xl mx-auto">
                    {/* Professional Input Container */}
                    <div className="relative flex items-end gap-3">
                        {/* Textarea Container with Better Styling */}
                        <div className="flex-1 relative">
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder={
                                    selectedCountry
                                        ? `Ask me about studying in ${selectedCountry}...`
                                        : 'Ask me anything about studying abroad...'
                                }
                                className="w-full pl-5 pr-14 py-4 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-gray-900 dark:text-white placeholder-gray-400 text-base transition-all shadow-sm hover:shadow-md focus:shadow-lg"
                                rows={1}
                                disabled={loading}
                                style={{
                                    minHeight: '56px',
                                    maxHeight: '120px',
                                    lineHeight: '1.5'
                                }}
                            />

                            {/* Voice Input Button - Inside Textarea */}
                            <button
                                onClick={handleVoiceInput}
                                disabled={loading}
                                type="button"
                                className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ${
                                    isListening
                                        ? 'bg-red-500 text-white shadow-lg scale-110 animate-pulse'
                                        : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-40 disabled:cursor-not-allowed'
                                }`}
                                title={isListening ? 'Stop listening' : 'Voice input'}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
                                </svg>
                            </button>
                        </div>

                        {/* Professional Send Button */}
                        <button
                            onClick={() => handleSend()}
                            disabled={!input.trim() || loading}
                            type="button"
                            className="flex-shrink-0 flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-600 text-white rounded-2xl hover:from-blue-700 hover:via-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-md hover:scale-105 active:scale-95 transform"
                            title="Send message (Enter)"
                        >
                            {loading ? (
                                <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                            strokeWidth="3"></circle>
                                    <path className="opacity-75" fill="currentColor"
                                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                                </svg>
                            )}
                        </button>
                    </div>

                    {/* Helper Text with Better Styling */}
                    <div className="mt-3 px-1">
                        {isListening ? (
                            <div
                                className="flex items-center justify-center gap-2 text-sm text-red-600 dark:text-red-400 font-medium">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span
                                        className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                </span>
                                <span>Listening... Speak now!</span>
                            </div>
                        ) : (
                            <div
                                className="flex items-center justify-center gap-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                                <span className="flex items-center gap-1.5">
                                    Press 
                                    <kbd
                                        className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 font-mono text-xs shadow-sm">Enter</kbd>
                                    to send
                                </span>
                                <span className="text-gray-300 dark:text-gray-600">•</span>
                                <span className="flex items-center gap-1.5">
                                    <kbd
                                        className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 font-mono text-xs shadow-sm">Shift+Enter</kbd>
                                    for new line
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatInterface;
