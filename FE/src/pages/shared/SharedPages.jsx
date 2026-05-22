function NotificationsPage() {
    const { data: notifications, refresh } = useApi("/notifications", []);
    const toast = useToast();
    const markAll = async () => {
        await api.put("/notifications/read-all");
        toast("Đã đánh dấu tất cả là đã đọc", "success");
        refresh();
    };
    return (
        <>
            <PageHeader title="Thông báo" action={<button className="btn ghost" onClick={markAll}>Đánh dấu đã đọc</button>} />
            <PaginatedGrid items={notifications} pageSize={10} label="thông báo" emptyText="Chưa có thông báo">
                {(item) => (
                    <div key={item.id} className="card">
                        <Badge value={item.is_read ? "Đã đọc" : "Mới"} type={item.is_read ? "" : "primary"} />
                        <h3>{item.title}</h3>
                        <p className="muted">{item.message}</p>
                        <p className="muted">{formatDate(item.created_at)}</p>
                    </div>
                )}
            </PaginatedGrid>
        </>
    );
}

function ProfilePage() {
    const { user, refreshProfile } = useAuth();
    const toast = useToast();
    const [password, setPassword] = React.useState({ currentPassword: "", newPassword: "" });
    const submit = async (event) => {
        event.preventDefault();
        await api.put("/auth/change-password", password);
        setPassword({ currentPassword: "", newPassword: "" });
        toast("Đổi mật khẩu thành công", "success");
        refreshProfile();
    };

    return (
        <>
            <PageHeader title="Hồ sơ người dùng" />
            <div className="grid cols-2">
                <Section title="Thông tin tài khoản">
                    <InfoRows rows={[
                        ["Họ tên", user?.full_name],
                        ["Email", user?.email],
                        ["Vai trò", roleName(user?.role_code)],
                        ["Phòng ban", user?.department_name || "-"]
                    ]} />
                </Section>
                <Section title="Đổi mật khẩu">
                    <form className="form" onSubmit={submit}>
                        <Field label="Mật khẩu hiện tại"><PasswordInput value={password.currentPassword} onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })} autoComplete="current-password" required /></Field>
                        <Field label="Mật khẩu mới"><PasswordInput value={password.newPassword} onChange={(e) => setPassword({ ...password, newPassword: e.target.value })} autoComplete="new-password" required /></Field>
                        <button className="btn primary">Đổi mật khẩu</button>
                    </form>
                </Section>
            </div>
        </>
    );
}

function ProfileEditorPage() {
    const { user, refreshProfile } = useAuth();
    const toast = useToast();
    const [profile, setProfile] = React.useState({ fullName: "", email: "", phone: "" });
    const [avatarFile, setAvatarFile] = React.useState(null);
    const [avatarPreview, setAvatarPreview] = React.useState("");
    const [password, setPassword] = React.useState({ currentPassword: "", newPassword: "" });

    React.useEffect(() => {
        setProfile({
            fullName: user?.full_name || "",
            email: user?.email || "",
            phone: user?.phone || ""
        });
    }, [user?.id, user?.full_name, user?.email, user?.phone]);

    React.useEffect(() => {
        if (!avatarFile) {
            setAvatarPreview("");
            return;
        }
        const url = URL.createObjectURL(avatarFile);
        setAvatarPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [avatarFile]);

    const submitProfile = async (event) => {
        event.preventDefault();
        const form = new FormData();
        form.append("fullName", profile.fullName);
        form.append("email", profile.email);
        form.append("phone", profile.phone);
        if (avatarFile) form.append("avatar", avatarFile);

        try {
            await api.put("/auth/profile", form, { headers: { "Content-Type": "multipart/form-data" } });
            await refreshProfile();
            setAvatarFile(null);
            toast("Cập nhật hồ sơ thành công", "success");
        } catch (error) {
            toast(errorMessage(error), "error");
        }
    };

    const submitPassword = async (event) => {
        event.preventDefault();
        try {
            await api.put("/auth/change-password", password);
            setPassword({ currentPassword: "", newPassword: "" });
            toast("Đổi mật khẩu thành công", "success");
            refreshProfile();
        } catch (error) {
            toast(errorMessage(error), "error");
        }
    };

    return (
        <>
            <PageHeader title="Hồ sơ người dùng" />
            <div className="grid cols-2">
                <Section title="Cập nhật hồ sơ">
                    <form className="form" onSubmit={submitProfile}>
                        <div className="profile-avatar-row">
                            <Avatar user={user} src={avatarPreview || mediaUrl(user?.avatar_url)} size="lg" />
                            <div>
                                <strong>{user?.full_name || "Người dùng"}</strong>
                                <p className="muted" style={{ margin: "4px 0 10px" }}>{roleName(user?.role_code)} - {user?.department_name || "Chưa có phòng ban"}</p>
                                <input className="input" type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={(event) => setAvatarFile(event.target.files[0] || null)} />
                            </div>
                        </div>
                        <Field label="Họ tên">
                            <input className="input" value={profile.fullName} onChange={(event) => setProfile({ ...profile, fullName: event.target.value })} required />
                        </Field>
                        <Field label="Email">
                            <input className="input" type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} required />
                        </Field>
                        <Field label="Số điện thoại">
                            <input className="input" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} placeholder="Chưa cập nhật" />
                        </Field>
                        <button className="btn primary">Lưu hồ sơ</button>
                    </form>
                </Section>
                <Section title="Đổi mật khẩu">
                    <form className="form" onSubmit={submitPassword}>
                        <Field label="Mật khẩu hiện tại"><PasswordInput value={password.currentPassword} onChange={(event) => setPassword({ ...password, currentPassword: event.target.value })} autoComplete="current-password" required /></Field>
                        <Field label="Mật khẩu mới"><PasswordInput value={password.newPassword} onChange={(event) => setPassword({ ...password, newPassword: event.target.value })} autoComplete="new-password" required /></Field>
                        <button className="btn primary">Đổi mật khẩu</button>
                    </form>
                </Section>
            </div>
        </>
    );
}
