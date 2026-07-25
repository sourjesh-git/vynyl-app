'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { SearchResult } from '@syncroom/shared';
import { apiFetch } from '@/lib/api';

export function useSearch(query: string, enabled = true) {
  const [debounced, setDebounced] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 600);
    return () => clearTimeout(timer);
  }, [query]);

  const isQueryValid = debounced.trim().length >= 3;

  return useQuery({
    queryKey: ['search', debounced],
    queryFn: ({ signal }) => {
      if (!isQueryValid) return Promise.resolve({ results: [] });
      return apiFetch<{ results: SearchResult[] }>(
        `/search?q=${encodeURIComponent(debounced)}`,
        { signal },
      );
    },
    enabled: enabled && (debounced.trim().length === 0 || isQueryValid),
    staleTime: 5 * 60 * 1000, // client-side cache for 5 minutes
    select: (data) => data?.results ?? [],
  });
}
