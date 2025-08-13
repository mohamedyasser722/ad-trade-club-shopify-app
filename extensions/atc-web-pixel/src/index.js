import {register} from "@shopify/web-pixels-extension";

// Cookie helpers using the sandbox browser API
async function setAtcCookie(browser, value) {
  // 30 days ~ 2,592,000 seconds
  const maxAge = 30 * 24 * 60 * 60;
  await browser.cookie.set(`atc_slot=${encodeURIComponent(value)}; Path=/; SameSite=Lax; Max-Age=${maxAge}`);
}
async function getAtcCookie(browser) {
  const v = await browser.cookie.get('atc_slot');
  return decodeURIComponent(v || '');
}

register(({ analytics, browser, settings }) => {
  const shop = settings.accountID; // e.g. calibtos.myshopify.com

  const ingest = (body) => {
    fetch("https://inch-thomson-myanmar-efficient.trycloudflare.com/api/web-pixel/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  };

  analytics.subscribe('page_viewed', async (event) => {
    const href = event?.context?.document?.location?.href;
    let campaign = null;
    try {
      const u = new URL(href);
      const src = u.searchParams.get('utm_source');
      const camp = u.searchParams.get('utm_campaign');
      if (src === 'atc' && camp) {
        campaign = camp;
        await setAtcCookie(browser, campaign);
      }
    } catch {}

    const campaignId = campaign || (await getAtcCookie(browser));

    ingest({
      accountID: shop,
      event_name: 'page_viewed',
      event_data: event,
      campaign_id: campaignId,
    });
  });

  analytics.subscribe('product_added_to_cart', async (event) => {
    const campaignId = await getAtcCookie(browser);
    ingest({
      accountID: shop,
      event_name: 'product_added_to_cart',
      event_data: event,
      campaign_id: campaignId,
    });
  });

  analytics.subscribe('checkout_completed', async (event) => {
    const campaignId = await getAtcCookie(browser);
    ingest({
      accountID: shop,
      event_name: 'checkout_completed',
      event_data: event,
      campaign_id: campaignId,
    });
  });
});
// https://calibtos-dev-store.myshopify.com/?utm_source=atc&utm_campaign=61616161-6161-4616-8616-616161616161:1
