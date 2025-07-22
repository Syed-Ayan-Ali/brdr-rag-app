'use client';

import { useState } from 'react';
import { Chat } from '@/lib/types/search-types';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { CoreMessage } from 'ai';

interface SearchBarProps {
  chatId: string | null;
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

export function SearchBar({ chatId, setChats, setIsLoading, setError }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setLocalIsLoading] = useState(false);

  const handleSearch = async (query: string) => {
    if (!chatId) {
      setError('No chat selected. Please create or select a chat.');
      return;
    }

    setLocalIsLoading(true);
    setError(null);

    try {
      const messages: CoreMessage[] = [{ role: 'user', content: query }];

      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, chatId }),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch search results');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to read response stream');
      }

      const searchId = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      let fullResponse = '';
      const startTime = Date.now();

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullResponse += decoder.decode(value, { stream: true });
      }

      const responseTime = (Date.now() - startTime) / 1000;

      const search: Chat['searches'][0] = {
        searchId,
        query,
        llmResponse: fullResponse,
        expandedQueries: [],
        results: [],
        timestamp,
        responseTime,
        tokenSize: fullResponse.length,
      };

      setChats((prev) =>
        prev.map((chat) =>
          chat.chatId === chatId
            ? {
                ...chat,
                searches: [...chat.searches, search],
                lastMessageTime: timestamp,
              }
            : chat
        )
      );

      await fetch('/api/search/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ search, chatId }),
      });
    } catch (err) {
      setError('An error occurred while searching. Please try again.');
      console.error(err);
    } finally {
      setLocalIsLoading(false);
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && chatId) {
      handleSearch(query.trim());
      setQuery('');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative flex items-center p-2 border rounded-2xl bg-white shadow-sm"
    >
      <Textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Enter your search query (e.g., Compare Japan and Germany)..."
        className="flex-1 resize-none border-0 focus-visible:ring-0 shadow-none py-2 pl-3 pr-12"
        rows={1}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            (e.target as HTMLTextAreaElement).form?.requestSubmit();
          }
        }}
      />
      <Button
        type="submit"
        size="icon"
        disabled={!chatId || !query.trim() || isLoading}
        className="flex-shrink-0 rounded-full"
      >
        {isLoading ? (
          <svg
            className="animate-spin h-5 w-5 text-white"
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
        ) : (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        )}
        <span className="sr-only">Search</span>
      </Button>
    </form>
  );
}