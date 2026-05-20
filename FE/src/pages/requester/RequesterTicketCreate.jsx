function CreateTicketPage() {
    const navigate = useNavigate();
    const toast = useToast();
    const { data: services } = useApi("/services", []);
    const { data: priorities } = useApi("/priorities", []);
    const { data: departments } = useApi("/catalog/departments", []);
    const [form, setForm] = React.useState({ title: "", description: "", departmentId: "", room: "", serviceId: "", priorityId: "" });
    const [files, setFiles] = React.useState([]);
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        if (services[0] && !form.serviceId) setForm((state) => ({ ...state, serviceId: services[0].id }));
    }, [services]);
    React.useEffect(() => {
        const medium = priorities.find((item) => item.code === "P3") || priorities[0];
        if (medium && !form.priorityId) setForm((state) => ({ ...state, priorityId: medium.id }));
    }, [priorities]);
    React.useEffect(() => {
        if (departments[0] && !form.departmentId) setForm((state) => ({ ...state, departmentId: departments[0].id }));
    }, [departments]);

    const submit = async (event) => {
        event.preventDefault();
        setLoading(true);
        try {
            const { data } = await api.post("/tickets", form);
            const ticketId = data.data.id;

            for (const file of files) {
                const attachment = new FormData();
                attachment.append("file", file);
                await api.post(`/tickets/${ticketId}/attachments`, attachment, { headers: { "Content-Type": "multipart/form-data" } });
            }

            toast(files.length ? "Tạo yêu cầu và tải file thành công" : "Tạo yêu cầu thành công", "success");
            navigate(`/requester/tickets/create/success?id=${ticketId}`);
        } catch (error) {
            toast(errorMessage(error), "error");
            navigate("/requester/tickets/create/error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <PageHeader title="Tạo yêu cầu hỗ trợ" subtitle="Gợi ý: lỗi Wi-Fi, máy chiếu, tài khoản, phần mềm." />
            <form className="card form" onSubmit={submit}>
                <Field label="Tiêu đề">
                    <input className="input" value={form.title} onChange={(e) => { clearInputValidity(e); setForm({ ...form, title: e.target.value }); }} onInvalid={setInputValidityMessage("Vui lòng nhập tiêu đề yêu cầu")} placeholder="Lỗi Wi-Fi tại phòng học A2" required />
                </Field>
                <Field label="Tòa/khu">
                    <select className="select" value={form.departmentId} onChange={(e) => { clearInputValidity(e); setForm({ ...form, departmentId: e.target.value }); }} onInvalid={setInputValidityMessage("Vui lòng chọn tòa/khu cần hỗ trợ")} required>
                        {departments.map((department) => <option key={department.id} value={department.id}>{department.code} - {department.name}</option>)}
                    </select>
                </Field>
                <Field label="Phòng cần hỗ trợ">
                    <input className="input" value={form.room} onChange={(e) => { clearInputValidity(e); setForm({ ...form, room: e.target.value }); }} onInvalid={setInputValidityMessage("Vui lòng nhập số phòng cụ thể, ví dụ: 302")} placeholder="Ví dụ: 302" maxLength={60} pattern=".*[0-9].*" required />
                </Field>
                <Field label="Dịch vụ">
                    <select className="select" value={form.serviceId} onChange={(e) => { clearInputValidity(e); setForm({ ...form, serviceId: e.target.value }); }} onInvalid={setInputValidityMessage("Vui lòng chọn dịch vụ cần hỗ trợ")} required>
                        {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
                    </select>
                </Field>
                <Field label="Mức ưu tiên">
                    <select className="select" value={form.priorityId} onChange={(e) => { clearInputValidity(e); setForm({ ...form, priorityId: e.target.value }); }} onInvalid={setInputValidityMessage("Vui lòng chọn mức ưu tiên")} required>
                        {priorities.map((priority) => <option key={priority.id} value={priority.id}>{priority.name}</option>)}
                    </select>
                </Field>
                <Field label="Mô tả chi tiết">
                    <textarea
                        className="textarea"
                        value={form.description}
                        onChange={(e) => {
                            clearInputValidity(e);
                            setForm({ ...form, description: e.target.value });
                        }}
                        onInvalid={setInputValidityMessage("Vui lòng mô tả sự cố")}
                        placeholder="Mô tả hiện tượng, vị trí, thời gian xảy ra..."
                        required
                    />
                </Field>
                <Field label="Ảnh/file minh chứng">
                    <input className="input" type="file" multiple accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,image/jpeg,image/png" onChange={(e) => setFiles(Array.from(e.target.files || []))} />
                </Field>
                {files.length > 0 && (
                    <div className="attachment-grid">
                        {files.map((file, index) => (
                            <LocalFilePreview key={`${file.name}-${index}`} file={file} />
                        ))}
                    </div>
                )}
                <button className="btn primary" disabled={loading || !departments.length}>{loading ? "Đang gửi..." : "Gửi yêu cầu"}</button>
            </form>
        </>
    );
}

function CreateResultPage({ type }) {
    const id = new URLSearchParams(useLocation().search).get("id");
    return (
        <div className="card" style={{ maxWidth: 720 }}>
            <Badge value={type === "success" ? "Thành công" : "Thất bại"} type={type === "success" ? "success" : "danger"} />
            <h1>{type === "success" ? "Tạo yêu cầu thành công" : "Gửi yêu cầu thất bại"}</h1>
            <p className="muted">{type === "success" ? `Mã yêu cầu đã tạo: ${id || "vừa tạo"}.` : "Hãy kiểm tra dữ liệu hoặc thử lại sau."}</p>
            <Link className="btn primary" to={type === "success" && id ? `/requester/tickets/${id}` : "/requester/tickets/create"}>{type === "success" ? "Xem yêu cầu" : "Tạo lại"}</Link>
        </div>
    );
}
