'use client';

import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface SearchBarProps {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e?: { preventDefault?: () => void }) => void;
}

export function SearchBar({ input, handleInputChange, handleSubmit }: SearchBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      handleSubmit();
    }
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 150);
      textarea.style.height = `${newHeight}px`;
    }
  }, [input]);

  return (
    <form
      onSubmit={handleFormSubmit}
      className="relative flex items-center p-2 border rounded-2xl bg-white shadow-sm"
    >
      <Textarea
        ref={textareaRef}
        value={input}
        onChange={handleInputChange}
        placeholder="Enter your search query (e.g., Compare Japan and Germany)..."
        className="text-gray-400 flex-1 resize-none border-0 focus-visible:ring-0 shadow-none py-2 pl-3 pr-12 min-h-[40px]"
        style={{ maxHeight: '150px', overflowY: 'auto' }}
        rows={1}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            (e.target as HTMLTextAreaElement).form?.requestSubmit();
          }
        }}
      />
      <Button
        type="submit"
        size="icon"
        disabled={!input.trim()}
        className="flex-shrink-0 rounded-full"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <span className="sr-only">Search</span>
      </Button>
    </form>
  );
}