'use client';

export function EmptyScreen() {
  return (
    <div className="flex-1 flex items-center justify-center h-full">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">No Messages Yet</h2>
        <p className="text-gray-500">Start a new chat or enter a query to begin.</p>
      </div>
    </div>
  );
}