import { Category } from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'housing', nameAr: 'السكن', nameEn: 'Housing', icon: '🏠', color: '#3b82f6' },
  { id: 'services', nameAr: 'الخدمات', nameEn: 'Utilities', icon: '💡', color: '#eab308' },
  { id: 'telecom', nameAr: 'الاتصالات', nameEn: 'Telecom', icon: '📱', color: '#06b6d4' },
  { id: 'installments', nameAr: 'الأقساط', nameEn: 'Installments', icon: '💳', color: '#f97316' },
  { id: 'education', nameAr: 'التعليم', nameEn: 'Education', icon: '🎓', color: '#8b5cf6' },
  { id: 'family', nameAr: 'الأسرة', nameEn: 'Family', icon: '👨‍👩‍👧', color: '#ec4899' },
  { id: 'work', nameAr: 'العمل', nameEn: 'Work', icon: '💼', color: '#64748b' },
  { id: 'subscriptions', nameAr: 'الاشتراكات', nameEn: 'Subscriptions', icon: '🔄', color: '#10b981' },
  { id: 'transfers', nameAr: 'التحويلات', nameEn: 'Transfers', icon: '💸', color: '#14b8a6' },
  { id: 'other', nameAr: 'أخرى', nameEn: 'Other', icon: '📦', color: '#94a3b8' },
];

export const AVAILABLE_ICONS = [
  '🏠', '💡', '📱', '💳', '🎓', '👨‍👩‍👧', '💼', '🔄', '💸', '📦',
  '🚗', '🏥', '🛒', '⚡', '💧', '📶', '✈️', '🏋️', '📚', '🎬',
  '🛡️', '🏷️', '🔑', '☕', '👶', '🛠️', '💻', '🎁', '🏦', '📄'
];

export const CURRENCIES = [
  { code: 'QAR', nameAr: 'ريال قطري (QAR)', symbol: 'QAR' },
  { code: 'SAR', nameAr: 'ريال سعودي (SAR)', symbol: 'SAR' },
  { code: 'AED', nameAr: 'درهم إماراتي (AED)', symbol: 'AED' },
  { code: 'KWD', nameAr: 'دينار كويتي (KWD)', symbol: 'KWD' },
  { code: 'BHD', nameAr: 'دينار بحريني (BHD)', symbol: 'BHD' },
  { code: 'OMR', nameAr: 'ريال عماني (OMR)', symbol: 'OMR' },
  { code: 'EGP', nameAr: 'جنيه مصري (EGP)', symbol: 'EGP' },
  { code: 'JOD', nameAr: 'دينار أردني (JOD)', symbol: 'JOD' },
  { code: 'USD', nameAr: 'دولار أمريكي (USD)', symbol: '$' },
  { code: 'EUR', nameAr: 'يورو (EUR)', symbol: '€' },
  { code: 'GBP', nameAr: 'جنيه إسترليني (GBP)', symbol: '£' },
];

export const DEFAULT_SETTINGS = {
  language: 'ar' as const,
  currency: 'QAR',
  firstDayOfMonth: 1,
  notificationsEnabled: true,
  reminderDaysBefore: 3,
};
