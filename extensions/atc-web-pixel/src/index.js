import {register} from "@shopify/web-pixels-extension";

// Cookie helpers using the sandbox browser API
async function setAtcCookie(browser, value, sig) {
  // 30 days ~ 2,592,000 seconds
  const maxAge = 30 * 24 * 60 * 60;
  await browser.cookie.set(`atc_slot=${encodeURIComponent(value)}; Path=/; SameSite=Lax; Max-Age=${maxAge}`);
  if (sig) {
    await browser.cookie.set(`atc_sig=${encodeURIComponent(sig)}; Path=/; SameSite=Lax; Max-Age=${maxAge}`);
  }
}
async function getAtcCookie(browser) {
  const v = await browser.cookie.get('atc_slot');
  return decodeURIComponent(v || '');
}
async function getSigCookie(browser) {
  const v = await browser.cookie.get('atc_sig');
  return decodeURIComponent(v || '');
}

function parseAtcFromUrl(href) {
  try {
    const u = new URL(href);
    // Prefer query ?atc=... ; fall back to hash #atc=...
    let atc = u.searchParams.get('atc');
    let sig = u.searchParams.get('atc_sig');
    if (!atc && u.hash) {
      const hash = new URLSearchParams(u.hash.replace(/^#/, ''));
      atc = hash.get('atc') || atc;
      sig = hash.get('atc_sig') || sig;
    }
    return { atc, sig };
  } catch {
    return { atc: null, sig: null };
  }
}

register(({ analytics, browser, settings }) => {
  const shop = settings.accountID; // e.g. calibtos.myshopify.com

  const ingest = (body) => {
    fetch("https://technology-outcome-dont-fathers.trycloudflare.com/api/web-pixel/analytics", { // cloudflare proxy to use https
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  };

  analytics.subscribe('page_viewed', async (event) => {
    const href = event?.context?.document?.location?.href || '';
    const { atc, sig } = parseAtcFromUrl(href);

    if (atc) {
      await setAtcCookie(browser, atc, sig);
    }

    const campaignId = atc || (await getAtcCookie(browser));
    const campaignSig = sig || (await getSigCookie(browser)) || null;

    ingest({
      accountID: shop,
      event_name: 'page_viewed',
      event_data: event,
      campaign_id: campaignId || null,
      campaign_sig: campaignSig,
    });
  });

  const forward = async (name, evt) => {
    const campaignId = await getAtcCookie(browser);
    const campaignSig = await getSigCookie(browser);
    ingest({
      accountID: shop,
      event_name: name,
      event_data: evt,
      campaign_id: campaignId || null,
      campaign_sig: campaignSig || null,
    });
  };

  analytics.subscribe('product_added_to_cart',  (e) => forward('product_added_to_cart', e));
  analytics.subscribe('checkout_completed',      (e) => forward('checkout_completed', e));
  analytics.subscribe('checkout_address_info_submitted', (e) => forward('checkout_address_info_submitted', e));
});
