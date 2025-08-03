'use client';

import { useChat } from '@ai-sdk/react';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from 'ai';
import { useState } from 'react';
import ChatMessage from './ChatMessage';
import SearchBar from './SearchBar';

export default function ChatPanel() {
  const { messages, sendMessage, addToolResult, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),

    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,

    // run client-side tools that are automatically executed:
    async onToolCall({ toolCall }) {
      if (toolCall.toolName === 'getLocation') {
        const cities = ['New York', 'Los Angeles', 'Chicago', 'San Francisco'];

        // No await - avoids potential deadlocks
        addToolResult({
          tool: 'getLocation',
          toolCallId: toolCall.toolCallId,
          output: cities[Math.floor(Math.random() * cities.length)],
        });
      }
    },
  });

  const handleSendMessage = (message: string) => {
    if (message.trim()) {
      sendMessage({ text: message });
    }
  };

  const handleClarificationSelect = (option: string) => {
    // Send the selected option as a user message to continue the conversation
    sendMessage({ text: option });
  };

  // Check if assistant is currently responding
  const isAssistantResponding = status === 'streaming' || status === 'submitted';

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="flex items-center justify-center p-6 bg-white/80 backdrop-blur-sm border-b border-slate-200">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          AI Assistant
        </h1>
        {isAssistantResponding && (
          <div className="ml-4 flex items-center space-x-2 text-sm text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Assistant is responding...</span>
          </div>
        )}
      </div>

      {/* Chat Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages?.map((message, index) => (
            <ChatMessage 
              key={message.id} 
              message={message} 
              addToolResult={addToolResult}
              isLast={index === messages.length - 1}
              onClarificationSelect={handleClarificationSelect}
            />
          ))}
          
          {messages?.length === 0 && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">Start a conversation</h3>
              <p className="text-slate-500">Ask me anything and I'll help you out!</p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Search Bar */}
      <div className="p-6 bg-white/80 backdrop-blur-sm border-t border-slate-200">
        <div className="max-w-4xl mx-auto">
          <SearchBar 
            onSendMessage={handleSendMessage} 
            isDisabled={isAssistantResponding}
          />
        </div>
      </div>
    </div>
  );
}