'use client';

import { memo } from 'react';
import { LlmResponse } from '@/components/LlmResponse';
import { Card } from '@/components/ui/Card';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export const ChatMessages = memo(function ChatMessages({
  messages,
  isLoading,
  error,
  messagesEndRef,
}: ChatMessagesProps) {
  return (
    <div
      className="grid grid-cols-1 gap-6 max-w-2xl mx-auto"
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
          className="border-b border-gray-200 pb-4 break-words"
          style={{ overflow: 'hidden' }}
        >
          <p className="text-sm text-gray-500">
            {new Date(message.timestamp).toLocaleString('en-US', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
          <p className="text-gray-700 font-medium">
            {message.role === 'user' ? 'Query' : 'Answer'}:
          </p>
          {message.role === 'user' ? (
            <p className="text-gray-700 break-words">{message.content}</p>
          ) : (
            <LlmResponse llmResponse={message.content} />
          )}
        </Card>
      ))}
      {error && <p className="text-red-500 text-center mt-4 break-words">{error}</p>}
      {isLoading && (
        <div className="text-center mt-4">
          <svg
            className="animate-spin h-8 w-8 text-blue-500 mx-auto"
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
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
});