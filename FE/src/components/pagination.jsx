function usePagination(items, initialPageSize = DEFAULT_PAGE_SIZE) {
    const safeItems = Array.isArray(items) ? items : [];
    const [page, setPage] = React.useState(1);
    const [pageSize, setPageSizeValue] = React.useState(initialPageSize);
    const totalItems = safeItems.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const startIndex = (safePage - 1) * pageSize;

    React.useEffect(() => {
        setPage((current) => Math.min(Math.max(current, 1), totalPages));
    }, [totalPages]);

    const setPageSize = (value) => {
        setPageSizeValue(Number(value) || initialPageSize);
        setPage(1);
    };

    return {
        items: safeItems.slice(startIndex, startIndex + pageSize),
        page: safePage,
        pageSize,
        totalItems,
        totalPages,
        start: totalItems ? startIndex + 1 : 0,
        end: Math.min(startIndex + pageSize, totalItems),
        setPage,
        setPageSize
    };
}

function Pagination({ page, pageSize, totalItems, totalPages, start, end, setPage, setPageSize, label = "mục" }) {
    if (totalItems <= pageSize && totalPages <= 1) return null;
    const sizeOptions = PAGE_SIZE_OPTIONS.includes(pageSize)
        ? PAGE_SIZE_OPTIONS
        : [...PAGE_SIZE_OPTIONS, pageSize].sort((left, right) => left - right);

    return (
        <div className="pagination">
            <div className="pagination-info">
                Hiển thị {start}-{end} / {totalItems} {label}
            </div>
            <div className="pagination-controls">
                <label className="pagination-size">
                    <span>Số dòng</span>
                    <select className="select compact" value={pageSize} onChange={(event) => setPageSize(event.target.value)}>
                        {sizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}
                    </select>
                </label>
                <button className="btn ghost icon-btn" type="button" disabled={page <= 1} onClick={() => setPage(1)} aria-label="Trang đầu">
                    <Icon name="first_page" />
                </button>
                <button className="btn ghost icon-btn" type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Trang trước">
                    <Icon name="chevron_left" />
                </button>
                <span className="pagination-page">Trang {page}/{totalPages}</span>
                <button className="btn ghost icon-btn" type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)} aria-label="Trang sau">
                    <Icon name="chevron_right" />
                </button>
                <button className="btn ghost icon-btn" type="button" disabled={page >= totalPages} onClick={() => setPage(totalPages)} aria-label="Trang cuối">
                    <Icon name="last_page" />
                </button>
            </div>
        </div>
    );
}

function PaginatedGrid({ items, pageSize, label, emptyText, className = "grid", children }) {
    const pagination = usePagination(items, pageSize);

    if (!pagination.totalItems) return <Empty text={emptyText} />;

    return (
        <>
            <div className={className}>
                {pagination.items.map(children)}
            </div>
            <Pagination {...pagination} label={label} />
        </>
    );
}
