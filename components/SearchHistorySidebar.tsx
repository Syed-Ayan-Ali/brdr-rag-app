'use client';

import { useState } from 'react';
import { Chat } from '@/types/search-types';

interface SearchHistorySidebarProps {
  chats: Chat[];
  onSelectChat: (id: string) => void;
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  setCurrentChatId: React.Dispatch<React.SetStateAction<string | null>>;
}

export function SearchHistorySidebar({ chats, onSelectChat, setChats, setCurrentChatId }: SearchHistorySidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedChatId, setExpandedChatId] = useState<string | null>(null);

  // Group chats by date based on created_at
  const groupedChats = chats.reduce((acc, chat) => {
    const date = new Date(chat.startTime).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(chat);
    return acc;
  }, {} as Record<string, Chat[]>);

  const toggleChat = (chatId: string) => {
    setExpandedChatId(expandedChatId === chatId ? null : chatId);
  };

  const onNewChat = async () => {
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
      onSelectChat(chat.chatId);
    } catch (err) {
      console.error('Error creating new chat:', err);
    }
  };

  return (
    <div className={`bg-white border-r border-gray-200 h-full transition-all duration-300 ${isOpen ? 'w-64' : 'w-12'}`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          {isOpen && (
            <h2 className="text-lg font-semibold text-gray-700">Chat History</h2>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-gray-500 hover:text-gray-700"
          >
            {isOpen ? '◄' : '►'}
          </button>
        </div>
        {isOpen && (
          <>
            <button
              onClick={onNewChat}
              className="w-full mb-4 bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 transition duration-300"
            >
              New Chat
            </button>
            <div className="space-y-4">
              {Object.entries(groupedChats).length === 0 ? (
                <p className="text-sm text-gray-500">No chats with searches yet</p>
              ) : (
                Object.entries(groupedChats).map(([date, chats]) => (
                  <div key={date}>
                    <h3 className="text-sm font-medium text-gray-500">{date}</h3>
                    <ul className="mt-2 space-y-2">
                      {chats.map((chat) => (
                        <li key={chat.chatId} className="text-sm">
                          <div
                            className="text-gray-700 hover:bg-blue-50 p-2 rounded cursor-pointer flex justify-between items-center"
                            onClick={() => {
                              onSelectChat(chat.chatId);
                              toggleChat(chat.chatId);
                              setCurrentChatId(chat.chatId);
                            }}
                          >
                            <span>{chat.title} ({chat.searches.length} searches)</span>
                            <span>{expandedChatId === chat.chatId ? '▲' : '▼'}</span>
                          </div>
                          {expandedChatId === chat.chatId && (
                            <ul className="ml-4 mt-1 space-y-1">
                              {chat.searches.length === 0 ? (
                                <li className="text-sm text-gray-500">No searches yet</li>
                              ) : (
                                chat.searches.slice().reverse().map((search) => (
                                  <li
                                    key={search.searchId}
                                    className="text-sm text-gray-600 pl-2 border-l border-gray-200"
                                  >
                                    <p>
                                      {new Date(search.timestamp).toLocaleString('en-US', {
                                        timeStyle: 'short',
                                      })}
                                      : {search.query}
                                    </p>
                                  </li>
                                ))
                              )}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}