import { useLoaderData } from "@remix-run/react";
import { useState } from "react";
import {
  Page,
  Card,
  Box,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Badge,
  Banner,
  DescriptionList,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const accountID = session.shop;
  const shopDomain = session.shop;

  console.log('session', session);

  // 1. Check DB for pixel
  console.log('shopDomain', shopDomain);
  let shop = await prisma.shop.findUnique({ where: { domain: shopDomain } });
  if (shop && shop.pixelId) {
    // Pixel already created, return info
    return { pixel: { id: shop.pixelId }, userErrors: [], accountID, shopDomain };
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

  return { pixel, userErrors, accountID, shopDomain };
};

export default function Index() {
  const { pixel, userErrors, accountID, shopDomain } = useLoaderData();

  const [copiedField, setCopiedField] = useState(null);

  let settings = undefined;
  try {
    if (pixel?.settings) {
      settings = typeof pixel.settings === 'string' ? JSON.parse(pixel.settings) : pixel.settings;
    }
  } catch {}

  const pixelId = pixel?.id || "Not available";
  const displayAccountId = settings?.accountID || accountID || "Not available";

  const handleCopy = async (label, value) => {
    try {
      await navigator.clipboard.writeText(String(value || ''));
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 1500);
    } catch {}
  };

  return (
    <Page>
      <TitleBar title="Ad Trade Club" />
      <Card>
        <BlockStack gap="400">
          {userErrors && userErrors.length > 0 ? (
            <Banner tone="critical" title="We couldn't create your Web Pixel">
              <Box paddingBlockStart="300">
                <pre style={{ margin: 0 }}>
                  <code>{JSON.stringify(userErrors, null, 2)}</code>
                </pre>
              </Box>
            </Banner>
          ) : (
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h2" variant="headingMd">Web pixel</Text>
              <Badge tone="success">Connected</Badge>
            </InlineStack>
          )}

          <DescriptionList
            items={[
              { term: 'Shop domain', description: shopDomain },
              {
                term: 'Pixel ID',
                description: (
                  <InlineStack gap="200" blockAlign="center">
                    <Text as="span" variant="bodyMd">{pixelId}</Text>
                    <Button size="micro" onClick={() => handleCopy('pixelId', pixelId)}>
                      {copiedField === 'pixelId' ? 'Copied' : 'Copy'}
                    </Button>
                  </InlineStack>
                ),
              },
              {
                term: 'Account ID',
                description: (
                  <InlineStack gap="200" blockAlign="center">
                    <Text as="span" variant="bodyMd">{displayAccountId}</Text>
                    <Button size="micro" onClick={() => handleCopy('accountId', displayAccountId)}>
                      {copiedField === 'accountId' ? 'Copied' : 'Copy'}
                    </Button>
                  </InlineStack>
                ),
              },
            ]}
          />

          {/* Extra guidance removed by request */}
        </BlockStack>
      </Card>
    </Page>
  );
}
