function LoginPage() {
    const { login } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const [form, setForm] = React.useState({ email: "", password: "" });
    const [loading, setLoading] = React.useState(false);

    const submit = async (event) => {
        event.preventDefault();
        setLoading(true);
        try {
            const user = await login(form.email, form.password);
            toast("Đăng nhập thành công", "success");
            navigate(dashboardPath(user.role_code), { replace: true });
        } catch (error) {
            toast(errorMessage(error), "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <section className="login-visual">
                <div>
                    <div className="brand-mark" style={{ width: 72, height: 72, marginBottom: 24 }}>UTC</div>
                    <h1 style={{ fontSize: 42, lineHeight: "52px", margin: 0 }}>Hệ thống quản lý yêu cầu hỗ trợ CNTT</h1>
                    <p style={{ fontSize: 18, lineHeight: "28px", maxWidth: 560 }}>
                        Sản phẩm nội bộ cho Trường Đại học Giao thông Vận tải: tiếp nhận tập trung, phân công rõ ràng, xử lý theo SLA.
                    </p>
                </div>
            </section>
            <section className="login-panel">
                <form className="login-card form" onSubmit={submit}>
                    <div>
                        <h2 className="page-title">Đăng nhập</h2>
                    </div>
                    <Field label="Tài khoản / Email">
                        <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Nhập email của bạn" />
                    </Field>
                    <Field label="Mật khẩu">
                        <PasswordInput value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Nhập mật khẩu" autoComplete="current-password" />
                    </Field>
                    <button className="btn primary" disabled={loading}>{loading ? "Đang đăng nhập..." : "Đăng nhập"}</button>
                    <div className="card" style={{ fontSize: 13 }}>
                        <strong>Lưu ý: Để đăng nhập</strong>
                        <ol style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                            <li>Đối với cán bộ - giảng viên sử dụng tài khoản u-smart.</li>
                            <li>Đối với sinh viên sử dụng tài khoản Office365 theo cấu trúc [Tên sinh viên][Mã sinh viên]@lms.utc.edu.vn.</li>
                        </ol>
                    </div>
                </form>
            </section>
        </div>
    );
}
