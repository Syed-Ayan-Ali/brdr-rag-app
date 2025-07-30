'use client';

import { memo, useEffect, useRef } from 'react';
import { MemoizedMarkdown } from '@/components/MemoizedMarkdown';
import { Card } from '@/components/ui/card';
import { ToolInvocation, UIMessage } from 'ai';
import { DevModeModal } from '@/components/DevModeModal';

interface ChatMessagesProps { 
  messages: UIMessage[];
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

  const isNearBottom = () => {
    if (!containerRef.current) return true;
    const container = containerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;
    return scrollHeight - scrollTop - clientHeight < 100;
  };

  useEffect(() => {
    if (messages.length === 1 || isNearBottom()) {
      scrollToBottom();
    }
  }, [messages, isLoading]);
  

  return (
    <div
      ref={containerRef}
      className="space-y-6 px-4 py-6 max-w-4xl mx-auto"
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
          className={`border-b border-gray-200 p-4 break-words ${
            message.role === 'user' ? 'bg-blue-50' : 'bg-blue-200'
          }`}
          style={{ overflow: 'hidden' }}
          role={message.role}
        >
          <div className="flex items-start space-x-4">
            <div
              className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center`}
            >
              <img
                src={message.role === 'user' ? 'profile.svg' : 'assistant.svg'}
                alt=""
              />
            </div>
            <div className="flex-1 pt-1 space-y-3">
              {message.parts?.map((part, index) => {
                if (part.type === 'tool-invocation') {
                  return (
                    <DevModeModal
                      key={index}
                      toolInvocation={part.toolInvocation as ToolInvocation}
                      messageContent={message.content}
                      initialMessages={messages}
                    />
                  );
                }
                return null;
              })}
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
              <svg className="animate-spin h-4 w-4 text-black" viewBox="0 0 24 24">
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