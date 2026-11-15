import { ethers } from "ethers";
import { ORDER_STATUS, escrowState } from "./abi.js";

export function eventName(event) {
  return event.name || event.eventName || event.fragment?.name || "";
}

function upsertOrder(data, patch) {
  const index = data.orders.findIndex((order) => order.orderId === patch.orderId);
  const now = new Date().toISOString();
  if (index === -1) {
    data.orders.push({ deliveryNote: "", ...patch, updatedAt: now });
    return;
  }

  const current = data.orders[index];
  data.orders[index] = {
    ...current,
    ...patch,
    seller: patch.seller || current.seller || null,
    deliveryNote: patch.deliveryNote ?? current.deliveryNote ?? "",
    updatedAt: now
  };
}

export function applyChainEvents(data, events, txHash) {
  for (const event of events) {
    const name = eventName(event);
    const args = event.args || {};
    const hash = txHash || event.transactionHash || null;

    if (name === "ItemListed") {
      const listingId = args.listingId.toString();
      const seller = args.seller;
      const draft = data.drafts.find((item) =>
        item.metadataURI === args.metadataURI
        && item.seller.toLowerCase() === String(seller).toLowerCase()
      );
      if (draft) {
        draft.listingId = listingId;
        draft.status = "LISTED";
        draft.priceWei = args.price.toString();
        draft.priceEth = ethers.formatEther(args.price);
        draft.stock = args.stock.toString();
        draft.listTxHash = hash || draft.listTxHash || null;
        draft.updatedAt = new Date().toISOString();
      }
    }

    if (name === "ListingCancelled") {
      const listingId = args.listingId.toString();
      const draft = data.drafts.find((item) => item.listingId === listingId);
      if (draft) {
        draft.status = "DELISTED";
        draft.stock = "0";
        draft.delistTxHash = hash || draft.delistTxHash || null;
        draft.updatedAt = new Date().toISOString();
      }
    }

    if (name === "ItemBought") {
      const listingId = args.listingId.toString();
      const draft = data.drafts.find((item) => item.listingId === listingId);
      upsertOrder(data, {
        orderId: args.orderId.toString(),
        listingId,
        buyer: args.buyer,
        seller: draft?.seller,
        quantity: args.quantity.toString(),
        amountWei: args.amount.toString(),
        amountEth: ethers.formatEther(args.amount),
        currency: "ETH",
        paymentStandard: "NATIVE_ETH",
        status: "PAID_HELD",
        escrow: "held",
        ...(hash ? { txHash: hash } : {})
      });
    }

    if (name === "OrderStatusChanged") {
      const status = ORDER_STATUS[Number(args.status)] || "NONE";
      upsertOrder(data, {
        orderId: args.orderId.toString(),
        status,
        escrow: escrowState(status),
        ...(hash ? { txHash: hash } : {})
      });
    }
  }
}
