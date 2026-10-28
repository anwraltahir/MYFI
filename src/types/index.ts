export type RecurrenceType = 'monthly' | 'weekly' | 'yearly' | 'one_time';
export type PaymentStatus = 'unpaid' | 'paid' | 'overdue';

export interface Commitment {
  id: string;
  title: string;
  amount: number;
  currency: string;
  dueDay: number; // 1 to 31
  category: string;
  frequency: RecurrenceType;
  notes?: string;
  icon: string;
  color?: string;
  isPinned: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Occurrence {
  id: string; // `${commitmentId}_${yearMonth}`
  commitmentId: string;
  yearMonth: string; // 'YYYY-MM', e.g. '2026-10'
  status: PaymentStatus;
  paidAt: string | null;
  paymentNote?: string;
  customAmount?: number;
  manuallyOverridden?: boolean;
}

export interface Category {
  id: string;
  nameAr: string;
  nameEn: string;
  icon: string;
  color: string;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  notebook?: string;
  tags: string[];
  checklist?: { id: string; text: string; done: boolean }[];
  createdAt: string;
  updatedAt: string;
  source: 'manual';
  convertedToCommitmentId?: string;
}

export interface UserSettings {
  language: 'ar' | 'en';
  currency: string;
  firstDayOfMonth: number;
  notificationsEnabled: boolean;
  reminderDaysBefore: number; // 1, 3, 7
}
