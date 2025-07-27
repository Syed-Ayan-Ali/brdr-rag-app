'use client';

import { useState, useEffect, useRef } from 'react';
import { Chat as ChatType } from '@/types/search-types';
import { SearchHistorySidebar } from '@/components/SearchHistorySidebar';
import { ChatMessages } from '@/components/ChatMessages';
import { SearchBar } from '@/components/SearchBar';
import { EmptyScreen } from '@/components/EmptyScreen';

interface ChatPanelProps {
  chats: ChatType[];
  setChats: React.Dispatch<React.SetStateAction<ChatType[]>>;
  currentChatId: string | null;
  setCurrentChatId: React.Dispatch<React.SetStateAction<string | null>>;
  onSelectChat: (id: string) => void;
}

export function ChatPanel({
  chats,
  setChats,
  currentChatId,
  setCurrentChatId,
  onSelectChat,
}: ChatPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCreatedInitialChat, setHasCreatedInitialChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

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
      return true;
    } catch (err) {
      setError('Failed to create new chat. Please try again.');
      console.error(err);
      return false;
    }
  };

  useEffect(() => {
    async function initializeChats() {
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

        console.log(
          'Fetched chats:',
          fetchedChats.map((chat: ChatType) => ({
            chatId: chat.chatId,
            title: chat.title,
            searchCount: chat.searches.length,
          }))
        );

        if (fetchedChats.length === 0 && !hasCreatedInitialChat) {
          console.log('No chats with searches found, creating initial chat.');
          const success = await handleNewChat();
          if (success) {
            setHasCreatedInitialChat(true);
          }
        } else {
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

  useEffect(() => {
    if (messagesEndRef.current && messagesContainerRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentChat?.searches.length, currentChatId]);

  const handleExamplePrompt = async (prompt: string) => {
    if (!currentChatId) {
      const success = await handleNewChat();
      if (!success) return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          chatId: currentChatId,
        }),
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

      const search: ChatType['searches'][0] = {
        searchId,
        query: prompt,
        llmResponse: fullResponse,
        expandedQueries: [],
        results: [],
        timestamp,
        responseTime,
        tokenSize: fullResponse.length,
      };

      setChats((prev) =>
        prev.map((chat) =>
          chat.chatId === currentChatId
            ? {
                ...chat,
                searches: [...chat.searches, search],
                lastMessageTime: timestamp,
              }
            : chat
        )
      );
    } catch (err) {
      setError('An error occurred while searching. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-row flex-1 bg-gray-50 h-screen">
      <div className="fixed top-0 left-0 h-full z-10">
        <SearchHistorySidebar
          chats={chats}
          onSelectChat={onSelectChat}
          setChats={setChats}
          setCurrentChatId={setCurrentChatId}
        />
      </div>
      <div className="flex-1 flex flex-col items-center p-4 ml-64">
        <div
          className="flex-1 w-full max-w-2xl overflow-y-auto pt-4 pb-20"
          ref={messagesContainerRef}
        >
          {currentChat && currentChat.searches.length > 0 ? (
            <ChatMessages
              chat={currentChat}
              newSearches={[]}
              messagesEndRef={messagesEndRef}
            />
          ) : (
            <EmptyScreen onExamplePromptClick={handleExamplePrompt} />
          )}
          {error && <p className="text-red-500 text-center mt-4">{error}</p>}
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
        <div className="w-full max-w-2xl px-4 fixed bottom-0 z-10 mb-8">
          <SearchBar
            chatId={currentChatId}
            setChats={setChats}
            setIsLoading={setIsLoading}
            setError={setError}
          />
        </div>
      </div>
    </div>
  );
}