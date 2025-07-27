'use client';

interface EmptyScreenProps {
  onExamplePromptClick: (prompt: string) => void;
}

export function EmptyScreen({ onExamplePromptClick }: EmptyScreenProps) {
  const examplePrompts = [
    'Compare Japan and Germany economies',
    'Comapre USA and Chinas Economies'
  ];

  return (
    <div className="flex-1 flex items-center justify-center h-full">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">No Messages Yet</h2>
        <p className="text-gray-500 mb-6">Start a new chat or try one of these example prompts:</p>
        <div className="flex flex-wrap justify-center gap-2">
          {examplePrompts.map((prompt, index) => (
            <button
              key={index}
              onClick={() => onExamplePromptClick(prompt)}
              className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-200 transition duration-200 text-sm"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}