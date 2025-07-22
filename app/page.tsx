'use client';

import { ChatPanel } from '@/components/ChatPanel';
import { useState } from 'react';
import { Chat as ChatType } from '@/lib/types/search-types';

export default function Home() {
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatType[]>([]);

  const handleSelectChat = (chatId: string) => {
    setCurrentChatId(chatId);
  };

  return (
    <ChatPanel
      chats={chats}
      setChats={setChats}
      currentChatId={currentChatId}
      setCurrentChatId={setCurrentChatId}
      onSelectChat={handleSelectChat}
    />
  );
}