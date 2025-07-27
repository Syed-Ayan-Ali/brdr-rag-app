'use client';

import { useState, useEffect, useRef } from 'react';
import { EmptyScreen } from '@/components/EmptyScreen';
import { SearchBar } from '@/components/SearchBar';
import { ChatMessages } from '@/components/ChatMessages';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  // Scroll to the latest message (if needed, though scrolling is disabled)
  useEffect(() => {
    if (messagesEndRef.current && messagesContainerRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle example prompt clicks from EmptyScreen
  const handleExamplePrompt = async (prompt: string) => {
    const newMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch search results');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to read response stream');
      }

      let fullResponse = '';
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;

        // Update messages with partial assistant response
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage?.role === 'assistant') {
            return [
              ...prev.slice(0, -1),
              { ...lastMessage, content: fullResponse },
            ];
          } else {
            return [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: fullResponse,
                timestamp: new Date().toISOString(),
              },
            ];
          }
        });
      }
    } catch (err) {
      setError('An error occurred while searching. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle new search from SearchBar
  const handleSearch = async (query: string) => {
    const newMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: query }],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch search results');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to read response stream');
      }

      let fullResponse = '';
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;

        // Update messages with partial assistant response
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage?.role === 'assistant') {
            return [
              ...prev.slice(0, -1),
              { ...lastMessage, content: fullResponse },
            ];
          } else {
            return [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: fullResponse,
                timestamp: new Date().toISOString(),
              },
            ];
          }
        });
      }
    } catch (err) {
      setError('An error occurred while searching. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col bg-gray-50 h-screen">
      <div
        className="flex-1 w-full max-w-2xl mx-auto pt-4 pb-4 mb-20"
        style={{ overflow: 'hidden' }}
        ref={messagesContainerRef}
      >
        {messages.length > 0 ? (
          <ChatMessages
            messages={messages}
            isLoading={isLoading}
            error={error}
            messagesEndRef={messagesEndRef as React.RefObject<HTMLDivElement>}
          />
        ) : (
          <EmptyScreen onExamplePromptClick={handleExamplePrompt} />
        )}
      </div>
      <div className="w-full max-w-2xl mx-auto fixed bottom-0 left-0 right-0 p-4">
        <SearchBar
          setIsLoading={setIsLoading}
          setError={setError}
          onSearch={handleSearch}
        />
      </div>
    </div>
  );
}