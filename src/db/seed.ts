import { count } from 'drizzle-orm';
import { db } from './index.ts';
import {
  cashbackOffers,
  offerBanners,
  operators,
  platformSettings,
  services,
} from './schema.ts';

let seededPromise: Promise<void> | null = null;

async function runSeed(): Promise<void> {
  try {
    const [{ value: serviceCount }] = await db
      .select({ value: count() })
      .from(services);

    if (serviceCount === 0) {
      const insertedServices = await db
        .insert(services)
        .values([
          {
            slug: 'mobile',
            name: 'Mobile Recharge',
            description: 'Instant prepaid top-ups & postpaid bill settlements across major carriers.',
            iconName: 'Smartphone',
            identifierLabel: 'Mobile Number',
            identifierPlaceholder: 'Enter 10-digit mobile number',
            isActive: true,
            sortOrder: 1,
          },
          {
            slug: 'dth',
            name: 'DTH Recharge',
            description: 'Direct-to-home satellite TV packs and instant channel renewals.',
            iconName: 'Tv',
            identifierLabel: 'Subscriber / VC Number',
            identifierPlaceholder: 'Enter DTH subscriber ID',
            isActive: true,
            sortOrder: 2,
          },
          {
            slug: 'cable',
            name: 'Cable TV',
            description: 'Digital cable set-top box monthly subscriptions and bouquet renewals.',
            iconName: 'Radio',
            identifierLabel: 'Cable Account / Smartcard ID',
            identifierPlaceholder: 'Enter cable TV account number',
            isActive: true,
            sortOrder: 3,
          },
          {
            slug: 'electricity',
            name: 'Electricity Bill',
            description: 'Fast power utility bill payments with instant confirmation receipts.',
            iconName: 'Zap',
            identifierLabel: 'Consumer Number',
            identifierPlaceholder: 'Enter electricity consumer number',
            isActive: true,
            sortOrder: 4,
          },
          {
            slug: 'water',
            name: 'Water Bill',
            description: 'Municipal water supply and meter billing payments.',
            iconName: 'Droplets',
            identifierLabel: 'Water Connection ID',
            identifierPlaceholder: 'Enter water consumer ID',
            isActive: true,
            sortOrder: 5,
          },
          {
            slug: 'datacard',
            name: 'Data Card',
            description: 'High-speed 4G/5G dongle, Wi-Fi hotspot, and broadband data top-ups.',
            iconName: 'Wifi',
            identifierLabel: 'Data Card / Dongle Number',
            identifierPlaceholder: 'Enter data card number',
            isActive: true,
            sortOrder: 6,
          },
          {
            slug: 'gas',
            name: 'Gas Bill',
            description: 'Piped natural gas utility bills and cylinder booking payments.',
            iconName: 'Flame',
            identifierLabel: 'Customer / BP Number',
            identifierPlaceholder: 'Enter gas customer ID',
            isActive: true,
            sortOrder: 7,
          },
          {
            slug: 'insurance',
            name: 'Insurance',
            description: 'Life, health, and motor insurance premium renewals.',
            iconName: 'ShieldCheck',
            identifierLabel: 'Policy Number',
            identifierPlaceholder: 'Enter insurance policy number',
            isActive: true,
            sortOrder: 8,
          },
          {
            slug: 'loan',
            name: 'Loan Repayment',
            description: 'Personal, auto, consumer durable, and EMI loan installments.',
            iconName: 'Landmark',
            identifierLabel: 'Loan Account Number',
            identifierPlaceholder: 'Enter loan account number',
            isActive: true,
            sortOrder: 9,
          },
        ])
        .returning();

      const bySlug = new Map(insertedServices.map((s) => [s.slug, s.id]));

      const operatorSeeds = [
        // Mobile
        { serviceId: bySlug.get('mobile')!, name: 'Airtel Wireless', code: 'AIRTEL_MOB', commissionRate: 2.5, flatFee: 0, minAmount: 10, maxAmount: 10000, accentColor: '#DC2626' },
        { serviceId: bySlug.get('mobile')!, name: 'Jio Telecom', code: 'JIO_MOB', commissionRate: 2.2, flatFee: 0, minAmount: 10, maxAmount: 10000, accentColor: '#1D4ED8' },
        { serviceId: bySlug.get('mobile')!, name: 'Vodafone Idea (Vi)', code: 'VI_MOB', commissionRate: 2.8, flatFee: 0, minAmount: 10, maxAmount: 10000, accentColor: '#D97706' },
        { serviceId: bySlug.get('mobile')!, name: 'Grameen / Robi Global', code: 'GP_MOB', commissionRate: 2.6, flatFee: 0, minAmount: 10, maxAmount: 10000, accentColor: '#0284C7' },
        // DTH
        { serviceId: bySlug.get('dth')!, name: 'Tata Play DTH', code: 'TATA_DTH', commissionRate: 3.2, flatFee: 0, minAmount: 50, maxAmount: 15000, accentColor: '#7C3AED' },
        { serviceId: bySlug.get('dth')!, name: 'Airtel Digital TV', code: 'AIRTEL_DTH', commissionRate: 3.0, flatFee: 0, minAmount: 50, maxAmount: 15000, accentColor: '#DC2626' },
        { serviceId: bySlug.get('dth')!, name: 'Dish TV HD', code: 'DISH_DTH', commissionRate: 3.4, flatFee: 0, minAmount: 50, maxAmount: 15000, accentColor: '#EA580C' },
        // Cable
        { serviceId: bySlug.get('cable')!, name: 'Hathway Digital Cable', code: 'HATHWAY_CAB', commissionRate: 2.4, flatFee: 0, minAmount: 50, maxAmount: 10000, accentColor: '#0F766E' },
        { serviceId: bySlug.get('cable')!, name: 'DEN Networks Cable', code: 'DEN_CAB', commissionRate: 2.5, flatFee: 0, minAmount: 50, maxAmount: 10000, accentColor: '#2563EB' },
        { serviceId: bySlug.get('cable')!, name: 'Akash Digital Cable', code: 'AKASH_CAB', commissionRate: 2.6, flatFee: 0, minAmount: 50, maxAmount: 10000, accentColor: '#4338CA' },
        // Electricity
        { serviceId: bySlug.get('electricity')!, name: 'Metro Power Grid', code: 'METRO_ELEC', commissionRate: 0.85, flatFee: 0, minAmount: 50, maxAmount: 100000, accentColor: '#D97706' },
        { serviceId: bySlug.get('electricity')!, name: 'State Electricity Board', code: 'STATE_ELEC', commissionRate: 0.75, flatFee: 0, minAmount: 50, maxAmount: 100000, accentColor: '#0369A1' },
        { serviceId: bySlug.get('electricity')!, name: 'National Power Utility', code: 'NAT_ELEC', commissionRate: 0.9, flatFee: 0, minAmount: 50, maxAmount: 100000, accentColor: '#059669' },
        // Water
        { serviceId: bySlug.get('water')!, name: 'City Municipal Water', code: 'CITY_WATER', commissionRate: 0.8, flatFee: 0, minAmount: 25, maxAmount: 50000, accentColor: '#0284C7' },
        { serviceId: bySlug.get('water')!, name: 'Metro Water Supply', code: 'METRO_WATER', commissionRate: 0.9, flatFee: 0, minAmount: 25, maxAmount: 50000, accentColor: '#0D9488' },
        // Data Card
        { serviceId: bySlug.get('datacard')!, name: 'JioFi 5G Data Card', code: 'JIO_DATA', commissionRate: 2.5, flatFee: 0, minAmount: 50, maxAmount: 10000, accentColor: '#1D4ED8' },
        { serviceId: bySlug.get('datacard')!, name: 'Airtel 4G Hotspot', code: 'AIRTEL_DATA', commissionRate: 2.4, flatFee: 0, minAmount: 50, maxAmount: 10000, accentColor: '#DC2626' },
        // Gas
        { serviceId: bySlug.get('gas')!, name: 'City Piped Gas Corp', code: 'CITY_GAS', commissionRate: 0.95, flatFee: 0, minAmount: 50, maxAmount: 50000, accentColor: '#EA580C' },
        { serviceId: bySlug.get('gas')!, name: 'National Gas Supply', code: 'NAT_GAS', commissionRate: 0.85, flatFee: 0, minAmount: 50, maxAmount: 50000, accentColor: '#B45309' },
        // Insurance
        { serviceId: bySlug.get('insurance')!, name: 'Horizon Life Insurance', code: 'HORIZON_INS', commissionRate: 1.2, flatFee: 0, minAmount: 100, maxAmount: 200000, accentColor: '#059669' },
        { serviceId: bySlug.get('insurance')!, name: 'Shield Health & Motor', code: 'SHIELD_INS', commissionRate: 1.35, flatFee: 0, minAmount: 100, maxAmount: 200000, accentColor: '#0F766E' },
        // Loan
        { serviceId: bySlug.get('loan')!, name: 'Apex Finance EMI', code: 'APEX_LOAN', commissionRate: 0.65, flatFee: 0, minAmount: 100, maxAmount: 250000, accentColor: '#334155' },
        { serviceId: bySlug.get('loan')!, name: 'Capital Credit Corp', code: 'CAP_LOAN', commissionRate: 0.75, flatFee: 0, minAmount: 100, maxAmount: 250000, accentColor: '#1E293B' },
      ];

      await db.insert(operators).values(operatorSeeds);
    }

    const [{ value: offerCount }] = await db
      .select({ value: count() })
      .from(cashbackOffers);

    if (offerCount === 0) {
      await db.insert(cashbackOffers).values([
        {
          title: '5% Instant Cashback on Mobile',
          description: 'Get 5% instant wallet cashback up to ₹25 on prepaid or postpaid mobile recharges of ₹20 or more.',
          promoCode: 'MOBILE5',
          serviceSlug: 'mobile',
          discountType: 'percentage',
          discountValue: 5,
          maxCashback: 25,
          minTransactionAmount: 20,
          isActive: true,
          expiresAt: '2026-12-31',
        },
        {
          title: 'Flat ₹10 Back on Utility Bills',
          description: 'Save flat ₹10 on Electricity, Water, or Gas bill payments above ₹100.',
          promoCode: 'BILL10',
          serviceSlug: 'electricity',
          discountType: 'flat',
          discountValue: 10,
          maxCashback: 10,
          minTransactionAmount: 100,
          isActive: true,
          expiresAt: '2026-12-31',
        },
        {
          title: 'DTH & Cable Weekend Bonus',
          description: 'Earn 4% extra cashback up to ₹30 on DTH and Cable TV renewals.',
          promoCode: 'DTHMAX',
          serviceSlug: 'dth',
          discountType: 'percentage',
          discountValue: 4,
          maxCashback: 30,
          minTransactionAmount: 25,
          isActive: true,
          expiresAt: '2026-12-31',
        },
        {
          title: 'Universal 2% All-Service Cashback',
          description: 'Valid across all 9 recharge and bill payment services on orders above ₹50.',
          promoCode: 'VOLTALL2',
          serviceSlug: 'all',
          discountType: 'percentage',
          discountValue: 2,
          maxCashback: 40,
          minTransactionAmount: 50,
          isActive: true,
          expiresAt: '2026-12-31',
        },
      ]);
    }

    const [{ value: settingCount }] = await db
      .select({ value: count() })
      .from(platformSettings);

    if (settingCount === 0) {
      await db.insert(platformSettings).values([
        {
          key: 'brand_name',
          value: 'VoltPay',
          label: 'Platform Brand Name',
          description: 'Displayed across the dashboard header, receipts, and login page.',
        },
        {
          key: 'currency_symbol',
          value: '₹',
          label: 'Currency Symbol',
          description: 'Currency prefix used across wallets, commissions, offers, and bills (e.g., ₹, $, ৳, €).',
        },
        {
          key: 'whatsapp_support_number',
          value: '+15550194820',
          label: 'WhatsApp Support Number',
          description: 'International phone number with country code for instant customer support.',
        },
        {
          key: 'whatsapp_support_message',
          value: 'Hello VoltPay Support, I need assistance with my account or recharge transaction.',
          label: 'Default WhatsApp Support Message',
          description: 'Pre-filled message sent when users click Contact WhatsApp Support.',
        },
        {
          key: 'whatsapp_channel_url',
          value: 'https://whatsapp.com/channel/0029VaVoltPayOfficial',
          label: 'WhatsApp Channel URL',
          description: 'Official WhatsApp Channel invite link for rate updates and cashback alerts.',
        },
        {
          key: 'whatsapp_channel_label',
          value: 'Join Official VoltPay Updates Channel',
          label: 'WhatsApp Channel Button Label',
          description: 'Call-to-action label shown on the WhatsApp Channel card.',
        },
        {
          key: 'referral_bonus_referrer',
          value: '25',
          label: 'Referrer Bonus Amount',
          description: 'Wallet credit awarded to the user who shares their referral code.',
        },
        {
          key: 'referral_bonus_referee',
          value: '15',
          label: 'New User Referral Bonus',
          description: 'Welcome bonus awarded to a new user signing up with a valid referral code.',
        },
        {
          key: 'support_email',
          value: 'support@voltpay.io',
          label: 'Support Email',
          description: 'Official customer care email address.',
        },
        {
          key: 'min_add_money',
          value: '10',
          label: 'Minimum Wallet Top-Up',
          description: 'Minimum amount allowed per Add Money transaction.',
        },
        {
          key: 'max_add_money',
          value: '50000',
          label: 'Maximum Wallet Top-Up',
          description: 'Maximum amount allowed per Add Money transaction.',
        },
      ]);
    }

    const [{ value: bannerCount }] = await db
      .select({ value: count() })
      .from(offerBanners);

    if (bannerCount === 0) {
      await db.insert(offerBanners).values([
        {
          title: '5% Instant Cashback on Mobile Recharges',
          subtitle: 'Use code MOBILE5 on orders of ₹20 or more',
          promoCode: 'MOBILE5',
          serviceSlug: 'mobile',
          imageUrl: '',
          accentColor: '#1D4ED8',
          ctaLabel: 'Apply MOBILE5',
          isActive: true,
          sortOrder: 1,
        },
        {
          title: 'Flat ₹10 Cashback on Electricity & Utility Bills',
          subtitle: 'Apply code BILL10 on bill payments above ₹100',
          promoCode: 'BILL10',
          serviceSlug: 'electricity',
          imageUrl: '',
          accentColor: '#0F766E',
          ctaLabel: 'Apply BILL10',
          isActive: true,
          sortOrder: 2,
        },
      ]);
    }
  } catch (error) {
    console.error('Database seed failed:', error);
    throw new Error('Failed to initialize platform seed data.', { cause: error });
  }
}

export async function ensureSeeded(): Promise<void> {
  if (!seededPromise) {
    seededPromise = runSeed().catch((err) => {
      seededPromise = null;
      throw err;
    });
  }
  return seededPromise;
}
