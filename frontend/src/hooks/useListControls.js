import { useMemo, useState } from "react";

const DEFAULT_PAGE_SIZE = 8;

export function useListControls(items, options = {}) {
    const {
        pageSize = DEFAULT_PAGE_SIZE,
        defaultSort = "name",
        sortOptions = {}
    } = options;

    const [page, setPage] = useState(1);
    const [sortBy, setSortBy] = useState(defaultSort);

    const sortedItems = useMemo(() => {
        const list = [...(items || [])];
        const sorter = sortOptions[sortBy];

        if (sorter) {
            list.sort(sorter);
        }

        return list;
    }, [items, sortBy, sortOptions]);

    const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
    const currentPage = Math.min(page, totalPages);

    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return sortedItems.slice(start, start + pageSize);
    }, [sortedItems, currentPage, pageSize]);

    const resetPage = () => setPage(1);

    return {
        page: currentPage,
        setPage,
        sortBy,
        setSortBy,
        pageSize,
        totalPages,
        totalItems: sortedItems.length,
        paginatedItems,
        sortedItems,
        resetPage
    };
}
