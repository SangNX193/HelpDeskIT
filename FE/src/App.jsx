function App() {
    return (
        <ToastProvider>
            <ConfirmProvider>
                <AuthProvider>
                    <BrowserRouter>
                        <Routes>
                            <Route path="/" element={<Navigate to="/login" replace />} />
                            <Route path="/login" element={<LoginPage />} />

                            <Route element={<ProtectedRoute />}>
                                <Route path="/notifications" element={<AppLayout sharedPage="notifications"><NotificationsPage /></AppLayout>} />
                                <Route path="/profile" element={<AppLayout sharedPage="profile"><ProfileEditorPage /></AppLayout>} />

                                <Route element={<RoleRoute roles={["REQUESTER"]} />}>
                                    <Route path="/requester/dashboard" element={<AppLayout><RequesterDashboard /></AppLayout>} />
                                    <Route path="/requester/tickets" element={<AppLayout><TicketList mode="requester" /></AppLayout>} />
                                    <Route path="/requester/tickets/create" element={<AppLayout><CreateTicketPage /></AppLayout>} />
                                    <Route path="/requester/tickets/create/success" element={<AppLayout><CreateResultPage type="success" /></AppLayout>} />
                                    <Route path="/requester/tickets/create/error" element={<AppLayout><CreateResultPage type="error" /></AppLayout>} />
                                    <Route path="/requester/tickets/:id" element={<AppLayout><TicketDetailPage /></AppLayout>} />
                                    <Route path="/requester/reports" element={<AppLayout><RequesterReports /></AppLayout>} />
                                </Route>

                                <Route element={<RoleRoute roles={["SUPPORT"]} />}>
                                    <Route path="/support/dashboard" element={<AppLayout><SupportDashboard /></AppLayout>} />
                                    <Route path="/support/tickets" element={<AppLayout><TicketList mode="support" /></AppLayout>} />
                                    <Route path="/support/tickets/:id" element={<AppLayout><TicketDetailPage /></AppLayout>} />
                                    <Route path="/support/history" element={<AppLayout><SupportHistory /></AppLayout>} />
                                    <Route path="/support/reports" element={<AppLayout><SupportReports /></AppLayout>} />
                                </Route>

                                <Route element={<RoleRoute roles={["MANAGER"]} />}>
                                    <Route path="/manager/dashboard" element={<AppLayout><ManagerDashboard /></AppLayout>} />
                                    <Route path="/manager/tickets" element={<AppLayout><TicketList mode="manager" /></AppLayout>} />
                                    <Route path="/manager/tickets/:id" element={<AppLayout><TicketDetailPage /></AppLayout>} />
                                    <Route path="/manager/reports" element={<AppLayout><SystemReports /></AppLayout>} />
                                </Route>

                                <Route element={<RoleRoute roles={["ADMIN"]} />}>
                                    <Route path="/admin/dashboard" element={<AppLayout><ManagerDashboard admin /></AppLayout>} />
                                    <Route path="/admin/catalog" element={<AppLayout><AdminCatalog /></AppLayout>} />
                                    <Route path="/admin/catalog/users" element={<AppLayout><AdminUsers roleCode="REQUESTER" title="Sinh viên / Người dùng" /></AppLayout>} />
                                    <Route path="/admin/catalog/managers" element={<AppLayout><AdminUsers roleCode="MANAGER" title="Quản lý tòa" /></AppLayout>} />
                                    <Route path="/admin/catalog/staff" element={<AppLayout><AdminUsers roleCode="SUPPORT" title="Nhân viên IT" /></AppLayout>} />
                                    <Route path="/admin/catalog/departments" element={<AppLayout><AdminDepartments /></AppLayout>} />
                                    <Route path="/admin/catalog/services" element={<AppLayout><AdminServices /></AppLayout>} />
                                    <Route path="/admin/catalog/services/create" element={<AppLayout><ServiceCreatePage /></AppLayout>} />
                                    <Route path="/admin/catalog/services/:categoryId" element={<AppLayout><ServiceCategoryDetailPage /></AppLayout>} />
                                    <Route path="/admin/tickets" element={<AppLayout><TicketList mode="admin" /></AppLayout>} />
                                    <Route path="/admin/tickets/:id" element={<AppLayout><TicketDetailPage /></AppLayout>} />
                                    <Route path="/admin/reports" element={<AppLayout><SystemReports /></AppLayout>} />
                                    <Route path="/admin/permissions" element={<AppLayout><PermissionsPage /></AppLayout>} />
                                    <Route path="/admin/permissions/create-user" element={<AppLayout><CreateUserPage /></AppLayout>} />
                                    <Route path="/admin/settings" element={<AppLayout><SettingsPage /></AppLayout>} />
                                </Route>
                            </Route>

                            <Route path="*" element={<Navigate to="/login" replace />} />
                        </Routes>
                    </BrowserRouter>
                </AuthProvider>
            </ConfirmProvider>
        </ToastProvider>
    );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
