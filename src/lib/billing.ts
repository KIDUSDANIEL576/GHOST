// Ghost billing: localStorage-based pro gate
// Replace STRIPE_LINK with your actual Stripe Payment Link

export const STRIPE_LINK = 'https://buy.stripe.com/YOUR_LINK_HERE';

export interface BillingStatus {
  tier: 'free' | 'pro'; isActive: boolean; since?: number;
}

export function getBilling(): BillingStatus {
  try {
    const s = localStorage.getItem('ghost_billing_v1');
    return s ? JSON.parse(s) : { tier: 'free', isActive: false };
  } catch { return { tier: 'free', isActive: false }; }
}

export function setBilling(status: BillingStatus) {
  localStorage.setItem('ghost_billing_v1', JSON.stringify(status));
}

export function isPro(): boolean {
  const b = getBilling();
  return b.tier === 'pro' && b.isActive;
}

export async function openCheckout() {
  try {
    const { open } = await import('@tauri-apps/api/shell');
    await open(STRIPE_LINK);
  } catch { window.open(STRIPE_LINK, '_blank'); }
}

// DEV HELPER: call activatePro() in console to test pro features
export function activatePro() {
  setBilling({ tier: 'pro', isActive: true, since: Date.now() });
  alert('Pro activated (dev mode). Reload the app.');
}

// Bind to window for console activation
if (typeof window !== 'undefined') {
  (window as any).activatePro = activatePro;
}
