function Field({ label, children }) {
    return <label className="field"><span>{label}</span>{children}</label>;
}

function PageHeader({ title, subtitle, action }) {
    return (
        <div className="toolbar">
            <div>
                <h1 className="page-title">{title}</h1>
                {subtitle && <p className="page-subtitle">{subtitle}</p>}
            </div>
            {action}
        </div>
    );
}

function Stats({ values }) {
    return (
        <div className="grid cols-4" style={{ marginBottom: 22 }}>
            {values.map(([label, value]) => (
                <div key={label} className="card">
                    <p className="stat-label">{label}</p>
                    <p className="stat-value">{value}</p>
                </div>
            ))}
        </div>
    );
}

function Section({ title, children }) {
    return (
        <section className="card" style={{ marginBottom: 18 }}>
            <h2 style={{ marginTop: 0 }}>{title}</h2>
            {children}
        </section>
    );
}
