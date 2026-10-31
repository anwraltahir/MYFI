export type RecurrenceType = 'monthly' | 'weekly' | 'yearly' | 'one_time';
export type PaymentStatus = 'unpaid' | 'paid' | 'overdue';
export type VerificationStatus = 'verified' | 'needs_review' | 'unclassified';

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
  // Provenance fields
  source_type?: string;
  source_note_id?: string;
  original_note_title?: string;
  original_note_date?: string;
  original_content?: string;
  extracted_value?: number;
  extraction_confidence?: number;
  verification_status?: VerificationStatus;
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
  // Per-month edits made while viewing this occurrence's month. These shadow
  // the parent Commitment's fields for this month only — other months keep
  // reading the parent Commitment untouched.
  overrides?: Partial<Pick<Commitment, 'title' | 'amount' | 'currency' | 'dueDay' | 'category' | 'icon' | 'notes'>>;
  // This month's instance was deleted. The parent Commitment and every other
  // month's occurrence are left alone.
  removed?: boolean;
  // Provenance fields
  source_type?: string;
  source_note_id?: string;
  original_note_title?: string;
  original_note_date?: string;
  original_content?: string;
  extracted_value?: number;
  extraction_confidence?: number;
  verification_status?: VerificationStatus;
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
  checklist?: { id: string; text: string; done: boolean }[] | null;
  createdAt: string;
  updatedAt: string;
  source: 'manual' | 'zoho';
  convertedToCommitmentId?: string;
  attachments?: { id: string; name: string; url: string; type: string }[] | null;
  verification_status?: VerificationStatus;
}

export interface UserSettings {
  language: 'ar' | 'en';
  currency: string;
  firstDayOfMonth: number;
  notificationsEnabled: boolean;
  reminderDaysBefore: number; // 1, 3, 7
}
