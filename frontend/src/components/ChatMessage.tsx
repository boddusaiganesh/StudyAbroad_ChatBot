'use client';

import React, {useState} from 'react';
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
    message: {
        role: 'user' | 'assistant';
        content: string;
        country?: string;
        timestamp?: string;
    };
}

const ChatMessage: React.FC<ChatMessageProps> = ({message}) => {
    const [copied, setCopied] = useState(false);
    const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(message.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleFeedback = (type: 'up' | 'down') => {
        setFeedback(type);
        console.log(`Feedback: ${type} for message`);
    };

    const getCountryIcon = (countryName: string) => {
        const icons: { [key: string]: JSX.Element } = {
            'USA': (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="4" width="20" height="16" rx="2" fill="#B22234"/>
                    <path d="M2 6h20M2 8h20M2 10h20M2 12h20M2 14h20M2 16h20M2 18h20" stroke="white" strokeWidth="1.2"/>
                    <rect x="2" y="4" width="9" height="7" rx="1" fill="#3C3B6E"/>
                    <circle cx="4" cy="6" r="0.5" fill="white"/>
                    <circle cx="6" cy="6" r="0.5" fill="white"/>
                    <circle cx="8" cy="6" r="0.5" fill="white"/>
                    <circle cx="10" cy="6" r="0.5" fill="white"/>
                </svg>
            ),
            'UK': (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="4" width="20" height="16" rx="2" fill="#012169"/>
                    <path d="M2 4L22 20M22 4L2 20" stroke="white" strokeWidth="2.5"/>
                    <path d="M2 4L22 20M22 4L2 20" stroke="#C8102E" strokeWidth="1.5"/>
                    <path d="M12 4V20M2 12H22" stroke="white" strokeWidth="4"/>
                    <path d="M12 4V20M2 12H22" stroke="#C8102E" strokeWidth="2.5"/>
                </svg>
            ),
            'Canada': (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="4" width="20" height="16" rx="2" fill="white"/>
                    <rect x="2" y="4" width="5" height="16" fill="#FF0000"/>
                    <rect x="17" y="4" width="5" height="16" fill="#FF0000"/>
                    <path d="M12 7l1 3h3l-2.5 2 1 3L12 13l-2.5 2 1-3L8 10h3z" fill="#FF0000"/>
                </svg>
            ),
            'Australia': (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
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
    };

      return icons[countryName] || (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
      );
  };

    if (message.role === 'user') {
    return (
        <div className="flex justify-end mb-6 animate-fadeIn">
            <div className="flex items-start gap-3 max-w-[75%]">
                <div
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl rounded-tr-md px-5 py-3.5 shadow-md">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                    {message.timestamp && (
                        <p className="text-xs text-blue-100 mt-2 opacity-75">
                            {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                        </p>
                    )}
                </div>
                <div
                    className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                </div>
            </div>
        </div>
    );
  }

    return (
        <div className="flex justify-start mb-6 animate-fadeIn">
            <div className="flex items-start gap-3 max-w-[85%]">
                <div
                    className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-md">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                    </svg>
                </div>
                <div className="flex-1">
                    {message.country && (
                        <span
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-400 text-xs font-semibold rounded-full mb-3 border border-blue-200 dark:border-blue-800">
              {getCountryIcon(message.country)}
                            <span>{message.country}</span>
            </span>
                    )}
                    <div
                        className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-md px-5 py-4 shadow-md border border-gray-200 dark:border-gray-700">
                        <div className="prose dark:prose-invert prose-sm max-w-none">
                            <ReactMarkdown
                                components={{
                                    p: ({children}) => <p
                                        className="mb-3 last:mb-0 text-gray-800 dark:text-gray-200 leading-relaxed">{children}</p>,
                                    ul: ({children}) => <ul className="list-disc pl-5 mb-3 space-y-1.5">{children}</ul>,
                                    ol: ({children}) => <ol
                                        className="list-decimal pl-5 mb-3 space-y-1.5">{children}</ol>,
                                    li: ({children}) => <li
                                        className="text-gray-700 dark:text-gray-300">{children}</li>,
                                    strong: ({children}) => <strong
                                        className="font-semibold text-gray-900 dark:text-white">{children}</strong>,
                                    code: ({children}) => <code
                                        className="bg-gray-100 dark:bg-gray-900 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>,
                                    h1: ({children}) => <h1
                                        className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{children}</h1>,
                                    h2: ({children}) => <h2
                                        className="text-lg font-bold mb-2 text-gray-900 dark:text-white">{children}</h2>,
                                    h3: ({children}) => <h3
                                        className="text-base font-bold mb-2 text-gray-900 dark:text-white">{children}</h3>,
                                }}
                            >
                                {message.content}
                            </ReactMarkdown>
                        </div>

                        {/* Action Buttons */}
                        <div
                            className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            {/* Copy Button */}
                            <button
                                onClick={handleCopy}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                title="Copy to clipboard"
                            >
                                {copied ? (
                                    <>
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor"
                                             viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M5 13l4 4L19 7"/>
                    </svg>
                      Copied!
                  </>
                ) : (
                    <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                        </svg>
                        Copy
                    </>
                )}
              </button>

                {/* Thumbs Up */}
                <button
                    onClick={() => handleFeedback('up')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        feedback === 'up'
                            ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                            : 'text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                    }`}
                    title="Helpful"
                >
                    <svg className="w-3.5 h-3.5" fill={feedback === 'up' ? 'currentColor' : 'none'}
                         stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/>
                    </svg>
                </button>

                {/* Thumbs Down */}
                <button
                    onClick={() => handleFeedback('down')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        feedback === 'down'
                            ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
                            : 'text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                    }`}
                    title="Not helpful"
                >
                    <svg className="w-3.5 h-3.5" fill={feedback === 'down' ? 'currentColor' : 'none'}
                         stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"/>
                    </svg>
                </button>

                {/* Timestamp */}
                {message.timestamp && (
                    <span className="ml-auto text-xs text-gray-400">
                  {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                </span>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
