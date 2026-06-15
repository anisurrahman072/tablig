import { useCallback, useEffect, useRef, useState } from "react";
import api from "../lib/api";
import type { DirectoryEntry } from "../lib/directory";

export const DIRECTORY_PAGE_SIZE = 5;

export type DirectorySearchFilters = {
  q: string;
  type: "" | "sathi" | "student";
  classValue: number | null;
  schoolName: string;
  masjid: string | null;
  claimedStatus: "" | "claimed" | "unclaimed";
  timeGivenValue: number | null;
  masturatDaysValue: number | null;
};

export const EMPTY_DIRECTORY_FILTERS: DirectorySearchFilters = {
  q: "",
  type: "",
  classValue: null,
  schoolName: "",
  masjid: null,
  claimedStatus: "",
  timeGivenValue: null,
  masturatDaysValue: null,
};

type Options = {
  /** When true, skip fetch until q or at least one filter is set. */
  requireQuery?: boolean;
  initialFilters?: Partial<DirectorySearchFilters>;
  /** When true, each entry includes the last 2 karguzari (karguzari-select page only). */
  withKarguzari?: boolean;
};

function mergeFilters(initial?: Partial<DirectorySearchFilters>): DirectorySearchFilters {
  return {
    ...EMPTY_DIRECTORY_FILTERS,
    ...initial,
  };
}

function hasSearchCriteria(filters: DirectorySearchFilters) {
  return !!(
    filters.q.trim() ||
    filters.type ||
    filters.classValue != null ||
    filters.schoolName ||
    filters.masjid ||
    filters.claimedStatus ||
    filters.timeGivenValue != null ||
    filters.masturatDaysValue != null
  );
}

function buildParams(
  pageNumber: number,
  filters: DirectorySearchFilters,
  withKarguzari = false,
) {
  const params: Record<string, string | number | boolean> = {
    page: pageNumber,
    limit: DIRECTORY_PAGE_SIZE,
  };
  if (withKarguzari) params.withKarguzari = true;
  if (filters.q) params.q = filters.q;
  if (filters.type) params.type = filters.type;
  if (filters.classValue != null) params.classValue = filters.classValue;
  if (filters.schoolName) params.schoolName = filters.schoolName;
  if (filters.masjid) params.masjid = filters.masjid;
  if (filters.claimedStatus) params.claimedStatus = filters.claimedStatus;
  if (filters.timeGivenValue != null) params.timeGivenValue = filters.timeGivenValue;
  if (filters.masturatDaysValue != null) params.masturatDaysValue = filters.masturatDaysValue;
  return params;
}

export function useDirectorySearch(options: Options = {}) {
  const { requireQuery = false, initialFilters, withKarguzari = false } = options;
  const [filters, setFilters] = useState<DirectorySearchFilters>(
    mergeFilters(initialFilters),
  );
  const [results, setResults] = useState<DirectoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searched, setSearched] = useState(false);
  const loadingMoreRef = useRef(false);
  const fetchIdRef = useRef(0);

  const fetchPage = useCallback(
    async (pageNumber: number, nextFilters = filters) => {
      if (requireQuery && !hasSearchCriteria(nextFilters)) {
        setResults([]);
        setTotal(0);
        setHasMore(false);
        setSearched(false);
        setLoading(false);
        return;
      }

      const isFirstPage = pageNumber === 1;
      const fetchId = ++fetchIdRef.current;

      if (isFirstPage) {
        setLoading(true);
      } else {
        if (loadingMoreRef.current) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
      }

      try {
        const res = await api.get("/persons", {
          params: buildParams(pageNumber, nextFilters, withKarguzari),
        });
        if (fetchId !== fetchIdRef.current) return;

        const newData: DirectoryEntry[] = res.data.data ?? [];
        const pagination = res.data.pagination;
        setResults((prev) => (isFirstPage ? newData : [...prev, ...newData]));
        setTotal(pagination?.total ?? 0);
        setPage(pageNumber);
        setHasMore(pageNumber < (pagination?.pages ?? 1));
        setSearched(true);
      } catch {
        if (fetchId === fetchIdRef.current && isFirstPage) {
          setResults([]);
          setTotal(0);
        }
      } finally {
        if (fetchId === fetchIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
          loadingMoreRef.current = false;
        }
      }
    },
    [filters, requireQuery, withKarguzari],
  );

  useEffect(() => {
    const timer = setTimeout(() => fetchPage(1), 400);
    return () => clearTimeout(timer);
  }, [filters, fetchPage]);

  function updateFilter<K extends keyof DirectorySearchFilters>(
    key: K,
    value: DirectorySearchFilters[K],
  ) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters(EMPTY_DIRECTORY_FILTERS);
  }

  function loadMore() {
    if (!loading && !loadingMoreRef.current && hasMore) {
      fetchPage(page + 1);
    }
  }

  function resetFilters() {
    setFilters(EMPTY_DIRECTORY_FILTERS);
    setResults([]);
    setTotal(0);
    setSearched(false);
  }

  function removeResult(id: string) {
    setResults((prev) => prev.filter((entry) => entry._id !== id));
    setTotal((prev) => Math.max(0, prev - 1));
  }

  const hasFilters = hasSearchCriteria(filters);

  return {
    filters,
    results,
    total,
    page,
    hasMore,
    loading,
    loadingMore,
    searched,
    hasFilters,
    updateFilter,
    clearFilters,
    loadMore,
    resetFilters,
    removeResult,
  };
}
