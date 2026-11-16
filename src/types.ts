export interface UserProfile {
  id: number;
  uid: string;
  email: string;
  name: string;
  phone: string | null;
  role: 'admin' | 'user';
  walletBalance: number;
  totalCommissionEarned: number;
  totalCashbackEarned: number;
  kycStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  referralCode: string;
  referredBy: string | null;
  status: 'active' | 'suspended';
  createdAt: string;
}

export interface OperatorItem {
  id: number;
  serviceId: number;
  name: string;
  code: string;
  commissionRate: number;
  flatFee: number;
  minAmount: number;
  maxAmount: number;
  accentColor: string;
  symbol?: string;
  logoUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export interface ServiceItem {
  id: number;
  slug: string;
  name: string;
  description: string;
  iconName: string;
  identifierLabel: string;
  identifierPlaceholder: string;
  isActive: boolean;
  sortOrder: number;
  operators?: OperatorItem[];
}

export interface CashbackOffer {
  id: number;
  title: string;
  description: string;
  promoCode: string;
  serviceSlug: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  maxCashback: number;
  minTransactionAmount: number;
  isActive: boolean;
  expiresAt: string | null;
}

export interface OfferBanner {
  id: number;
  title: string;
  subtitle: string;
  promoCode: string;
  serviceSlug: string;
  imageUrl: string;
  accentColor: string;
  ctaLabel: string;
  isActive: boolean;
  sortOrder: number;
}

export interface TransactionItem {
  id: number;
  referenceId: string;
  userId: number;
  type: string;
  serviceSlug: string | null;
  serviceName: string | null;
  operatorName: string | null;
  accountNumber: string | null;
  amount: number;
  commissionEarned: number;
  cashbackEarned: number;
  promoCode: string | null;
  paymentMethod: string | null;
  status: 'success' | 'pending' | 'failed';
  notes: string | null;
  createdAt: string;
  userName?: string;
  userEmail?: string;
}

export interface KycSubmission {
  id: number;
  userId: number;
  fullName: string;
  dateOfBirth: string;
  documentType: string;
  documentNumber: string;
  address: string;
  city: string;
  postalCode: string;
  documentFrontNote: string;
  status: 'pending' | 'verified' | 'rejected';
  adminRemarks: string | null;
  reviewedAt: string | null;
  createdAt: string;
  userEmail?: string;
  userName?: string;
}

export interface ReferralItem {
  id: number;
  referralCode: string;
  bonusAmount: number;
  status: string;
  createdAt: string;
  referredName: string;
  referredEmail: string;
}

export interface PlatformSetting {
  id: number;
  key: string;
  value: string;
  label: string;
  description: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: number;
  userId: number;
  title: string;
  message: string;
  category: 'transaction' | 'offer' | 'kyc' | 'wallet' | 'system';
  targetTab: string;
  isRead: boolean;
  createdAt: string;
}
