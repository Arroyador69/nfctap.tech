/** Acepta CALLS_SYNC_SECRET o el alias SALES_CALL_SYNC_SECRET. */
export function callsSyncSecret() {
  return (
    process.env.CALLS_SYNC_SECRET?.trim() ||
    process.env.SALES_CALL_SYNC_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    ""
  );
}

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://nfctap.tech").replace(/\/$/, "");
}
