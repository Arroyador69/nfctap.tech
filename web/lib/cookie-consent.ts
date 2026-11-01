"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

export type CookieConsent = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
};

export const COOKIE_CONSENT_KEY = "nfctap_cookie_consent_v1";

export function readConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CookieConsent>;
    if (typeof parsed.analytics !== "boolean" || typeof parsed.marketing !== "boolean") {
      return null;
    }
    return {
      necessary: true,
      analytics: parsed.analytics,
      marketing: parsed.marketing,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeConsent(partial: { analytics: boolean; marketing: boolean }) {
  const value: CookieConsent = {
    necessary: true,
    analytics: partial.analytics,
    marketing: partial.marketing,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(value));
  window.dispatchEvent(new Event("nfctap-consent"));
  return value;
}

export function acceptAllConsent() {
  return writeConsent({ analytics: true, marketing: true });
}

export function rejectOptionalConsent() {
  return writeConsent({ analytics: false, marketing: false });
}

function subscribeConsent(onStoreChange: () => void) {
  window.addEventListener("nfctap-consent", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener("nfctap-consent", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getConsentSnapshot(): string {
  return JSON.stringify(readConsent());
}

function getServerConsentSnapshot(): string {
  return "null";
}

export function useCookieConsent(): CookieConsent | null {
  const raw = useSyncExternalStore(
    subscribeConsent,
    getConsentSnapshot,
    getServerConsentSnapshot,
  );
  try {
    return JSON.parse(raw) as CookieConsent | null;
  } catch {
    return null;
  }
}

/** Draft editable encima del consentimiento guardado (página /cookies y banner). */
export function useConsentDraft() {
  const stored = useCookieConsent();
  const [draft, setDraft] = useState<{ analytics: boolean; marketing: boolean } | null>(null);

  const analytics = draft?.analytics ?? stored?.analytics ?? false;
  const marketing = draft?.marketing ?? stored?.marketing ?? false;

  const setAnalytics = useCallback(
    (v: boolean) => {
      setDraft((prev) => ({
        analytics: v,
        marketing: prev?.marketing ?? stored?.marketing ?? false,
      }));
    },
    [stored?.marketing],
  );

  const setMarketing = useCallback(
    (v: boolean) => {
      setDraft((prev) => ({
        analytics: prev?.analytics ?? stored?.analytics ?? false,
        marketing: v,
      }));
    },
    [stored?.analytics],
  );

  const clearDraft = useCallback(() => setDraft(null), []);

  return { analytics, marketing, setAnalytics, setMarketing, clearDraft, stored };
}
