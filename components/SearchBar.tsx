'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';

interface SearchBarProps {
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  onSearch: (query: string) => void;
}

export function SearchBar({ setIsLoading, setError, onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
      setQuery('');
    }
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 150);
      textarea.style.height = `${newHeight}px`;
    }
  }, [query]);

  return (
    <form
      onSubmit={handleSubmit}
      className="relative flex items-center p-2 border rounded-2xl bg-white shadow-sm"
    >
      <Textarea
        ref={textareaRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
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
        disabled={!query.trim()}
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