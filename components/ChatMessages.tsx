'use client';

import type { Message } from 'ai/react';
import { memo, useEffect, useRef } from 'react';
import { MemoizedMarkdown } from '@/components/MemoizedMarkdown';
import { Card } from '@/components/ui/card';

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
}

export const ChatMessages = memo(function ChatMessages({
  messages,
  isLoading,
}: ChatMessagesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Check if user is near the bottom of the scrollable area
  const isNearBottom = () => {
    if (!containerRef.current) return true;
    const container = containerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;
    return scrollHeight - scrollTop - clientHeight < 300; // 100px threshold
  };

  // Auto-scroll when messages change or loading state changes
  useEffect(() => {
    if (messages.length === 1 || isNearBottom()) {
      scrollToBottom();
    }
  }, [messages, isLoading]);

  return (
    <div
      ref={containerRef}
      className="space-y-6 px-4 py-6 max-w-2xl mx-auto"
      style={{
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        maxHeight: '100%',
      }}
    >
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      {messages.map((message) => (
        <Card
          key={message.id}
          className="border-b border-gray-200 p-4 break-words"
          style={{ overflow: 'hidden' }}
        >
          <div className="flex items-start space-x-4">
            {/* <div
              // className={`flex-shrink-0 h-8 w-8 rounded-full ${
              //   message.role === 'user' ? 'bg-gray-800' : 'bg-gray-200'
              // }`}
              className={`flex-shrink-0 h-8 w-8 rounded-full ${message.role === 'user' ? <img src="../../public/profile.svg" alt="User Profile" /> : <img src="../../public/assistant.svg" alt="Assistant Profile" />}`}
            ></div> */}
            <div className={`flex-shrink-0 h-8 w-8 pt-2 rounded-full flex items-center justify-center`}>
              <img src={message.role === 'user' ? 'profile.svg' : 'assistant.svg'} alt="" />
            </div>
            {/* Message Content */}
          <div className="flex-1 pt-1 space-y-3 ">
            {/* Tool Invocations */}
            {message.parts?.map((part, index) => {
              switch (part.type) {
                case 'tool-invocation': {
                  return (
                    <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-w-full">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <span className="text-sm font-medium text-black break-words">
                            Thinking... Using {part.toolInvocation.toolName}
                          </span>
                        </div>
                      </div>
                      <details className="group">
                        <summary className=" cursor-pointer text-sm text-black select-none">
                          View details
                        </summary>
                        <pre className="mt-2 p-4 text-black text-xs bg-gray-100 rounded border overflow-hidden whitespace-pre-wrap ">
                          {JSON.stringify(part.toolInvocation, null, 2)}
                        </pre>
                      </details>
                    </div>
                  );
                }
                default:
                  return null;
              }
            })}
            
            {/* Regular Content */}
            
            {message.content && (
              <MemoizedMarkdown content={message.content} id={message.id} />
            )}
          </div>
            
          </div>
        </Card>
      ))}
      {isLoading && (
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-400"></div>
          <div className="flex-1 pt-1">
            <div className="flex items-center space-x-2">
              <svg
                className="animate-spin h-4 w-4 text-black"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="text-black">Thinking...</span>
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
});