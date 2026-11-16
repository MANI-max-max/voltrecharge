import { relations } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  name: text('name').notNull(),
  phone: text('phone').default(''),
  role: text('role').notNull().default('user'), // 'admin' | 'user'
  walletBalance: doublePrecision('wallet_balance').notNull().default(0),
  totalCommissionEarned: doublePrecision('total_commission_earned').notNull().default(0),
  totalCashbackEarned: doublePrecision('total_cashback_earned').notNull().default(0),
  kycStatus: text('kyc_status').notNull().default('unverified'), // 'unverified' | 'pending' | 'verified' | 'rejected'
  referralCode: text('referral_code').notNull().unique(),
  referredBy: text('referred_by'),
  status: text('status').notNull().default('active'), // 'active' | 'suspended'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const services = pgTable('services', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  iconName: text('icon_name').notNull(),
  identifierLabel: text('identifier_label').notNull(),
  identifierPlaceholder: text('identifier_placeholder').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const operators = pgTable('operators', {
  id: serial('id').primaryKey(),
  serviceId: integer('service_id')
    .references(() => services.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  commissionRate: doublePrecision('commission_rate').notNull().default(1.5),
  flatFee: doublePrecision('flat_fee').notNull().default(0),
  minAmount: doublePrecision('min_amount').notNull().default(10),
  maxAmount: doublePrecision('max_amount').notNull().default(50000),
  accentColor: text('accent_color').notNull().default('#1D4ED8'),
  symbol: text('symbol').notNull().default(''),
  logoUrl: text('logo_url').notNull().default(''),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const cashbackOffers = pgTable('cashback_offers', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  promoCode: text('promo_code').notNull().unique(),
  serviceSlug: text('service_slug').notNull().default('all'),
  discountType: text('discount_type').notNull().default('percentage'), // 'percentage' | 'flat'
  discountValue: doublePrecision('discount_value').notNull().default(5),
  maxCashback: doublePrecision('max_cashback').notNull().default(50),
  minTransactionAmount: doublePrecision('min_transaction_amount').notNull().default(10),
  isActive: boolean('is_active').notNull().default(true),
  expiresAt: text('expires_at').default('2026-12-31'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  referenceId: text('reference_id').notNull().unique(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  type: text('type').notNull(), // 'recharge' | 'bill_payment' | 'add_money' | 'referral_bonus' | 'admin_adjustment'
  serviceSlug: text('service_slug'),
  serviceName: text('service_name'),
  operatorName: text('operator_name'),
  accountNumber: text('account_number'),
  amount: doublePrecision('amount').notNull(),
  commissionEarned: doublePrecision('commission_earned').notNull().default(0),
  cashbackEarned: doublePrecision('cashback_earned').notNull().default(0),
  promoCode: text('promo_code'),
  paymentMethod: text('payment_method'),
  status: text('status').notNull().default('success'), // 'success' | 'pending' | 'failed'
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const kycSubmissions = pgTable('kyc_submissions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  fullName: text('full_name').notNull(),
  dateOfBirth: text('date_of_birth').notNull(),
  documentType: text('document_type').notNull(),
  documentNumber: text('document_number').notNull(),
  address: text('address').notNull(),
  city: text('city').notNull(),
  postalCode: text('postal_code').notNull(),
  documentFrontNote: text('document_front_note').notNull().default(''),
  status: text('status').notNull().default('pending'), // 'pending' | 'verified' | 'rejected'
  adminRemarks: text('admin_remarks').default(''),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const referrals = pgTable('referrals', {
  id: serial('id').primaryKey(),
  referrerUserId: integer('referrer_user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  referredUserId: integer('referred_user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  referralCode: text('referral_code').notNull(),
  bonusAmount: doublePrecision('bonus_amount').notNull().default(0),
  status: text('status').notNull().default('credited'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const platformSettings = pgTable('platform_settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  label: text('label').notNull(),
  description: text('description').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const offerBanners = pgTable('offer_banners', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  subtitle: text('subtitle').notNull().default(''),
  promoCode: text('promo_code').notNull().default(''),
  serviceSlug: text('service_slug').notNull().default('mobile'),
  imageUrl: text('image_url').notNull().default(''),
  accentColor: text('accent_color').notNull().default('#1D4ED8'),
  ctaLabel: text('cta_label').notNull().default('Apply Offer'),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  category: text('category').notNull().default('system'), // 'transaction' | 'offer' | 'kyc' | 'wallet' | 'system'
  targetTab: text('target_tab').notNull().default('dashboard'),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  transactions: many(transactions),
  kycSubmissions: many(kycSubmissions),
}));

export const servicesRelations = relations(services, ({ many }) => ({
  operators: many(operators),
}));

export const operatorsRelations = relations(operators, ({ one }) => ({
  service: one(services, {
    fields: [operators.serviceId],
    references: [services.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
}));

export const kycSubmissionsRelations = relations(kycSubmissions, ({ one }) => ({
  user: one(users, {
    fields: [kycSubmissions.userId],
    references: [users.id],
  }),
}));
