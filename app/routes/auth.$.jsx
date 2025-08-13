import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  return null;
};


// function getSessionTokenHeader(request) {
//   return request.headers['authorization']?.replace('Bearer ', '');
// }

// function getSessionTokenFromUrlParam(request) {
//   const searchParams = new URLSearchParams(request.url);

//   return searchParams.get('id_token');
// }

// function redirectToSessionTokenBouncePage(req, res) {
//   const searchParams = new URLSearchParams(req.query);
//   // Remove `id_token` from the query string to prevent an invalid session token sent to the redirect path.
//   searchParams.delete('id_token');

//   // Using shopify-reload path to redirect the bounce automatically.
//   searchParams.append(
//     'shopify-reload',
//     `${req.path}?${searchParams.toString()}`
//   );
//   res.redirect(`/session-token-bounce?${searchParams.toString()}`);
// }

// router.get('/session-token-bounce', async function (req, res, next) {
//   res.setHeader("Content-Type", "text/html");
//   // "process.env.SHOPIFY_API_KEY" is available if you use Shopify CLI to run your app.
//   // You can also replace it with your App's Client ID manually.
//   const html = `
//   <head>
//       <meta name="shopify-api-key" content="${process.env.SHOPIFY_API_KEY}" />
//       <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
//   </head>
//   `;
//   res.send(html);
// });

// router.get('/authorize', async function (req, res, next) {
//   let encodedSessionToken = null;
//   let decodedSessionToken = null;
//   try {
//     encodedSessionToken =
//       getSessionTokenHeader(req) || getSessionTokenFromUrlParam(req);

//     // "shopify" is an instance of the Shopify API library object,
//     // You can install and configure the Shopify API library through: https://www.npmjs.com/package/@shopify/shopify-api
//     decodedSessionToken = await shopify.session.decodeSessionToken(
//       encodedSessionToken
//     );
//   } catch (e) {
//     // Handle invalid session token error
//     const isDocumentRequest = !request.headers.get("authorization");
//     if (isDocumentRequest) {
//       return redirectToSessionTokenBouncePage(req, res);
//     }

//     throw new Response(undefined, {
//       status: 401,
//       statusText: 'Unauthorized',
//       headers: new Headers({
//         'X-Shopify-Retry-Invalid-Session-Request': '1',
//       }),
//     });
//   }

//   const dest = new URL(decodedSessionToken.dest);
//   const shop = dest.hostname;
//   const accessToken = await shopify.auth.tokenExchange({
//     shop,
//     sessionToken: encodedSessionToken,
//     requestedTokenType: RequestedTokenType.OnlineAccessToken, // or RequestedTokenType.OfflineAccessToken
//   });

//   res.setHeader("Content-Type", "text/html");
//   const html = `
//   <body>
//     <h1>Retrieved access Token</h1>
//     <p>${JSON.stringify(accessToken, null, 2)}</p>
//   </body>`;
//   res.send(html);
// });

// module.exports = router;