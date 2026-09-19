import React, { useState, useMemo, useCallback } from 'react';
import { TeacherAccount, TeacherAccountStatus } from '../types';
import { TeacherAuthService } from '../services/teacherAuthService';
import {
  Lock,
  UserCheck,
  UserPlus,
  ShieldAlert,
  CheckCircle,
  XCircle,
  Trash2,
  Key,
  School,
  Mail,
  User,
  AlertCircle,
  Sparkles,
  Eye,
  EyeOff,
  Search,
  X,
} from 'lucide-react';

interface TeacherAuthPanelProps {
  onLoginSuccess: (account: TeacherAccount) => void;
}

const ACCOUNT_STATUS_CONFIG: Record<
  TeacherAccountStatus,
  { label: string; className: string }
> = {
  APPROVED: {
    label: '✅ Đã duyệt',
    className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  PENDING: {
    label: '⏳ Chờ duyệt',
    className: 'bg-amber-500/20 text-yellow-300 border-amber-500/40',
  },
  REJECTED: {
    label: '❌ Từ chối',
    className: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },
};

export const TeacherAuthPanel: React.FC<TeacherAuthPanelProps> = ({ onLoginSuccess }) => {
  const [subTab, setSubTab] = useState<'LOGIN' | 'REGISTER' | 'ADMIN'>('LOGIN');

  // Show/Hide password toggles
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [showRegPass, setShowRegPass] = useState(false);
  const [showAdminPass, setShowAdminPass] = useState(false);

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regSchool, setRegSchool] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regMessage, setRegMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Admin panel state
  const [adminPassInput, setAdminPassInput] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminAccountsList, setAdminAccountsList] = useState<TeacherAccount[]>([]);
  const [adminFilter, setAdminFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [accountToDelete, setAccountToDelete] = useState<TeacherAccount | null>(null);

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setLoginError(null);

    try {
      const cleanEmail = loginEmail.trim().toLowerCase();
      const res = TeacherAuthService.login(cleanEmail, loginPass);
      if (res.success && res.account) {
        onLoginSuccess(res.account);
      } else {
        setLoginError(res.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick fill sample account (DEV ONLY)
  const handleAutoFillSample = () => {
    if (!import.meta.env.DEV) return;
    setLoginEmail('giaovien@gmail.com');
    setLoginPass('123');
    setLoginError(null);
  };

  // Handle Register Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setRegMessage(null);

    try {
      const cleanEmail = regEmail.trim().toLowerCase();
      const cleanFullName = regFullName.trim();
      const cleanSchool = regSchool.trim();

      const res = TeacherAuthService.register(cleanEmail, regPass, cleanFullName, cleanSchool);
      if (res.success) {
        setRegMessage({ type: 'success', text: res.message });
        setRegEmail('');
        setRegPass('');
        setRegFullName('');
        setRegSchool('');
      } else {
        setRegMessage({ type: 'error', text: res.message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Admin Passcode Verification
  const handleVerifyAdminPass = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setAdminError(null);

    try {
      const inputPass = adminPassInput.trim();
      const expectedPass = import.meta.env.VITE_ADMIN_PASSCODE;

      if (!expectedPass) {
        setAdminError('Chức năng Admin chưa được cấu hình. Hãy đặt VITE_ADMIN_PASSCODE cho môi trường chạy cục bộ.');
        return;
      }

      if (expectedPass && inputPass === expectedPass) {
        setIsAdminAuthenticated(true);
        setAdminAccountsList(TeacherAuthService.getAccounts());
        setAdminPassInput('');
      } else {
        setAdminError('Mật khẩu hoặc thông tin xác thực Admin không chính xác.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin Actions
  const handleApprove = useCallback(async (id: string) => {
    setProcessingId(id);
    try {
      const updated = TeacherAuthService.approveAccount(id);
      setAdminAccountsList(updated);
    } finally {
      setProcessingId(null);
    }
  }, []);

  const handleReject = useCallback(async (id: string) => {
    setProcessingId(id);
    try {
      const updated = TeacherAuthService.rejectAccount(id);
      setAdminAccountsList(updated);
    } finally {
      setProcessingId(null);
    }
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!accountToDelete) return;
    setProcessingId(accountToDelete.id);
    try {
      const updated = TeacherAuthService.deleteAccount(accountToDelete.id);
      setAdminAccountsList(updated);
      setAccountToDelete(null);
    } finally {
      setProcessingId(null);
    }
  }, [accountToDelete]);

  // Counts for Admin Filter Tabs
  const counts = useMemo(() => {
    return {
      ALL: adminAccountsList.length,
      PENDING: adminAccountsList.filter((a) => a.status === 'PENDING').length,
      APPROVED: adminAccountsList.filter((a) => a.status === 'APPROVED').length,
      REJECTED: adminAccountsList.filter((a) => a.status === 'REJECTED').length,
    };
  }, [adminAccountsList]);

  // Filtered accounts list for Admin
  const filteredAccounts = useMemo(() => {
    return adminAccountsList.filter((acc) => {
      if (adminFilter !== 'ALL' && acc.status !== adminFilter) return false;
      if (adminSearchQuery.trim()) {
        const q = adminSearchQuery.trim().toLowerCase();
        const nameMatch = acc.fullName.toLowerCase().includes(q);
        const emailMatch = acc.email.toLowerCase().includes(q);
        const schoolMatch = (acc.schoolName || '').toLowerCase().includes(q);
        return nameMatch || emailMatch || schoolMatch;
      }
      return true;
    });
  }, [adminAccountsList, adminFilter, adminSearchQuery]);

  return (
    <div className="bg-slate-900/95 backdrop-blur-xl p-5 md:p-8 rounded-3xl border-2 border-emerald-500/50 shadow-2xl space-y-5 text-left relative overflow-hidden font-sans max-h-[90dvh] overflow-y-auto custom-scrollbar">
      {/* Top Header Badge */}
      <div className="text-center space-y-1.5">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold text-xs">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Hệ Thống Phê Duyệt & Bảo Mật Giáo Viên</span>
        </div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white">Yêu Cầu Xác Thực Giáo Viên</h2>
        <p className="text-xs text-slate-300 font-medium max-w-lg mx-auto">
          Dành riêng cho Giáo viên đã được Admin duyệt quyền tạo sảnh thi & phát mã QR cho học sinh.
        </p>
      </div>

      {/* Mode Sub-Tabs */}
      <div role="tablist" aria-label="Xác thực giáo viên" className="p-1 bg-slate-950 border border-slate-800 rounded-2xl flex items-center gap-1">
        <button
          role="tab"
          aria-selected={subTab === 'LOGIN'}
          onClick={() => {
            setSubTab('LOGIN');
            setLoginError(null);
          }}
          className={`flex-1 py-2.5 px-2 sm:px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            subTab === 'LOGIN'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Đăng Nhập</span>
        </button>

        <button
          role="tab"
          aria-selected={subTab === 'REGISTER'}
          onClick={() => {
            setSubTab('REGISTER');
            setRegMessage(null);
          }}
          className={`flex-1 py-2.5 px-2 sm:px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            subTab === 'REGISTER'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>Đăng Ký Mới</span>
        </button>

        <button
          role="tab"
          aria-selected={subTab === 'ADMIN'}
          onClick={() => {
            setSubTab('ADMIN');
            setAdminError(null);
            if (isAdminAuthenticated) setAdminAccountsList(TeacherAuthService.getAccounts());
          }}
          className={`flex-1 py-2.5 px-2 sm:px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            subTab === 'ADMIN'
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-slate-400 hover:text-amber-300'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Quản Trị</span>
        </button>
      </div>

      {/* SUB-TAB 1: LOGIN FORM */}
      {subTab === 'LOGIN' && (
        <form role="tabpanel" onSubmit={handleLoginSubmit} className="space-y-4 animate-fade-in">
          {/* Sample quick fill notice (DEV ONLY) */}
          {import.meta.env.DEV && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-extrabold text-emerald-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" /> Tài Khoản Mẫu Môi Trường DEV:
                </span>
                <span className="text-slate-300 block font-mono">giaovien@gmail.com | 123</span>
              </div>
              <button
                type="button"
                onClick={handleAutoFillSample}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition-transform active:scale-95 cursor-pointer shrink-0"
              >
                ⚡ Tự Điền Mẫu
              </button>
            </div>
          )}

          {loginError && (
            <div role="alert" aria-live="polite" className="p-3 bg-rose-950/80 border border-rose-500/50 text-rose-200 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="login-email" className="block text-xs font-bold text-slate-300 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-emerald-400" /> Email Giáo Viên:
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              placeholder="VD: giaovien@gmail.com"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold text-sm focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="login-password" className="block text-xs font-bold text-slate-300 flex items-center gap-1">
              <Key className="w-3.5 h-3.5 text-emerald-400" /> Mật Khẩu:
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showLoginPass ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="Nhập mật khẩu..."
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                className="w-full pl-4 pr-11 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold text-sm focus:outline-none focus:border-emerald-400"
              />
              <button
                type="button"
                aria-label={showLoginPass ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                onClick={() => setShowLoginPass(!showLoginPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
              >
                {showLoginPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-black text-base rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer mt-2 min-h-[48px]"
          >
            <UserCheck className="w-5 h-5" />
            <span>{isSubmitting ? 'ĐANG ĐĂNG NHẬP...' : 'ĐĂNG NHẬP GIÁO VIÊN ➔'}</span>
          </button>
        </form>
      )}

      {/* SUB-TAB 2: REGISTER FORM */}
      {subTab === 'REGISTER' && (
        <form role="tabpanel" onSubmit={handleRegisterSubmit} className="space-y-3.5 animate-fade-in">
          {regMessage && (
            <div
              role="alert"
              aria-live="polite"
              className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-start gap-2 ${
                regMessage.type === 'success'
                  ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200'
                  : 'bg-rose-950/80 border-rose-500/60 text-rose-200'
              }`}
            >
              {regMessage.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span>{regMessage.text}</span>
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="reg-fullname" className="block text-xs font-bold text-slate-300 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-emerald-400" /> Họ & Tên Giáo Viên:
            </label>
            <input
              id="reg-fullname"
              type="text"
              required
              placeholder="VD: Nguyễn Văn A"
              value={regFullName}
              onChange={(e) => setRegFullName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold text-sm focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="reg-school" className="block text-xs font-bold text-slate-300 flex items-center gap-1">
              <School className="w-3.5 h-3.5 text-emerald-400" /> Tên Trường / Đơn Vị:
            </label>
            <input
              id="reg-school"
              type="text"
              placeholder="VD: THPT Chuyên..."
              value={regSchool}
              onChange={(e) => setRegSchool(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold text-sm focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="reg-email" className="block text-xs font-bold text-slate-300 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-emerald-400" /> Email Đăng Ký:
            </label>
            <input
              id="reg-email"
              type="email"
              required
              autoComplete="email"
              placeholder="VD: teacher@school.edu.vn"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold text-sm focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="reg-password" className="block text-xs font-bold text-slate-300 flex items-center gap-1">
              <Key className="w-3.5 h-3.5 text-emerald-400" /> Mật Khẩu Đăng Nhập:
            </label>
            <div className="relative">
              <input
                id="reg-password"
                type={showRegPass ? 'text' : 'password'}
                required
                autoComplete="new-password"
                placeholder="Nhập mật khẩu..."
                value={regPass}
                onChange={(e) => setRegPass(e.target.value)}
                className="w-full pl-4 pr-11 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold text-sm focus:outline-none focus:border-emerald-400"
              />
              <button
                type="button"
                aria-label={showRegPass ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                onClick={() => setShowRegPass(!showRegPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
              >
                {showRegPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-black text-base rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer mt-2 min-h-[48px]"
          >
            <UserPlus className="w-5 h-5" />
            <span>{isSubmitting ? 'ĐANG GỬI YÊU CẦU...' : 'GỬI YÊU CẦU ĐĂNG KÝ (CHỜ DUYỆT) ➔'}</span>
          </button>
        </form>
      )}

      {/* SUB-TAB 3: ADMIN APPROVAL PANEL */}
      {subTab === 'ADMIN' && (
        <div role="tabpanel" className="space-y-4 animate-fade-in">
          {!isAdminAuthenticated ? (
            <form onSubmit={handleVerifyAdminPass} className="space-y-3">
              <div className="p-3.5 bg-amber-950/30 border border-amber-500/40 text-amber-200 rounded-2xl text-xs font-semibold">
                🛡️ Vui lòng nhập Mật khẩu Quản trị viên (Admin) để duyệt quyền tài khoản giáo viên.
              </div>

              {adminError && (
                <div role="alert" aria-live="polite" className="p-3 bg-rose-950/80 border border-rose-500/50 text-rose-200 rounded-xl text-xs font-semibold">
                  {adminError}
                </div>
              )}

              <div className="space-y-1">
                <label htmlFor="admin-passcode" className="block text-xs font-bold text-slate-300">Mật Khẩu Admin:</label>
                <div className="relative">
                  <input
                    id="admin-passcode"
                    type={showAdminPass ? 'text' : 'password'}
                    required
                    placeholder="Nhập Mật khẩu Admin..."
                    value={adminPassInput}
                    onChange={(e) => setAdminPassInput(e.target.value)}
                    className="w-full pl-4 pr-11 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold text-sm focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    aria-label={showAdminPass ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    onClick={() => setShowAdminPass(!showAdminPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                  >
                    {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-black text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>{isSubmitting ? 'ĐANG XÁC THỰC...' : 'XÁC NHẬN QUYỀN ADMIN ➔'}</span>
              </button>
            </form>
          ) : (
            <div className="space-y-3.5">
              {/* Admin Panel Header Bar */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 flex-wrap gap-2">
                <span className="text-xs font-extrabold text-amber-400 flex items-center gap-1">
                  <ShieldAlert className="w-4 h-4" /> Quản Lý Duyệt Giáo Viên ({adminAccountsList.length} tài khoản)
                </span>
                <button
                  onClick={() => setIsAdminAuthenticated(false)}
                  className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Thoát Admin
                </button>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1 text-xs">
                {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((filterKey) => (
                  <button
                    key={filterKey}
                    onClick={() => setAdminFilter(filterKey)}
                    className={`px-2.5 py-1 rounded-lg font-bold border transition-colors cursor-pointer text-[11px] whitespace-nowrap ${
                      adminFilter === filterKey
                        ? 'bg-amber-500/20 text-yellow-300 border-amber-500/50'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {filterKey === 'PENDING' && `⏳ Chờ duyệt (${counts.PENDING})`}
                    {filterKey === 'APPROVED' && `✅ Đã duyệt (${counts.APPROVED})`}
                    {filterKey === 'REJECTED' && `❌ Từ chối (${counts.REJECTED})`}
                    {filterKey === 'ALL' && `Tất cả (${counts.ALL})`}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên, email, trường..."
                  value={adminSearchQuery}
                  onChange={(e) => setAdminSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Accounts List */}
              <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                {filteredAccounts.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 font-semibold">
                    Không tìm thấy tài khoản giáo viên phù hợp.
                  </div>
                ) : (
                  filteredAccounts.map((acc) => (
                    <AdminAccountRow
                      key={acc.id}
                      account={acc}
                      isProcessing={processingId === acc.id}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      onRequestDelete={(account) => setAccountToDelete(account)}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {accountToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center relative overflow-hidden">
            <button
              onClick={() => setAccountToDelete(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">Xóa Tài Khoản Giáo Viên</h3>
              <p className="text-xs text-slate-300">
                Bạn có chắc chắn muốn xóa tài khoản <strong className="text-yellow-400">{accountToDelete.fullName}</strong> ({accountToDelete.email}) khỏi hệ thống không?
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setAccountToDelete(null)}
                className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={!!processingId}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-rose-600/30 transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Xóa Tài Khoản
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* Sub-component: AdminAccountRow */
const AdminAccountRow: React.FC<{
  account: TeacherAccount;
  isProcessing: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRequestDelete: (account: TeacherAccount) => void;
}> = React.memo(({ account, isProcessing, onApprove, onReject, onRequestDelete }) => {
  const statusCfg = ACCOUNT_STATUS_CONFIG[account.status] || ACCOUNT_STATUS_CONFIG.PENDING;

  return (
    <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
      <div className="space-y-0.5 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <strong className="text-white text-sm font-black truncate">{account.fullName}</strong>
          <span className={`px-2 py-0.5 border rounded-md font-bold text-[10px] ${statusCfg.className}`}>
            {statusCfg.label}
          </span>
        </div>
        <div className="text-slate-400 font-mono text-[11px] truncate">
          {account.email} • {account.schoolName || 'Chưa cập nhật trường'}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
        {account.status !== 'APPROVED' && (
          <button
            disabled={isProcessing}
            onClick={() => onApprove(account.id)}
            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold rounded-xl text-[11px] flex items-center gap-1 cursor-pointer transition-transform active:scale-95 min-h-[32px]"
          >
            <CheckCircle className="w-3.5 h-3.5" /> Duyệt
          </button>
        )}

        {account.status !== 'REJECTED' && (
          <button
            disabled={isProcessing}
            onClick={() => onReject(account.id)}
            className="px-2.5 py-1.5 bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white font-extrabold rounded-xl text-[11px] flex items-center gap-1 cursor-pointer transition-transform active:scale-95 min-h-[32px]"
          >
            <XCircle className="w-3.5 h-3.5" /> Từ chối
          </button>
        )}

        <button
          disabled={isProcessing}
          onClick={() => onRequestDelete(account)}
          className="p-1.5 bg-slate-800 hover:bg-rose-700 text-slate-300 hover:text-white rounded-xl text-xs cursor-pointer transition-colors"
          title="Xóa tài khoản"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
});

AdminAccountRow.displayName = 'AdminAccountRow';
