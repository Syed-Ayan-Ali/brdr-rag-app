'use client';

import { Header } from '@/components/Header';
import { ChatPanel } from '@/components/ChatPanel';

export default function Home() {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header />
      <ChatPanel />
    </div>
  );
}