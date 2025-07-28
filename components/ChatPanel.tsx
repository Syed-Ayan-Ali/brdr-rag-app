
'use client';

import { useEffect, useState } from 'react';
import { EmptyScreen } from '@/components/EmptyScreen';
import { SearchBar } from '@/components/SearchBar';
import { ChatMessages } from '@/components/ChatMessages';
import { useChat } from '@ai-sdk/react';
import { Header } from '@/components/Header';

export function ChatPanel() {
  const [selectCollectionId, setSelectCollectionId] = useState<string>('brdr_documents');
  const [selectChunkCollectionId, setSelectChunkCollectionId] = useState<string>('brdr_documents_data');
  const [initialMessages, setInitialMessages] = useState<any>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { messages, input, handleInputChange, handleSubmit, setInput } = useChat({
    api: '/api/search',
    initialMessages: initialMessages,
    body : {
      collection: selectCollectionId,
      chunk_collection: selectChunkCollectionId,
    },
    experimental_throttle: 50,
    onResponse: () => {
      setIsLoading(false);
    },
    onError: () => {
      setIsLoading(false);
    },
    onFinish: () => {
      setIsLoading(false);
    }
  });

  const handleCollectionChange = (collectionId: string) => {
    setSelectCollectionId(collectionId);
    setSelectChunkCollectionId(`${collectionId}_data`);
    // Reset messages when collection changes
    // messages.length = 0;
    // setInput(''); // Clear input when changing collection
  };

  // Handle example prompt clicks from EmptyScreen
  const handleExamplePrompt = (prompt: string) => {
    setInput(prompt);
    handleSubmit();
  };

  useEffect(() => {
    // Load initial messages if needed
    if (initialMessages.length === 0) {
      setInitialMessages(messages);
    }
  }, [initialMessages]);

  return (
    <div className="flex flex-col bg-gray-50 h-screen">
      {/* Header with collection selection */}
      <Header
        selectedCollectionId={selectCollectionId}
        onCollectionChange={handleCollectionChange}
      />
      <div
        className="flex-1 overflow-y-auto custom-scrollbar w-full max-w-2xl mx-auto pt-4 pb-4 mb-20"
        
      >
        {messages.length > 0 ? (
          <ChatMessages
            messages={messages}
            isLoading={isLoading}
          />
        ) : (
          <EmptyScreen onExamplePromptClick={handleExamplePrompt} />
        )}
      </div>
      <div className="w-full max-w-2xl mx-auto fixed bottom-0 left-0 right-0 p-4">
        <SearchBar
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
