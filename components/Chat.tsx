'use client';

import { SearchBar } from '@/components/SearchBar';
import { LlmResponse } from '@/components/LlmResponse';
import { useState, useEffect } from 'react';
import { Chat as ChatType } from '@/lib/types/search-types';

interface ChatProps {
  chats: ChatType[];
  setChats: React.Dispatch<React.SetStateAction<ChatType[]>>;
  currentChatId: string | null;
  setCurrentChatId: React.Dispatch<React.SetStateAction<string | null>>;
}

export function Chat({ chats, setChats, currentChatId, setCurrentChatId }: ChatProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCreatedInitialChat, setHasCreatedInitialChat] = useState(false);

  const handleNewChat = async () => {
    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `Chat ${chats.length + 1}` }),
      });

      if (!response.ok) {
        throw new Error('Failed to create new chat');
      }

      const { chat } = await response.json();
      setChats((prev) => [...prev, chat]);
      setCurrentChatId(chat.chatId);
      setError(null);
      return true; // Indicate successful chat creation
    } catch (err) {
      setError('Failed to create new chat. Please try again.');
      console.error(err);
      return false;
    }
  };

  useEffect(() => {
    async function initializeChats() {
      // Skip if an initial chat has already been created
      if (hasCreatedInitialChat) {
        console.log('Initial chat already created, skipping fetch.');
        return;
      }

      try {
        const response = await fetch('/api/chats');
        if (!response.ok) {
          throw new Error('Failed to fetch chats');
        }
        const { chats: fetchedChats } = await response.json();
        
        console.log('Fetched chats:', fetchedChats.map((chat: ChatType) => ({ chatId: chat.chatId, title: chat.title, searchCount: chat.searches.length })));

        if (fetchedChats.length === 0 && !hasCreatedInitialChat) {
          console.log('No chats with searches found, creating initial chat.');
          const success = await handleNewChat();
          if (success) {
            setHasCreatedInitialChat(true); // Mark initial chat as created
          }
        } else {
          // Set chats and select the first one
          setChats(fetchedChats);
          if (!currentChatId && fetchedChats.length > 0) {
            setCurrentChatId(fetchedChats[0].chatId);
          }
        }
      } catch (err) {
        setError('Failed to load chats. Please try again.');
        console.error('Initialize chats error:', err);
      }
    }
    initializeChats();
  }, [setChats, setCurrentChatId, hasCreatedInitialChat]);

  const currentChat = chats.find((chat) => chat.chatId === currentChatId);

  return (
    <div className="flex-1 flex flex-col items-center p-4 bg-gradient-to-br from-gray-50 to-blue-100">
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Document Search</h1>
        <SearchBar
          chatId={currentChatId}
          setChats={setChats}
          setIsLoading={setIsLoading}
          setError={setError}
        />
        {error && <p className="text-red-500 text-center mt-4">{error}</p>}
        {isLoading && (
          <div className="text-center mt-4">
            <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}
        {currentChat && (
          <div className="space-y-6">
            {currentChat.searches.slice().reverse().map((search) => (
              <div key={search.searchId} className="border-b border-gray-200 pb-4">
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}