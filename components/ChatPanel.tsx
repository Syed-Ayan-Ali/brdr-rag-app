
'use client';

import { useEffect, useState } from 'react';
import { EmptyScreen } from '@/components/EmptyScreen';
import { SearchBar } from '@/components/SearchBar';
import { ChatMessages } from '@/components/ChatMessages';
import { useChat } from '@ai-sdk/react';
import { Header } from '@/components/Header';
import { CORE_PROGRAMMING_PROMPT } from '@/lib/prompts';

export function ChatPanel() {
  const [selectCollectionId, setSelectCollectionId] = useState<string>('brdr_documents');
  const [selectChunkCollectionId, setSelectChunkCollectionId] = useState<string>('brdr_documents_data');
  const [initialMessages, setInitialMessages] = useState<any>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { messages, input, handleInputChange, handleSubmit, setInput } = useChat({
    api: '/api/search',
    initialMessages: initialMessages,
    body : {
      system: CORE_PROGRAMMING_PROMPT(),
      collection: selectCollectionId,
      chunk_collection: selectChunkCollectionId,
      match_count: 5,  // Default values, can be adjusted
      match_threshold: 0.2,
      min_content_length: 500,
      maxSteps: 5, // Default value, can be adjusted
    },
    experimental_throttle: 50,
    onResponse: () => {
      setIsLoading(false);
    },
  });

  const handleCollectionChange = (collectionId: string) => {
    setSelectCollectionId(collectionId);
    setSelectChunkCollectionId(`${collectionId}_data`);
  };

  // Handle example prompt clicks from EmptyScreen
  const handleExamplePrompt = (prompt: string) => {
    setInput(prompt);
    // press enter to submit
    handleSubmit();
  };

  useEffect(() => {
    // if the initial messages get more than 5, remove the last message
    if (messages.length > 5) {
      setInitialMessages(messages.slice(0, 5));
      return;
    }
    setInitialMessages(messages);
  }, [initialMessages]);

  return (
    <div className="flex flex-col bg-gray-50 h-screen">
      {/* Header with collection selection */}
      <Header
        selectedCollectionId={selectCollectionId}
        onCollectionChange={handleCollectionChange}
      />
      <div
        className="flex-1 overflow-y-auto custom-scrollbar w-full max-w-3xl mx-auto pt-4 pb-4 mb-20"
        
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
      <div className="w-full max-w-3xl mx-auto fixed bottom-0 left-0 right-0 p-4">
        <SearchBar
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
