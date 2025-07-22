'use client';

import { memo } from 'react';
import { LlmResponse } from '@/components/LlmResponse';

interface MemoizedMarkdownProps {
  content: string;
  id: string;
}

function MemoizedMarkdown({ content, id }: MemoizedMarkdownProps) {
  return <LlmResponse llmResponse={content} />;
}

export default memo(MemoizedMarkdown);