/** Portales / redes: no son el email del negocio. */

const BLOCKED =
  /tripadvisor|booking\.com|airbnb|thefork|eltenedor|yelp|facebook|instagram|twitter|x\.com|tiktok|google\.(com|es)|maps\.app|goo\.gl|bit\.ly|linktr\.ee|wix\.com|squarespace|wordpress\.com|blogger|paginasamarillas|infojobs|idealista|milanuncios|wallapop|just-eat|glovo|ubereats|deliveroo|mint|covermanager|quandoo|resy|opentable|domicilios|groupon/i;

export function isBlockedOutreachHost(urlOrHost: string): boolean {
  try {
    const host = urlOrHost.includes("://")
      ? new URL(urlOrHost).hostname
      : urlOrHost;
    return BLOCKED.test(host);
  } catch {
    return true;
  }
}

export function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
