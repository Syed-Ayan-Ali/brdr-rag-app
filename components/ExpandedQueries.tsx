interface ExpandedQueriesProps {
  queries: string[];
}

export function ExpandedQueries({ queries }: ExpandedQueriesProps) {
  if (queries.length <= 1) return null; // Only show if there are expanded queries

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-700 mb-2">Expanded Queries</h2>
      <div className="flex flex-wrap gap-2">
        {queries.slice(1).map((query, index) => (
          <span
            key={index}
            className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
          >
            {query}
          </span>
        ))}
      </div>
    </div>
  );
}