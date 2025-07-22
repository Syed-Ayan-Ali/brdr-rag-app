'use client';

import { useState } from 'react';
import { Chat } from '@/lib/types/search-types';

interface SearchBarProps {
  chatId: string | null;
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

export function SearchBar({ chatId, setChats, setIsLoading, setError }: SearchBarProps) {
  const [isLoading, setLocalIsLoading] = useState(false);
  const [query, setQuery] = useState('');

  const handleSearch = async (query: string) => {
    if (!chatId) {
      setError('No chat selected. Please create or select a chat.');
      return;
    }

    setLocalIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, chatId }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch search results');
      }

      const { search } = await response.json();

      console.log('Search response:', search);

      // Update frontend immediately
      setChats((prev) =>
        prev.map((chat) =>
          chat.chatId === chatId
            ? {
                ...chat,
                searches: [...chat.searches, search],
                lastMessageTime: new Date().toISOString(),
              }
            : chat
        )
      );

      // Store in database in the background
      fetch('/api/search/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ search, chatId }),
      }).catch((err) => {
        console.error('Background storage error:', err);
        // Optionally handle background storage error
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
    <form onSubmit={handleSubmit} className="w-full mb-6">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your search query..."
          className="w-full p-4 pr-12 text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-300"
        />
        <button
          type="submit"
          disabled={!chatId || !query.trim() || isLoading}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 disabled:bg-blue-300 transition duration-300"
        >
          {isLoading ? (
            <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            'Search'
          )}
        </button>
      </div>
    </form>
  );
}