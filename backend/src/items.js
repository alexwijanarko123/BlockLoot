import { config } from "./config.js";

export function publicImage(imagePath) {
  if (!imagePath) return "";
  return `${config.publicBaseUrl}${imagePath}`;
}

export function metadataFor(draft) {
  const stats = draft.stats || {};
  return {
    name: draft.title,
    description: draft.story,
    image: publicImage(draft.imagePath),
    attributes: [
      { trait_type: "assetStandard", value: draft.assetStandard },
      { trait_type: "payment", value: "NATIVE_ETH" },
      ...Object.entries(stats).map(([trait, value]) => ({ trait_type: trait, value }))
    ],
    properties: {
      seller: draft.seller,
      assetStandard: draft.assetStandard,
      assetContract: draft.assetContract || null,
      tokenId: draft.tokenId || null,
      stats
    }
  };
}

export function presentDraft(draft) {
  return {
    ...draft,
    image: publicImage(draft.imagePath),
    paymentStandard: "NATIVE_ETH"
  };
}

export function mergeCatalogItem(listing, draft) {
  return {
    id: listing?.listingId || draft?.id,
    listingId: listing?.listingId || draft?.listingId || null,
    draftId: draft?.id || null,
    title: draft?.title || `Listing #${listing?.listingId}`,
    story: draft?.story || "",
    stats: draft?.stats || {},
    image: publicImage(draft?.imagePath),
    price: listing?.priceEth || draft?.priceEth || "0",
    priceWei: listing?.priceWei || null,
    currency: "ETH",
    paymentStandard: "NATIVE_ETH",
    stock: listing?.stock || draft?.stock || "0",
    seller: listing?.seller || draft?.seller,
    status: listing?.status || draft?.status || "DRAFT",
    assetStandard: draft?.assetStandard || null,
    assetContract: draft?.assetContract || null,
    tokenId: draft?.tokenId || null,
    metadataURI: listing?.metadataURI || draft?.metadataURI || ""
  };
}
