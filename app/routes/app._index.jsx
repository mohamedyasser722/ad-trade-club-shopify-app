import { useLoaderData } from "@remix-run/react";
import { Page, Card, Box, Text } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const accountID = session.shop;
  const shopDomain = session.shop;

  // 1. Check DB for pixel
  console.log('shopDomain', shopDomain);
  let shop = await prisma.shop.findUnique({ where: { domain: shopDomain } });
  if (shop && shop.pixelId) {
    // Pixel already created, return info
    return { pixel: { id: shop.pixelId }, userErrors: [] };
  }

  // 2. Create pixel
  
  const mutationResponse = await admin.graphql(
    `#graphql\n      mutation webPixelCreate($webPixel: WebPixelInput!) {\n        webPixelCreate(webPixel: $webPixel) {\n          userErrors {\n            field\n            message\n          }\n          webPixel {\n            settings\n            id\n          }\n        }\n      }\n    `,
    {
      variables: {
        webPixel: {
          settings: {
            accountID: accountID
          },
        },
      },
    }
  );

  if (!mutationResponse.ok) {
    console.error('Request failed', mutationResponse);
    return null;
  }

  const data = await mutationResponse.json();
  const pixel = data.data.webPixelCreate.webPixel;
  const userErrors = data.data.webPixelCreate.userErrors;

  // 3. Save pixelId to DB if created
  if (pixel && pixel.id) {
    await prisma.shop.upsert({
      where: { domain: shopDomain },
      update: { pixelId: pixel.id },
      create: { domain: shopDomain, pixelId: pixel.id },
    });
  }

  return { pixel, userErrors };
};

export default function Index() {
  const loaderData = useLoaderData();

  return (
    <Page>
      <Card>
        <Box padding="400" background="bg-surface-active" borderWidth="025" borderRadius="200" borderColor="border" overflowX="scroll">
          <Text as="h3" variant="headingMd">Web Pixel Info</Text>
          <pre style={{ margin: 0 }}>
            <code>{JSON.stringify(loaderData?.pixel, null, 2)}</code>
          </pre>
          {loaderData?.userErrors && loaderData.userErrors.length > 0 && (
            <>
              <Text as="h3" variant="headingMd">User Errors</Text>
              <pre style={{ margin: 0 }}>
                <code>{JSON.stringify(loaderData.userErrors, null, 2)}</code>
              </pre>
            </>
          )}
        </Box>
      </Card>
    </Page>
  );
}
