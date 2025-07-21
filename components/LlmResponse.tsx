interface LlmResponseProps {
  llmResponse: string;
}

export function LlmResponse({ llmResponse }: LlmResponseProps) {
  return (
    <div className="max-w-4xl mx-auto mt-6 p-6 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
      <h2 className="text-xl font-bold text-gray-800 mb-2">Answer</h2>
      <p className="text-gray-600 whitespace-pre-wrap">{llmResponse}</p>
    </div>
  );
}