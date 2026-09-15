import React, { useState } from 'react';
import { TeacherAccount } from '../types';
import { TeacherAuthService } from '../services/teacherAuthService';
import { Lock, UserCheck, UserPlus, ShieldAlert, CheckCircle, XCircle, Trash2, Key, School, Mail, User, AlertCircle, Sparkles } from 'lucide-react';

interface TeacherAuthPanelProps {
  onLoginSuccess: (account: TeacherAccount) => void;
}

export const TeacherAuthPanel: React.FC<TeacherAuthPanelProps> = ({ onLoginSuccess }) => {
  const [subTab, setSubTab] = useState<'LOGIN' | 'REGISTER' | 'ADMIN'>('LOGIN');

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

  // Handle Login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const res = TeacherAuthService.login(loginEmail, loginPass);
    if (res.success && res.account) {
      onLoginSuccess(res.account);
    } else {
      setLoginError(res.message);
    }
  };

  // Quick fill sample account
  const handleAutoFillSample = () => {
    setLoginEmail('giaovien@gmail.com');
    setLoginPass('123');
    setLoginError(null);
  };

  // Handle Register
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegMessage(null);
    const res = TeacherAuthService.register(regEmail, regPass, regFullName, regSchool);
    if (res.success) {
      setRegMessage({ type: 'success', text: res.message });
      setRegEmail('');
      setRegPass('');
      setRegFullName('');
      setRegSchool('');
    } else {
      setRegMessage({ type: 'error', text: res.message });
    }
  };

  // Handle Admin Passcode Verify
  const handleVerifyAdminPass = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassInput.trim() === 'admin123' || adminPassInput.trim() === 'admin') {
      setIsAdminAuthenticated(true);
      setAdminError(null);
      setAdminAccountsList(TeacherAuthService.getAccounts());
    } else {
      setAdminError('Mật khẩu Admin không chính xác! (Gợi ý: Mật khẩu mặc định là admin123)');
    }
  };

  // Admin Actions
  const handleApprove = (id: string) => {
    const updated = TeacherAuthService.approveAccount(id);
    setAdminAccountsList(updated);
  };

  const handleReject = (id: string) => {
    const updated = TeacherAuthService.rejectAccount(id);
    setAdminAccountsList(updated);
  };

  const handleDelete = (id: string) => {
    const updated = TeacherAuthService.deleteAccount(id);
    setAdminAccountsList(updated);
  };

  return (
    <div className="bg-slate-900/95 backdrop-blur-xl p-6 md:p-8 rounded-3xl border-2 border-emerald-500/50 shadow-2xl space-y-6 text-left relative overflow-hidden font-sans">
      {/* Top Header Badge */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold text-xs">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Hệ Thống Phê Duyệt & Bảo Mật Giáo Viên</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-white">Yêu Cầu Xác Thực Giáo Viên</h2>
        <p className="text-xs text-slate-300 font-medium">
          Dành riêng cho Giáo viên đã được Admin duyệt quyền tạo sảnh thi & phát mã QR cho học sinh.
        </p>
      </div>

      {/* Mode Sub-Tabs */}
      <div className="p-1 bg-slate-950 border border-slate-800 rounded-2xl flex items-center gap-1">
        <button
          onClick={() => {
            setSubTab('LOGIN');
            setLoginError(null);
          }}
          className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            subTab === 'LOGIN'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>🔐 Đăng Nhập</span>
        </button>

        <button
          onClick={() => {
            setSubTab('REGISTER');
            setRegMessage(null);
          }}
          className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            subTab === 'REGISTER'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>📝 Đăng Ký Mới</span>
        </button>

        <button
          onClick={() => {
            setSubTab('ADMIN');
            setAdminError(null);
            if (isAdminAuthenticated) setAdminAccountsList(TeacherAuthService.getAccounts());
          }}
          className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            subTab === 'ADMIN'
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-slate-400 hover:text-amber-300'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>🛡️ Admin Duyệt</span>
        </button>
      </div>

      {/* SUB-TAB 1: LOGIN FORM */}
      {subTab === 'LOGIN' && (
        <form onSubmit={handleLoginSubmit} className="space-y-4 animate-fade-in">
          {/* Sample quick fill notice */}
          <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-extrabold text-emerald-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" /> Tài Khoản Mẫu Đã Duyệt:
              </span>
              <span className="text-slate-300 block font-mono">Email: giaovien@gmail.com | Pass: 123</span>
            </div>
            <button
              type="button"
              onClick={handleAutoFillSample}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition-transform active:scale-95 cursor-pointer shrink-0"
            >
              ⚡ Tự Điền Mẫu
            </button>
          </div>

          {loginError && (
            <div className="p-3 bg-rose-950/80 border border-rose-500/50 text-rose-200 rounded-xl text-xs font-semibold flex items-center gap-2 animate-bounce">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-300 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-emerald-400" /> Email Giáo Viên:
            </label>
            <input
              type="email"
              required
              placeholder="VD: giaovien@gmail.com"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold text-sm focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-300 flex items-center gap-1">
              <Key className="w-3.5 h-3.5 text-emerald-400" /> Mật Khẩu:
            </label>
            <input
              type="password"
              required
              placeholder="Nhập mật khẩu..."
              value={loginPass}
              onChange={(e) => setLoginPass(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold text-sm focus:outline-none focus:border-emerald-400"
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-base rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer mt-2"
          >
            <UserCheck className="w-5 h-5" />
            <span>ĐĂNG NHẬP GIÁO VIÊN ➔</span>
          </button>
        </form>
      )}

      {/* SUB-TAB 2: REGISTER FORM */}
      {subTab === 'REGISTER' && (
        <form onSubmit={handleRegisterSubmit} className="space-y-3.5 animate-fade-in">
          {regMessage && (
            <div
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
            <label className="block text-xs font-bold text-slate-300 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-emerald-400" /> Họ & Tên Giáo Viên:
            </label>
            <input
              type="text"
              required
              placeholder="VD: Nguyễn Văn A"
              value={regFullName}
              onChange={(e) => setRegFullName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold text-sm focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-300 flex items-center gap-1">
              <School className="w-3.5 h-3.5 text-emerald-400" /> Tên Trường / Đơn Vị:
            </label>
            <input
              type="text"
              placeholder="VD: THPT Chuyên..."
              value={regSchool}
              onChange={(e) => setRegSchool(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold text-sm focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-300 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-emerald-400" /> Email Đăng Ký:
            </label>
            <input
              type="email"
              required
              placeholder="VD: teacher@school.edu.vn"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold text-sm focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-300 flex items-center gap-1">
              <Key className="w-3.5 h-3.5 text-emerald-400" /> Mật Khẩu Đăng Nhập:
            </label>
            <input
              type="password"
              required
              placeholder="Nhập mật khẩu..."
              value={regPass}
              onChange={(e) => setRegPass(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold text-sm focus:outline-none focus:border-emerald-400"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-base rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer mt-2"
          >
            <UserPlus className="w-5 h-5" />
            <span>GỬI YÊU CẦU ĐĂNG KÝ (CHỜ ADMIN DUYỆT) ➔</span>
          </button>
        </form>
      )}

      {/* SUB-TAB 3: ADMIN APPROVAL PANEL */}
      {subTab === 'ADMIN' && (
        <div className="space-y-4 animate-fade-in">
          {!isAdminAuthenticated ? (
            <form onSubmit={handleVerifyAdminPass} className="space-y-3">
              <div className="p-3.5 bg-amber-950/30 border border-amber-500/40 text-amber-200 rounded-2xl text-xs font-semibold">
                🛡️ Vui lòng nhập Mật khẩu Quản trị viên (Admin) để thực hiện phê duyệt tài khoản giáo viên. (Mật khẩu mặc định: <strong className="text-yellow-300 font-mono">admin123</strong>)
              </div>

              {adminError && (
                <div className="p-3 bg-rose-950/80 border border-rose-500/50 text-rose-200 rounded-xl text-xs font-semibold">
                  {adminError}
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300">Mật khẩu Admin:</label>
                <input
                  type="password"
                  required
                  placeholder="Nhập Mật khẩu Admin (admin123)..."
                  value={adminPassInput}
                  onChange={(e) => setAdminPassInput(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 text-white font-black text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>XÁC NHẬN QUYỀN ADMIN ➔</span>
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-extrabold text-amber-400 flex items-center gap-1">
                  <ShieldAlert className="w-4 h-4" /> Bảng Quản Lý Phê Duyệt Giáo Viên ({adminAccountsList.length} tài khoản)
                </span>
                <button
                  onClick={() => setIsAdminAuthenticated(false)}
                  className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Thoát Admin
                </button>
              </div>

              <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                {adminAccountsList.map((acc) => (
                  <div
                    key={acc.id}
                    className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <strong className="text-white text-sm font-black">{acc.fullName}</strong>
                        {acc.status === 'APPROVED' && (
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-md font-bold text-[10px]">
                            ✅ Đã duyệt
                          </span>
                        )}
                        {acc.status === 'PENDING' && (
                          <span className="px-2 py-0.5 bg-amber-500/20 text-yellow-300 border border-amber-500/40 rounded-md font-bold text-[10px] animate-pulse">
                            ⏳ Chờ duyệt
                          </span>
                        )}
                        {acc.status === 'REJECTED' && (
                          <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-md font-bold text-[10px]">
                            ❌ Từ chối
                          </span>
                        )}
                      </div>
                      <div className="text-slate-400 font-mono">{acc.email} • {acc.schoolName || 'Chưa cập nhật trường'}</div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {acc.status !== 'APPROVED' && (
                        <button
                          onClick={() => handleApprove(acc.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-transform active:scale-95"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Duyệt
                        </button>
                      )}

                      {acc.status !== 'REJECTED' && (
                        <button
                          onClick={() => handleReject(acc.id)}
                          className="px-3 py-1.5 bg-amber-700 hover:bg-amber-600 text-white font-extrabold rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-transform active:scale-95"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Từ chối
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(acc.id)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-rose-700 text-slate-300 hover:text-white rounded-xl text-xs cursor-pointer transition-colors"
                        title="Xóa tài khoản"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
