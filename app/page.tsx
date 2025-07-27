'use client';

import { ChatPanel } from '@/components/ChatPanel';
import { useState } from 'react';
import { Chat as ChatType } from '@/types/search-types';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function Home() {
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatType[]>([]);

  const handleSelectChat = (chatId: string) => {
    setCurrentChatId(chatId);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
        <Header />
        <ChatPanel
          chats={chats}
          setChats={setChats}
          currentChatId={currentChatId}
          setCurrentChatId={setCurrentChatId}
          onSelectChat={handleSelectChat}
        />
        {/* <Footer /> */}
    </div>

  );
}