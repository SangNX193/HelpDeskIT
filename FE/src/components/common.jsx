function Field({ label, children }) {
    return <label className="field"><span>{label}</span>{children}</label>;
}

function PasswordInput({ className = "", ...props }) {
    const [visible, setVisible] = React.useState(false);
    const label = visible ? "Ẩn mật khẩu" : "Hiện mật khẩu";

    return (
        <div className="password-field">
            <input
                {...props}
                className={`input password-input ${className}`.trim()}
                type={visible ? "text" : "password"}
            />
            <button
                className="password-toggle"
                type="button"
                aria-label={label}
                title={label}
                onMouseDown={(event) => event.preventDefault()}
                onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setVisible((value) => !value);
                }}
            >
                <Icon name={visible ? "visibility_off" : "visibility"} />
            </button>
        </div>
    );
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
