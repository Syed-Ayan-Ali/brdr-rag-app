'use client';

import { memo } from 'react';
import { Chat as ChatType } from '@/types/search-types';
import { LlmResponse } from '@/components/LlmResponse';
import { Card } from '@/components/ui/Card';

interface ChatMessagesProps {
  chat: ChatType | undefined;
  newSearches: ChatType['searches'];
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export const ChatMessages = memo(function ChatMessages({ chat, newSearches, messagesEndRef }: ChatMessagesProps) {
  if (!chat || (chat.searches.length === 0 && newSearches.length === 0)) return null;

  // Combine searches and sort by timestamp to ensure chronological order
  const allSearches = [
    ...(chat.searches || []),
    ...newSearches,
  ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return (
    <div className="grid grid-cols-1 gap-6 max-w-2xl mx-auto">
      {allSearches.map((search) => (
        <Card key={search.searchId} className="border-b border-gray-200 pb-4">
          <p className="text-sm text-gray-500">
            {new Date(search.timestamp).toLocaleString('en-US', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
          <p className="text-gray-700 font-medium">Query: {search.query}</p>
          <LlmResponse llmResponse={search.llmResponse} />
          <p className="text-sm text-gray-500 mt-2">
            Response Time: {search.responseTime.toFixed(2)}s | Token Size: {search.tokenSize}
          </p>
        </Card>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
});