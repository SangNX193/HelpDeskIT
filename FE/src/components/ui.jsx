function InfoRows({ rows }) {
    return (
        <div className="grid">
            {rows.map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span className="muted">{label}</span>
                    <strong>{value || "-"}</strong>
                </div>
            ))}
        </div>
    );
}

function SimpleList({ items, getLabel, getValue, pageSize = 0, label = "mục" }) {
    const safeItems = Array.isArray(items) ? items : [];
    const pagination = usePagination(safeItems, pageSize || Math.max(safeItems.length, 1));
    const visibleItems = pageSize ? pagination.items : safeItems;

    if (!safeItems.length) return <Empty text="Chưa có dữ liệu" />;

    return (
        <>
            <div className="grid">
                {visibleItems.map((item, index) => (
                    <div key={item.id || item.support_id || index} className="card" style={{ boxShadow: "none", padding: 12, display: "flex", justifyContent: "space-between" }}>
                        <span>{getLabel(item)}</span>
                        <strong>{getValue(item)}</strong>
                    </div>
                ))}
            </div>
            {pageSize > 0 && <Pagination {...pagination} label={label} />}
        </>
    );
}

function Badge({ value, type = "" }) {
    return <span className={`badge ${type}`}>{value || "-"}</span>;
}

function RatingStars({ rating, showValue = false }) {
    const safeRating = Math.max(0, Math.min(5, Number(rating) || 0));

    return (
        <span className="rating-stars" aria-label={`${safeRating} sao`}>
            {[1, 2, 3, 4, 5].map((value) => (
                <span key={value} className={`material-symbols-outlined ${value <= safeRating ? "active" : ""}`}>star</span>
            ))}
            {showValue && <strong>{safeRating}/5</strong>}
        </span>
    );
}

function Icon({ name }) {
    return <span className="material-symbols-outlined">{name}</span>;
}

function Avatar({ user, src, size = "md" }) {
    const imageSrc = src || mediaUrl(user?.avatar_url);
    return (
        <div className={`avatar ${size}`}>
            {imageSrc ? <img src={imageSrc} alt={user?.full_name || "avatar"} /> : <span>{initials(user?.full_name || user?.email)}</span>}
        </div>
    );
}

function LocalFilePreview({ file }) {
    const [url, setUrl] = React.useState("");

    React.useEffect(() => {
        if (!file || !file.type.startsWith("image/")) {
            setUrl("");
            return;
        }

        const nextUrl = URL.createObjectURL(file);
        setUrl(nextUrl);
        return () => URL.revokeObjectURL(nextUrl);
    }, [file]);

    return (
        <div className="attachment-item">
            {url ? <img src={url} alt={file.name} /> : <Icon name="attach_file" />}
            <span>{file.name}</span>
        </div>
    );
}

function AttachmentPreview({ file }) {
    const url = mediaUrl(file.file_path);
    const isImage = isImageAttachment(file);

    return (
        <a className="attachment-item" href={url} target="_blank" rel="noreferrer">
            {isImage ? <img src={url} alt={file.original_name} /> : <Icon name="attach_file" />}
            <span>{file.original_name}</span>
        </a>
    );
}

function Empty({ text }) {
    return <div className="empty">{text}</div>;
}
