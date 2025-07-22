'use client';

import { useState, useEffect } from 'react';
import { Chat as ChatType } from '@/lib/types/search-types';
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

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-blue-100">
      <SearchHistorySidebar
        chats={chats}
        onSelectChat={onSelectChat}
        setChats={setChats}
        setCurrentChatId={setCurrentChatId}
      />
      <div className="flex-1 flex flex-col items-center p-4">
        <div className="flex-1 w-full max-w-4xl overflow-y-auto">
          {currentChat && currentChat.searches.length > 0 ? (
            <ChatMessages chat={currentChat} />
          ) : (
            <EmptyScreen />
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
        </div>
        <div className="w-full max-w-2xl px-4 pb-4">
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