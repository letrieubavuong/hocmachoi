import { TeacherAccount, TeacherAccountStatus } from '../types';

const STORAGE_TEACHER_ACCOUNTS = 'chibi_quiz_teacher_accounts_v1';
const STORAGE_CURRENT_TEACHER = 'chibi_quiz_current_teacher_v1';

/**
 * Deterministic password hash helper to avoid storing plain text passwords
 */
export function hashPassword(pass: string): string {
  if (!pass) return '';
  let hash = 0;
  for (let i = 0; i < pass.length; i++) {
    const char = pass.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(36)}_${pass.length}`;
}

// Pre-seeded sample approved account only in DEV environment
const INITIAL_TEACHER_ACCOUNTS: TeacherAccount[] = import.meta.env.DEV
  ? [
      {
        id: 'teacher-sample-1',
        email: 'giaovien@gmail.com',
        password: hashPassword('123'),
        fullName: 'Thầy Vương (Giáo viên mẫu)',
        schoolName: 'THPT Chuyên',
        status: 'APPROVED',
        createdAt: Date.now() - 86400000 * 7,
      },
    ]
  : [];

export class TeacherAuthService {
  // Get all registered teacher accounts
  public static getAccounts(): TeacherAccount[] {
    if (typeof window === 'undefined') return INITIAL_TEACHER_ACCOUNTS;
    const data = localStorage.getItem(STORAGE_TEACHER_ACCOUNTS);
    if (!data) {
      localStorage.setItem(STORAGE_TEACHER_ACCOUNTS, JSON.stringify(INITIAL_TEACHER_ACCOUNTS));
      return INITIAL_TEACHER_ACCOUNTS;
    }
    try {
      return JSON.parse(data);
    } catch {
      return INITIAL_TEACHER_ACCOUNTS;
    }
  }

  // Save accounts to storage
  private static saveAccounts(accounts: TeacherAccount[]) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_TEACHER_ACCOUNTS, JSON.stringify(accounts));
    }
  }

  // Register new teacher (Status default: PENDING)
  public static register(
    email: string,
    pass: string,
    fullName: string,
    schoolName?: string
  ): { success: boolean; message: string; account?: TeacherAccount } {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !pass) {
      return { success: false, message: 'Vui lòng điền đầy đủ Email và Mật khẩu!' };
    }

    const accounts = this.getAccounts();
    const existing = accounts.find((a) => a.email.toLowerCase() === cleanEmail);
    if (existing) {
      return { success: false, message: 'Email này đã được đăng ký trên hệ thống!' };
    }

    const hashedPass = hashPassword(pass);
    const newAccount: TeacherAccount = {
      id: `teacher-${Math.random().toString(36).substring(2, 9)}`,
      email: cleanEmail,
      password: hashedPass,
      fullName: fullName.trim() || 'Giáo viên',
      schoolName: schoolName?.trim() || 'Trường THPT',
      status: 'PENDING',
      createdAt: Date.now(),
    };

    const updated = [newAccount, ...accounts];
    this.saveAccounts(updated);

    return {
      success: true,
      message:
        '🎉 Đăng ký thành công! Tài khoản của bạn đang ở trạng thái CHỜ ADMIN PHÊ DUYỆT. Vui lòng liên hệ Admin để được duyệt quyền tạo sảnh thi.',
      account: newAccount,
    };
  }

  // Login teacher
  public static login(
    email: string,
    pass: string
  ): { success: boolean; message: string; account?: TeacherAccount } {
    const cleanEmail = email.trim().toLowerCase();
    const accounts = this.getAccounts();
    const hashedPass = hashPassword(pass);
    const account = accounts.find(
      (a) => a.email.toLowerCase() === cleanEmail && (a.password === hashedPass || a.password === pass)
    );

    if (!account) {
      return { success: false, message: 'Mật khẩu hoặc thông tin tài khoản không chính xác!' };
    }

    if (account.status === 'PENDING') {
      return {
        success: false,
        message:
          '⚠️ Tài khoản của bạn đang CHỜ ADMIN PHÊ DUYỆT. Vui lòng liên hệ Admin để được cấp quyền tạo sảnh thi!',
      };
    }

    if (account.status === 'REJECTED') {
      return {
        success: false,
        message: '❌ Tài khoản của bạn đã bị Admin từ chối cấp quyền.',
      };
    }

    // Save logged-in session
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_CURRENT_TEACHER, JSON.stringify(account));
    }

    return {
      success: true,
      message: `Chào mừng Thầy/Cô ${account.fullName} đã đăng nhập thành công!`,
      account,
    };
  }

  // Get currently logged-in teacher session
  public static getCurrentTeacher(): TeacherAccount | null {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(STORAGE_CURRENT_TEACHER);
    if (!data) return null;
    try {
      const teacher: TeacherAccount = JSON.parse(data);
      // Double check status from active list
      const accounts = this.getAccounts();
      const latest = accounts.find((a) => a.id === teacher.id);
      if (latest && latest.status === 'APPROVED') {
        return latest;
      }
      return null;
    } catch {
      return null;
    }
  }

  // Logout teacher session
  public static logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_CURRENT_TEACHER);
    }
  }

  // Admin: Approve account
  public static approveAccount(id: string): TeacherAccount[] {
    const accounts = this.getAccounts();
    const updated = accounts.map((a) =>
      a.id === id ? { ...a, status: 'APPROVED' as TeacherAccountStatus } : a
    );
    this.saveAccounts(updated);
    return updated;
  }

  // Admin: Reject account
  public static rejectAccount(id: string): TeacherAccount[] {
    const accounts = this.getAccounts();
    const updated = accounts.map((a) =>
      a.id === id ? { ...a, status: 'REJECTED' as TeacherAccountStatus } : a
    );
    this.saveAccounts(updated);
    return updated;
  }

  // Admin: Delete account
  public static deleteAccount(id: string): TeacherAccount[] {
    const accounts = this.getAccounts();
    const updated = accounts.filter((a) => a.id !== id);
    this.saveAccounts(updated);
    return updated;
  }
}
