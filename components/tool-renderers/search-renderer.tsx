interface SearchResult {
  url: string;
  title: string;
  content: string;
}

interface SearchOutput {
  results?: SearchResult[];
}

/**
 * search 输出渲染：每个结果一张小卡片
 */
export function SearchRenderer({ output }: { output: SearchOutput }) {
  const results = output.results ?? [];
  return (
    <div className="space-y-2 text-xs">
      {results.map((r, i) => (
        <div key={i} className="border-l-2 border-[var(--accent)] pl-2">
          <a
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium hover:underline"
          >
            {r.title}
          </a>
          <div className="text-zinc-400 mt-0.5 line-clamp-2">{r.content}</div>
        </div>
      ))}
    </div>
  );
}
