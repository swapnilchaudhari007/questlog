import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesPackage, LOG_LEVEL } from 'react-native-purchases';
import { useCallback, useEffect, useState } from 'react';

export const ENTITLEMENT = 'pro';

const KEYS = {
  ios: process.env.EXPO_PUBLIC_RC_IOS_KEY,
  android: process.env.EXPO_PUBLIC_RC_ANDROID_KEY,
  web: process.env.EXPO_PUBLIC_RC_WEB_KEY,
} as Record<string, string | undefined>;

const apiKey = KEYS[Platform.OS];
/** Demo mode: no RevenueCat key configured (e.g. web preview / video recording). */
export const DEMO = !apiKey;

export type Plan = { id: string; title: string; price: string; period: string; badge?: string; trial?: string; pkg?: PurchasesPackage };

const DEMO_PLANS: Plan[] = [
  { id: 'annual', title: 'Yearly', price: '$19.99', period: '/year', badge: 'BEST VALUE · 58% OFF', trial: '7-day free trial' },
  { id: 'monthly', title: 'Monthly', price: '$3.99', period: '/month' },
  { id: 'lifetime', title: 'Lifetime', price: '$39.99', period: 'once' },
];

let configured = false;
function configure() {
  if (DEMO || configured) return;
  Purchases.setLogLevel(LOG_LEVEL.WARN);
  Purchases.configure({ apiKey: apiKey! });
  configured = true;
}

const isPro = (info?: CustomerInfo | null) => !!info?.entitlements.active[ENTITLEMENT];

export function usePro() {
  const [pro, setPro] = useState(false);
  const [plans, setPlans] = useState<Plan[]>(DEMO_PLANS);

  useEffect(() => {
    if (DEMO) return;
    configure();
    Purchases.getCustomerInfo().then((i) => setPro(isPro(i))).catch(() => {});
    const listener = (i: CustomerInfo) => setPro(isPro(i));
    Purchases.addCustomerInfoUpdateListener(listener);
    Purchases.getOfferings()
      .then((o) => {
        const pkgs = o.current?.availablePackages ?? [];
        if (!pkgs.length) return;
        setPlans(
          pkgs.map((p) => ({
            id: p.identifier,
            title: p.packageType === 'ANNUAL' ? 'Yearly' : p.packageType === 'MONTHLY' ? 'Monthly' : p.packageType === 'LIFETIME' ? 'Lifetime' : p.product.title,
            price: p.product.priceString,
            period: p.packageType === 'ANNUAL' ? '/year' : p.packageType === 'MONTHLY' ? '/month' : 'once',
            badge: p.packageType === 'ANNUAL' ? 'BEST VALUE' : undefined,
            trial: p.product.introPrice ? `${p.product.introPrice.periodNumberOfUnits}-${p.product.introPrice.periodUnit.toLowerCase()} free trial` : undefined,
            pkg: p,
          })),
        );
      })
      .catch(() => {});
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

  const buy = useCallback(async (plan: Plan) => {
    if (DEMO || !plan.pkg) {
      await new Promise((r) => setTimeout(r, 900));
      setPro(true);
      return true;
    }
    try {
      const { customerInfo } = await Purchases.purchasePackage(plan.pkg);
      setPro(isPro(customerInfo));
      return isPro(customerInfo);
    } catch (e: any) {
      if (!e?.userCancelled) console.warn('purchase failed', e);
      return false;
    }
  }, []);

  const restore = useCallback(async () => {
    if (DEMO) return false;
    const info = await Purchases.restorePurchases();
    setPro(isPro(info));
    return isPro(info);
  }, []);

  return { pro, plans, buy, restore };
}
