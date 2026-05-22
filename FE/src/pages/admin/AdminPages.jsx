function AdminCatalog() {
    const cards = [
        { label: "Sinh viên / Người dùng", icon: "person", to: "/admin/catalog/users", description: "Quản lý tài khoản người gửi yêu cầu." },
        { label: "Quản lý tòa", icon: "supervisor_account", to: "/admin/catalog/managers", description: "Gán mỗi quản lý phụ trách một tòa." },
        { label: "Nhân viên IT", icon: "support_agent", to: "/admin/catalog/staff", description: "Quản lý tài khoản nhân viên xử lý." },
        { label: "Phòng ban", icon: "domain", to: "/admin/catalog/departments", description: "Quản lý khu/tòa như A2, A3, A7." },
        { label: "Dịch vụ", icon: "category", to: "/admin/catalog/services", description: "Quản lý nhóm dịch vụ và hạng mục hỗ trợ." }
    ];
    return (
        <>
            <PageHeader title="Danh mục và người dùng" subtitle="Quản lý người dùng, khu/tòa và các danh mục hỗ trợ." />
            <div className="grid cols-4">
                {cards.map(({ label, icon, to, description }) => (
                    <Link key={to} className="card" to={to}>
                        <span className="material-symbols-outlined" style={{ color: "var(--primary)", fontSize: 34 }}>{icon}</span>
                        <h3>{label}</h3>
                        <p className="muted">{description}</p>
                    </Link>
                ))}
            </div>
        </>
    );
}

function AdminDepartments() {
    const { data: departments, refresh } = useApi("/departments", []);
    const toast = useToast();
    const confirm = useConfirm();
    const [formOpen, setFormOpen] = React.useState(false);
    const [editingDepartment, setEditingDepartment] = React.useState(null);
    const [form, setForm] = React.useState({ name: "", code: "", description: "", isActive: true });
    const [saving, setSaving] = React.useState(false);
    const pagination = usePagination(departments, 10);

    const openCreate = () => {
        setEditingDepartment(null);
        setForm({ name: "", code: "", description: "", isActive: true });
        setFormOpen(true);
    };

    const openEdit = (department) => {
        setEditingDepartment(department);
        setForm({
            name: department.name || "",
            code: department.code || "",
            description: department.description || "",
            isActive: Number(department.is_active) === 1
        });
        setFormOpen(true);
    };

    const closeForm = () => {
        setFormOpen(false);
        setEditingDepartment(null);
        setForm({ name: "", code: "", description: "", isActive: true });
    };

    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...form,
                code: form.code
            };
            if (editingDepartment) {
                await api.put(`/departments/${editingDepartment.id}`, payload);
                toast("Cập nhật phòng ban thành công", "success");
            } else {
                await api.post("/departments", { ...payload, isActive: true });
                toast("Tạo phòng ban thành công", "success");
            }
            await refresh();
            closeForm();
        } catch (error) {
            toast(errorMessage(error), "error");
        } finally {
            setSaving(false);
        }
    };

    const deleteDepartment = async (department) => {
        const ok = await confirm({
            title: "Xóa phòng ban",
            message: `Xác nhận vô hiệu hóa ${department.name}?`,
            confirmText: "Xóa"
        });
        if (!ok) return;
        try {
            await api.delete(`/departments/${department.id}`);
            toast("Đã vô hiệu hóa phòng ban", "success");
            refresh();
        } catch (error) {
            toast(errorMessage(error), "error");
        }
    };

    return (
        <>
            <PageHeader
                title="Phòng ban"
                subtitle="Quản lý các khu/tòa dùng khi phân loại người dùng và địa điểm hỗ trợ."
                action={<button className="btn primary" type="button" onClick={openCreate}><Icon name="add" />Thêm phòng ban</button>}
            />
            {pagination.totalItems ? (
                <>
                    <div className="card table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Mã</th>
                                    <th>Tên phòng ban</th>
                                    <th>Mô tả</th>
                                    <th>Trạng thái</th>
                                    <th>Cập nhật</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pagination.items.map((department) => (
                                    <tr key={department.id}>
                                        <td><strong>{department.code}</strong></td>
                                        <td>{department.name}</td>
                                        <td>{department.description || "-"}</td>
                                        <td><Badge value={Number(department.is_active) === 1 ? "ACTIVE" : "INACTIVE"} type={Number(department.is_active) === 1 ? "success" : "danger"} /></td>
                                        <td>{formatDate(department.updated_at || department.created_at)}</td>
                                        <td>
                                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                                <button className="btn ghost" type="button" onClick={() => openEdit(department)}><Icon name="edit" />Sửa</button>
                                                <button className="btn danger" type="button" onClick={() => deleteDepartment(department)}><Icon name="delete" />Xóa</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination {...pagination} label="phòng ban" />
                </>
            ) : (
                <div className="card"><Empty text="Chưa có phòng ban" /></div>
            )}
            {formOpen && (
                <div className="modal-backdrop">
                    <form className="modal form" onSubmit={submit}>
                        <div>
                            <h3 style={{ margin: 0 }}>{editingDepartment ? "Sửa phòng ban" : "Thêm phòng ban"}</h3>
                            <p className="muted" style={{ margin: "6px 0 0" }}>Có thể dùng cho các tòa như A2, A3, A7 hoặc khu vực cần quản lý.</p>
                        </div>
                        <Field label="Tên phòng ban">
                            <input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Tòa A2" required />
                        </Field>
                        <Field label="Mã tòa">
                            <input className="input" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="A2" required />
                        </Field>
                        <Field label="Mô tả">
                            <textarea className="textarea" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Các phòng học, phòng máy hoặc khu vực thuộc tòa này" />
                        </Field>
                        {editingDepartment && (
                            <Field label="Trạng thái">
                                <select className="select" value={String(form.isActive)} onChange={(event) => setForm({ ...form, isActive: event.target.value === "true" })}>
                                    <option value="true">Hoạt động</option>
                                    <option value="false">Vô hiệu hóa</option>
                                </select>
                            </Field>
                        )}
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                            <button className="btn ghost" type="button" onClick={closeForm} disabled={saving}>Đóng</button>
                            <button className="btn primary" disabled={saving}>{saving ? "Đang lưu..." : editingDepartment ? "Lưu thay đổi" : "Lưu phòng ban"}</button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
}

function AdminUsers({ roleCode, title }) {
    const { data: users, refresh } = useApi(`/users?roleCode=${roleCode}`, []);
    const { data: departments } = useApi("/departments", []);
    const toast = useToast();
    const confirm = useConfirm();
    const [departmentUser, setDepartmentUser] = React.useState(null);
    const [editingUser, setEditingUser] = React.useState(null);
    const [selectedDepartments, setSelectedDepartments] = React.useState([]);
    const [savingDepartments, setSavingDepartments] = React.useState(false);
    const canAssignDepartments = ["MANAGER", "SUPPORT"].includes(roleCode);

    const setStatus = async (user, status) => {
        const ok = await confirm({ title: status === "LOCKED" ? "Khóa tài khoản" : "Mở khóa tài khoản", message: `Xác nhận cập nhật ${user.full_name}?` });
        if (!ok) return;
        await api.put(`/users/${user.id}/status`, { status });
        toast("Cập nhật tài khoản thành công", "success");
        refresh();
    };

    const assignedDepartmentIds = (user) => String(user.assigned_department_ids || user.department_id || "")
        .split(",")
        .map((value) => Number(value))
        .filter(Boolean);

    const openDepartmentAssign = (user) => {
        setDepartmentUser(user);
        setSelectedDepartments(assignedDepartmentIds(user));
    };

    const toggleDepartment = (departmentId) => {
        setSelectedDepartments((items) => (
            items.includes(departmentId)
                ? items.filter((item) => item !== departmentId)
                : [...items, departmentId]
        ));
    };

    const saveDepartmentAssign = async (event) => {
        event.preventDefault();
        if (!departmentUser) return;
        setSavingDepartments(true);
        try {
            await api.put(`/users/${departmentUser.id}/departments`, { departmentIds: selectedDepartments });
            toast("Cập nhật phân công tòa thành công", "success");
            setDepartmentUser(null);
            setSelectedDepartments([]);
            refresh();
        } catch (error) {
            toast(errorMessage(error), "error");
        } finally {
            setSavingDepartments(false);
        }
    };

    const deleteUser = async (user) => {
        const ok = await confirm({
            title: "Xóa người dùng",
            message: `Xác nhận xóa vĩnh viễn tài khoản ${user.full_name} khỏi database?`,
            confirmText: "Xóa"
        });
        if (!ok) return;
        try {
            await api.delete(`/users/${user.id}`);
            toast("Đã xóa người dùng", "success");
            refresh();
        } catch (error) {
            toast(errorMessage(error), "error");
        }
    };

    return (
        <>
            <PageHeader title={title} action={<Link className="btn primary" to="/admin/permissions/create-user"><Icon name="add" />Thêm người dùng</Link>} />
            <UserTable
                users={users}
                onStatus={setStatus}
                onEdit={setEditingUser}
                onDelete={deleteUser}
                onDepartmentAssign={canAssignDepartments ? openDepartmentAssign : null}
            />
            {departmentUser && (
                <div className="modal-backdrop">
                    <form className="modal form" onSubmit={saveDepartmentAssign}>
                        <div>
                            <h3 style={{ margin: 0 }}>Phân công tòa</h3>
                            <p className="muted" style={{ margin: "6px 0 0" }}>{departmentUser.full_name}</p>
                        </div>
                        <Field label={roleCode === "MANAGER" ? "Tòa quản lý" : "Tòa hỗ trợ"}>
                            <DepartmentPicker
                                departments={departments}
                                selectedIds={selectedDepartments}
                                onToggle={toggleDepartment}
                            />
                        </Field>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                            <button className="btn ghost" type="button" onClick={() => setDepartmentUser(null)} disabled={savingDepartments}>Đóng</button>
                            <button className="btn primary" disabled={savingDepartments}>{savingDepartments ? "Đang lưu..." : "Lưu phân công"}</button>
                        </div>
                    </form>
                </div>
            )}
            {editingUser && (
                <UserEditModal
                    user={editingUser}
                    departments={departments}
                    onClose={() => setEditingUser(null)}
                    onSaved={() => {
                        setEditingUser(null);
                        refresh();
                    }}
                />
            )}
        </>
    );
}

function UserTable({ users, roles = [], onStatus, onRoleChange, onDepartmentAssign, onEdit, onDelete }) {
    const pagination = usePagination(users, 10);

    if (!pagination.totalItems) return <Empty text="Chưa có người dùng" />;

    return (
        <>
            <div className="card table-wrap">
                <table className="table">
                    <thead><tr><th>Họ tên</th><th>Email</th><th>Vai trò</th><th>Phòng ban</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
                    <tbody>
                        {pagination.items.map((user) => (
                            <tr key={user.id}>
                                <td>{user.full_name}</td>
                                <td>{user.email}</td>
                                <td>
                                    {roles.length > 0 && onRoleChange ? (
                                        <select className="select compact" value={user.role_id || ""} onChange={(event) => onRoleChange(user, event.target.value)}>
                                            {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                                        </select>
                                    ) : roleName(user.role_code)}
                                </td>
                                <td>{user.assigned_department_names || user.department_name || "-"}</td>
                                <td><Badge value={user.status} type={user.status === "ACTIVE" ? "success" : "danger"} /></td>
                                <td>
                                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                        {onEdit && <button className="btn ghost" type="button" onClick={() => onEdit(user)}><Icon name="edit" />Sửa</button>}
                                        {onDepartmentAssign && (
                                            <button className="btn ghost" type="button" onClick={() => onDepartmentAssign(user)}>
                                                Phân tòa
                                            </button>
                                        )}
                                        {onStatus && (
                                            <button className="btn ghost" type="button" onClick={() => onStatus(user, user.status === "ACTIVE" ? "LOCKED" : "ACTIVE")}>
                                                {user.status === "ACTIVE" ? "Khóa" : "Mở khóa"}
                                            </button>
                                        )}
                                        {onDelete && <button className="btn danger" type="button" onClick={() => onDelete(user)}><Icon name="delete" />Xóa</button>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Pagination {...pagination} label="người dùng" />
        </>
    );
}

function UserEditModal({ user, departments = [], onClose, onSaved }) {
    const toast = useToast();
    const [saving, setSaving] = React.useState(false);
    const [form, setForm] = React.useState({
        fullName: user.full_name || "",
        email: user.email || "",
        phone: user.phone || "",
        departmentIds: userDepartmentIds(user)
    });

    React.useEffect(() => {
        setForm({
            fullName: user.full_name || "",
            email: user.email || "",
            phone: user.phone || "",
            departmentIds: userDepartmentIds(user)
        });
    }, [user]);

    const toggleDepartment = (departmentId) => {
        setForm((state) => ({
            ...state,
            departmentIds: state.departmentIds.includes(departmentId)
                ? state.departmentIds.filter((item) => item !== departmentId)
                : [...state.departmentIds, departmentId]
        }));
    };

    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            await api.put(`/users/${user.id}`, {
                fullName: form.fullName,
                email: form.email,
                phone: form.phone
            });
            if (!sameNumberList(form.departmentIds, userDepartmentIds(user))) {
                await api.put(`/users/${user.id}/departments`, {
                    departmentIds: form.departmentIds
                });
            }
            toast("Cập nhật người dùng thành công", "success");
            onSaved();
        } catch (error) {
            toast(errorMessage(error), "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-backdrop">
            <form className="modal form" onSubmit={submit}>
                <div>
                    <h3 style={{ margin: 0 }}>Sửa người dùng</h3>
                    <p className="muted" style={{ margin: "6px 0 0" }}>{roleName(user.role_code)}</p>
                </div>
                <div className="form-grid">
                    <Field label="Họ tên">
                        <input className="input" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required />
                    </Field>
                    <Field label="Email">
                        <input className="input" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
                    </Field>
                    <Field label="Số điện thoại">
                        <input className="input" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Chưa cập nhật" />
                    </Field>
                    <div className="field span-2">
                        <span>Phòng ban</span>
                        <DepartmentPicker
                            departments={departments}
                            selectedIds={form.departmentIds}
                            onToggle={toggleDepartment}
                        />
                    </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                    <button className="btn ghost" type="button" onClick={onClose} disabled={saving}>Đóng</button>
                    <button className="btn primary" disabled={saving}>{saving ? "Đang lưu..." : "Lưu thay đổi"}</button>
                </div>
            </form>
        </div>
    );
}

function DepartmentPicker({ departments = [], selectedIds = [], onToggle }) {
    if (!departments.length) return <Empty text="Chưa có phòng ban" />;

    return (
        <div className="department-picker">
            {departments.map((department) => {
                const checked = selectedIds.includes(department.id);
                return (
                    <button
                        key={department.id}
                        className={`department-choice ${checked ? "active" : ""}`}
                        type="button"
                        role="checkbox"
                        aria-checked={checked}
                        onClick={() => onToggle(department.id)}
                    >
                        <span>
                            <strong>{department.name}</strong>
                            <small>{department.code}</small>
                        </span>
                        <span className="department-choice-dot">
                            {checked && <Icon name="check" />}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

function userDepartmentIds(user) {
    const assignedIds = String(user?.assigned_department_ids || "")
        .split(",")
        .map((value) => Number(value))
        .filter(Boolean);

    if (assignedIds.length) return assignedIds;
    return user?.department_id ? [Number(user.department_id)] : [];
}

function sameNumberList(left = [], right = []) {
    const normalize = (items) => [...new Set(items.map((item) => Number(item)).filter(Boolean))].sort((a, b) => a - b);
    const normalizedLeft = normalize(left);
    const normalizedRight = normalize(right);
    return normalizedLeft.length === normalizedRight.length && normalizedLeft.every((item, index) => item === normalizedRight[index]);
}

function AdminServices() {
    const { data: categories, refresh } = useApi("/service-categories", []);
    const { data: services } = useApi("/services", []);
    const toast = useToast();
    const confirm = useConfirm();
    const [editingCategory, setEditingCategory] = React.useState(null);
    const [form, setForm] = React.useState({ name: "", code: "", description: "", isActive: true });
    const [saving, setSaving] = React.useState(false);

    const openEdit = (category) => {
        setEditingCategory(category);
        setForm({
            name: category.name || "",
            code: category.code || "",
            description: category.description || "",
            isActive: Number(category.is_active) === 1
        });
    };

    const closeEdit = () => {
        setEditingCategory(null);
        setForm({ name: "", code: "", description: "", isActive: true });
    };

    const submitEdit = async (event) => {
        event.preventDefault();
        if (!editingCategory) return;
        setSaving(true);
        try {
            await api.put(`/service-categories/${editingCategory.id}`, {
                ...form,
                code: form.code || slugCode(form.name)
            });
            toast("Cập nhật nhóm dịch vụ thành công", "success");
            await refresh();
            closeEdit();
        } catch (error) {
            toast(errorMessage(error), "error");
        } finally {
            setSaving(false);
        }
    };

    const deleteCategory = async (category) => {
        const ok = await confirm({
            title: "Xóa nhóm dịch vụ",
            message: `Xác nhận vô hiệu hóa nhóm ${category.name}?`,
            confirmText: "Xóa"
        });
        if (!ok) return;
        try {
            await api.delete(`/service-categories/${category.id}`);
            toast("Đã vô hiệu hóa nhóm dịch vụ", "success");
            refresh();
        } catch (error) {
            toast(errorMessage(error), "error");
        }
    };

    return (
        <>
            <PageHeader title="Danh mục dịch vụ" subtitle="Chọn một nhóm để xem và quản lý các dịch vụ bên trong." action={<Link className="btn primary" to="/admin/catalog/services/create"><Icon name="add" />Thêm nhóm dịch vụ</Link>} />
            <PaginatedGrid items={categories} pageSize={6} label="nhóm dịch vụ" emptyText="Chưa có nhóm dịch vụ" className="grid cols-3">
                {(category) => (
                    <ServiceCategoryCard key={category.id} category={category} services={services} onEdit={openEdit} onDelete={deleteCategory} />
                )}
            </PaginatedGrid>
            {editingCategory && (
                <div className="modal-backdrop">
                    <form className="modal form" onSubmit={submitEdit}>
                        <div>
                            <h3 style={{ margin: 0 }}>Sửa nhóm dịch vụ</h3>
                            <p className="muted" style={{ margin: "6px 0 0" }}>Cập nhật thông tin nhóm đang chứa các dịch vụ bên trong.</p>
                        </div>
                        <Field label="Tên nhóm">
                            <input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
                        </Field>
                        <Field label="Mã nhóm">
                            <input className="input" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="Tự tạo nếu để trống" />
                        </Field>
                        <Field label="Mô tả">
                            <textarea className="textarea" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
                        </Field>
                        <Field label="Trạng thái">
                            <select className="select" value={String(form.isActive)} onChange={(event) => setForm({ ...form, isActive: event.target.value === "true" })}>
                                <option value="true">Hoạt động</option>
                                <option value="false">Vô hiệu hóa</option>
                            </select>
                        </Field>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                            <button className="btn ghost" type="button" onClick={closeEdit} disabled={saving}>Đóng</button>
                            <button className="btn primary" disabled={saving}>{saving ? "Đang lưu..." : "Lưu thay đổi"}</button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
}

function ServiceCategoryCard({ category, services, onEdit, onDelete }) {
    const categoryServices = services.filter((service) => service.category_id === category.id);

    return (
        <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                <span className="material-symbols-outlined" style={{ color: "var(--primary)", fontSize: 34 }}>folder</span>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <Badge value={`${categoryServices.length} dịch vụ`} type="primary" />
                    <Badge value={Number(category.is_active) === 1 ? "ACTIVE" : "INACTIVE"} type={Number(category.is_active) === 1 ? "success" : "danger"} />
                </div>
            </div>
            <h3>{category.name}</h3>
            <p className="muted">{category.description || "Chưa có mô tả"}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link className="btn ghost" to={`/admin/catalog/services/${category.id}`}>Xem dịch vụ</Link>
                {onEdit && <button className="btn ghost" type="button" onClick={() => onEdit(category)}><Icon name="edit" />Sửa</button>}
                {onDelete && <button className="btn danger" type="button" onClick={() => onDelete(category)}><Icon name="delete" />Xóa</button>}
            </div>
        </div>
    );
}

function ServiceCategoryDetailPage() {
    const { categoryId } = useParams();
    const toast = useToast();
    const confirm = useConfirm();
    const { data: categories } = useApi("/service-categories", []);
    const { data: services, refresh } = useApi("/services", []);
    const category = categories.find((item) => Number(item.id) === Number(categoryId));
    const categoryServices = services.filter((service) => Number(service.category_id) === Number(categoryId));
    const pagination = usePagination(categoryServices, 10);
    const [formOpen, setFormOpen] = React.useState(false);
    const [editingService, setEditingService] = React.useState(null);
    const [form, setForm] = React.useState({ name: "", code: "", description: "", isActive: true });
    const [saving, setSaving] = React.useState(false);

    const openCreate = () => {
        setEditingService(null);
        setForm({ name: "", code: "", description: "", isActive: true });
        setFormOpen(true);
    };

    const openEdit = (service) => {
        setEditingService(service);
        setForm({
            name: service.name || "",
            code: service.code || "",
            description: service.description || "",
            isActive: Number(service.is_active) === 1
        });
        setFormOpen(true);
    };

    const closeForm = () => {
        setFormOpen(false);
        setEditingService(null);
        setForm({ name: "", code: "", description: "", isActive: true });
    };

    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            const payload = {
                categoryId,
                ...form,
                code: form.code || slugCode(form.name)
            };
            if (editingService) {
                await api.put(`/services/${editingService.id}`, payload);
                toast("Cập nhật dịch vụ thành công", "success");
            } else {
                await api.post("/services", { ...payload, isActive: true });
                toast("Tạo dịch vụ thành công", "success");
            }
            await refresh();
            closeForm();
        } catch (error) {
            toast(errorMessage(error), "error");
        } finally {
            setSaving(false);
        }
    };

    const deleteService = async (service) => {
        const ok = await confirm({
            title: "Xóa dịch vụ",
            message: `Xác nhận vô hiệu hóa dịch vụ ${service.name}?`,
            confirmText: "Xóa"
        });
        if (!ok) return;
        try {
            await api.delete(`/services/${service.id}`);
            toast("Đã vô hiệu hóa dịch vụ", "success");
            refresh();
        } catch (error) {
            toast(errorMessage(error), "error");
        }
    };

    return (
        <>
            <PageHeader
                title={category?.name || "Chi tiết nhóm dịch vụ"}
                subtitle={category?.description || "Danh sách dịch vụ thuộc nhóm."}
                action={(
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <Link className="btn ghost" to="/admin/catalog/services"><Icon name="arrow_back" />Nhóm dịch vụ</Link>
                        <button className="btn primary" type="button" onClick={openCreate}><Icon name="add" />Thêm dịch vụ</button>
                    </div>
                )}
            />
            {pagination.totalItems ? (
                <>
                    <div className="card table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Mã</th>
                                    <th>Dịch vụ</th>
                                    <th>Mô tả</th>
                                    <th>Trạng thái</th>
                                    <th>Cập nhật</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pagination.items.map((service) => (
                                    <tr key={service.id}>
                                        <td><strong>{service.code}</strong></td>
                                        <td>{service.name}</td>
                                        <td>{service.description || "-"}</td>
                                        <td><Badge value={Number(service.is_active) === 1 ? "ACTIVE" : "INACTIVE"} type={Number(service.is_active) === 1 ? "success" : "danger"} /></td>
                                        <td>{formatDate(service.updated_at || service.created_at)}</td>
                                        <td>
                                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                                <button className="btn ghost" type="button" onClick={() => openEdit(service)}><Icon name="edit" />Sửa</button>
                                                <button className="btn danger" type="button" onClick={() => deleteService(service)}><Icon name="delete" />Xóa</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination {...pagination} label="dịch vụ" />
                </>
            ) : (
                <div className="card"><Empty text="Chưa có dịch vụ trong nhóm này" /></div>
            )}
            {formOpen && (
                <div className="modal-backdrop">
                    <form className="modal form" onSubmit={submit}>
                        <div>
                            <h3 style={{ margin: 0 }}>{editingService ? "Sửa dịch vụ" : "Thêm dịch vụ"}</h3>
                            <p className="muted" style={{ margin: "6px 0 0" }}>{category?.name || "Nhóm dịch vụ"}</p>
                        </div>
                        <Field label="Tên dịch vụ">
                            <input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
                        </Field>
                        <Field label="Mã dịch vụ">
                            <input className="input" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="Tự tạo nếu để trống" />
                        </Field>
                        <Field label="Mô tả">
                            <textarea className="textarea" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
                        </Field>
                        {editingService && (
                            <Field label="Trạng thái">
                                <select className="select" value={String(form.isActive)} onChange={(event) => setForm({ ...form, isActive: event.target.value === "true" })}>
                                    <option value="true">Hoạt động</option>
                                    <option value="false">Vô hiệu hóa</option>
                                </select>
                            </Field>
                        )}
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                            <button className="btn ghost" type="button" onClick={closeForm} disabled={saving}>Đóng</button>
                            <button className="btn primary" disabled={saving}>{saving ? "Đang lưu..." : editingService ? "Lưu thay đổi" : "Lưu dịch vụ"}</button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
}

function ServiceCreatePage() {
    const toast = useToast();
    const navigate = useNavigate();
    const [form, setForm] = React.useState({ name: "", code: "", description: "" });
    const submit = async (event) => {
        event.preventDefault();
        await api.post("/service-categories", { ...form, code: form.code || slugCode(form.name), isActive: true });
        toast("Tạo nhóm dịch vụ thành công", "success");
        navigate("/admin/catalog/services");
    };
    return (
        <>
            <PageHeader title="Thêm nhóm dịch vụ mới" />
            <form className="card form" onSubmit={submit}>
                <Field label="Tên nhóm"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
                <Field label="Mã nhóm"><input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Tự tạo nếu để trống" /></Field>
                <Field label="Mô tả"><textarea className="textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
                <button className="btn primary">Lưu nhóm dịch vụ</button>
            </form>
        </>
    );
}

function PermissionsPage() {
    const { data: users, refresh } = useApi("/users", []);
    const { data: roles } = useApi("/roles", []);
    const { data: departments } = useApi("/departments", []);
    const toast = useToast();
    const confirm = useConfirm();
    const [editingUser, setEditingUser] = React.useState(null);

    const setStatus = async (user, status) => {
        const ok = await confirm({ title: status === "LOCKED" ? "Khóa tài khoản" : "Mở khóa tài khoản", message: `Xác nhận cập nhật ${user.full_name}?` });
        if (!ok) return;
        await api.put(`/users/${user.id}/status`, { status });
        toast("Cập nhật tài khoản thành công", "success");
        refresh();
    };

    const changeRole = async (user, roleId) => {
        const ok = await confirm({ title: "Đổi vai trò người dùng", message: `Xác nhận đổi vai trò cho ${user.full_name}?` });
        if (!ok) return;
        await api.put(`/users/${user.id}/change-role`, { roleId });
        toast("Đổi vai trò thành công", "success");
        refresh();
    };

    const deleteUser = async (user) => {
        const ok = await confirm({
            title: "Xóa người dùng",
            message: `Xác nhận xóa vĩnh viễn tài khoản ${user.full_name} khỏi database?`,
            confirmText: "Xóa"
        });
        if (!ok) return;
        try {
            await api.delete(`/users/${user.id}`);
            toast("Đã xóa người dùng", "success");
            refresh();
        } catch (error) {
            toast(errorMessage(error), "error");
        }
    };

    return (
        <>
            <PageHeader
                title="Phân quyền hệ thống"
                action={(
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <Link className="btn ghost" to="/admin/settings"><Icon name="tune" />Thiết lập chỉ số</Link>
                        <Link className="btn primary" to="/admin/permissions/create-user"><Icon name="add" />Thêm người dùng mới</Link>
                    </div>
                )}
            />
            <UserTable users={users} roles={roles} onStatus={setStatus} onRoleChange={changeRole} onEdit={setEditingUser} onDelete={deleteUser} />
            {editingUser && (
                <UserEditModal
                    user={editingUser}
                    departments={departments}
                    onClose={() => setEditingUser(null)}
                    onSaved={() => {
                        setEditingUser(null);
                        refresh();
                    }}
                />
            )}
        </>
    );
}

function CreateUserPage() {
    const toast = useToast();
    const navigate = useNavigate();
    const { data: roles } = useApi("/roles", []);
    const { data: departments } = useApi("/departments", []);
    const [form, setForm] = React.useState({ fullName: "", email: "", password: "", roleId: "", departmentIds: [], status: "ACTIVE" });

    React.useEffect(() => {
        if (roles[0] && !form.roleId) setForm((state) => ({ ...state, roleId: roles[0].id }));
    }, [roles]);

    const toggleDepartment = (departmentId) => {
        setForm((state) => ({
            ...state,
            departmentIds: state.departmentIds.includes(departmentId)
                ? state.departmentIds.filter((item) => item !== departmentId)
                : [...state.departmentIds, departmentId]
        }));
    };

    const submit = async (event) => {
        event.preventDefault();
        await api.post("/users", form);
        toast("Tạo người dùng thành công", "success");
        navigate("/admin/permissions");
    };

    return (
        <>
            <PageHeader title="Thêm mới người dùng" />
            <form className="card form" onSubmit={submit}>
                <div className="form-grid">
                    <Field label="Họ tên"><input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></Field>
                    <Field label="Email"><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Field>
                    <Field label="Mật khẩu tạm thời"><PasswordInput value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Nhập mật khẩu tạm thời" autoComplete="new-password" required /></Field>
                    <Field label="Vai trò">
                        <select className="select" value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
                            {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                        </select>
                    </Field>
                    <div className="field span-2">
                        <span>Phòng ban</span>
                        <DepartmentPicker
                            departments={departments}
                            selectedIds={form.departmentIds}
                            onToggle={toggleDepartment}
                        />
                    </div>
                </div>
                <button className="btn primary">Lưu người dùng</button>
            </form>
        </>
    );
}

function SettingsPage() {
    const { data: statuses, setData: setStatuses, refresh: refreshStatuses } = useApi("/ticket-statuses", []);
    const { data: priorities, setData: setPriorities, refresh: refreshPriorities } = useApi("/priorities", []);
    const { data: slaPolicies, setData: setSlaPolicies, refresh: refreshSlaPolicies } = useApi("/sla-policies", []);
    const toast = useToast();
    const statusPagination = usePagination(statuses, 8);
    const priorityPagination = usePagination(priorities, 8);
    const slaPagination = usePagination(slaPolicies, 10);

    const updateStatusValue = (id, field, value) => {
        setStatuses((items) => items.map((item) => item.id === id ? { ...item, [field]: value } : item));
    };

    const saveStatus = async (status) => {
        await api.put(`/ticket-statuses/${status.id}`, {
            code: status.code,
            name: status.name,
            color: status.color,
            sortOrder: status.sort_order,
            isDefault: status.is_default,
            isClosed: status.is_closed,
            isSystem: status.is_system
        });
        toast("Cập nhật trạng thái thành công", "success");
        refreshStatuses();
    };

    const updatePriorityValue = (id, field, value) => {
        setPriorities((items) => items.map((item) => item.id === id ? { ...item, [field]: value } : item));
    };

    const savePriority = async (priority) => {
        await api.put(`/priorities/${priority.id}`, {
            code: priority.code,
            name: priority.name,
            level: priority.level,
            color: priority.color,
            responseTimeMinutes: priority.response_time_minutes,
            resolveTimeMinutes: priority.resolve_time_minutes,
            isActive: priority.is_active
        });
        toast("Cập nhật mức ưu tiên thành công", "success");
        refreshPriorities();
    };

    const updateSlaValue = (id, field, value) => {
        setSlaPolicies((items) => items.map((item) => item.id === id ? { ...item, [field]: value } : item));
    };

    const saveSla = async (policy) => {
        await api.put(`/sla-policies/${policy.id}`, {
            serviceId: policy.service_id,
            priorityId: policy.priority_id,
            responseTimeMinutes: policy.response_time_minutes,
            resolveTimeMinutes: policy.resolve_time_minutes,
            isActive: policy.is_active
        });
        toast("Cập nhật SLA thành công", "success");
        refreshSlaPolicies();
    };

    return (
        <>
            <PageHeader title="Cấu hình hệ thống" subtitle="Chỉ Quản trị được thiết lập trạng thái, mức ưu tiên và chỉ số SLA." />
            <div className="grid">
                <Section title="Trạng thái yêu cầu">
                    <div className="table-wrap">
                        <table className="table">
                            <thead><tr><th>Mã</th><th>Tên</th><th>Màu</th><th>Thứ tự</th><th>Đóng yêu cầu</th><th></th></tr></thead>
                            <tbody>
                                {statusPagination.items.map((status) => (
                                    <tr key={status.id}>
                                        <td>{status.code}</td>
                                        <td><input className="input compact" value={status.name || ""} onChange={(event) => updateStatusValue(status.id, "name", event.target.value)} /></td>
                                        <td><input className="input compact" value={status.color || ""} onChange={(event) => updateStatusValue(status.id, "color", event.target.value)} /></td>
                                        <td><input className="input compact" type="number" value={status.sort_order || ""} onChange={(event) => updateStatusValue(status.id, "sort_order", event.target.value)} /></td>
                                        <td>
                                            <select className="select compact" value={String(status.is_closed ?? 0)} onChange={(event) => updateStatusValue(status.id, "is_closed", Number(event.target.value))}>
                                                <option value="0">Chưa đóng</option>
                                                <option value="1">Đã đóng</option>
                                            </select>
                                        </td>
                                        <td><button className="btn ghost" onClick={() => saveStatus(status)}>Lưu</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination {...statusPagination} label="trạng thái" />
                </Section>
            </div>
            <div className="grid cols-2" style={{ marginTop: 16 }}>
                <Section title="Mức ưu tiên">
                    <div className="table-wrap">
                        <table className="table">
                            <thead><tr><th>Mã</th><th>Tên</th><th>Cấp</th><th>Phản hồi</th><th>Xử lý</th><th></th></tr></thead>
                            <tbody>
                                {priorityPagination.items.map((priority) => (
                                    <tr key={priority.id}>
                                        <td>{priority.code}</td>
                                        <td><input className="input compact" value={priority.name || ""} onChange={(event) => updatePriorityValue(priority.id, "name", event.target.value)} /></td>
                                        <td><input className="input compact" type="number" value={priority.level || ""} onChange={(event) => updatePriorityValue(priority.id, "level", event.target.value)} /></td>
                                        <td><input className="input compact" type="number" value={priority.response_time_minutes || ""} onChange={(event) => updatePriorityValue(priority.id, "response_time_minutes", event.target.value)} /></td>
                                        <td><input className="input compact" type="number" value={priority.resolve_time_minutes || ""} onChange={(event) => updatePriorityValue(priority.id, "resolve_time_minutes", event.target.value)} /></td>
                                        <td><button className="btn ghost" onClick={() => savePriority(priority)}>Lưu</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination {...priorityPagination} label="mức ưu tiên" />
                </Section>
            </div>
            <Section title="Chỉ số SLA">
                <div className="table-wrap">
                    <table className="table">
                        <thead><tr><th>Dịch vụ</th><th>Ưu tiên</th><th>Thời gian phản hồi (phút)</th><th>Thời gian xử lý (phút)</th><th></th></tr></thead>
                        <tbody>
                            {slaPagination.items.map((policy) => (
                                <tr key={policy.id}>
                                    <td>{policy.service_name || "Mặc định toàn hệ thống"}</td>
                                    <td>{policy.priority_name}</td>
                                    <td><input className="input compact" type="number" value={policy.response_time_minutes || ""} onChange={(event) => updateSlaValue(policy.id, "response_time_minutes", event.target.value)} /></td>
                                    <td><input className="input compact" type="number" value={policy.resolve_time_minutes || ""} onChange={(event) => updateSlaValue(policy.id, "resolve_time_minutes", event.target.value)} /></td>
                                    <td><button className="btn ghost" onClick={() => saveSla(policy)}>Lưu</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination {...slaPagination} label="chỉ số SLA" />
            </Section>
        </>
    );
}
