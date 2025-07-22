'use client';

import { Chat as ChatType } from '@/lib/types/search-types';
import { LlmResponse } from '@/components/LlmResponse';
import { Card } from '@/components/ui/Card';

interface ChatMessagesProps {
  chat: ChatType | undefined;
}

export function ChatMessages({ chat }: ChatMessagesProps) {
  if (!chat || chat.searches.length === 0) return null;

  return (
    <div className="space-y-6 px-4 py-6 max-w-2xl mx-auto">
      {chat.searches.slice().reverse().map((search) => (
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
    </div>
  );
}