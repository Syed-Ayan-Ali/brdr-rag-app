'use client';

import { SearchHistorySidebar } from '@/components/SearchHistorySidebar';
import { Chat } from '@/components/Chat';
import { useState } from 'react';
import { Chat as ChatType } from '@/lib/types/search-types';

export default function Home() {
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatType[]>([]);

  const handleSelectChat = (chatId: string) => {
    setCurrentChatId(chatId);
  };

  return (
    <div className="min-h-screen flex">
      <SearchHistorySidebar
        chats={chats}
        onSelectChat={handleSelectChat}
        setChats={setChats}
        setCurrentChatId={setCurrentChatId}
      />
      <Chat
        chats={chats}
        setChats={setChats}
        currentChatId={currentChatId}
        setCurrentChatId={setCurrentChatId}
      />
    </div>
  );
}