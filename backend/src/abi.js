export const MARKETPLACE_ABI = [
  "function SELLER_ROLE() view returns (bytes32)",
  "function listingCount() view returns (uint256)",
  "function orderCount() view returns (uint256)",
  "function getUserRole(address user) view returns (uint8)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function listings(uint256) view returns (address seller, uint256 price, uint256 stock, uint8 status, string metadataURI)",
  "function orders(uint256) view returns (uint256 listingId, address buyer, address seller, uint256 quantity, uint256 amount, uint8 status)",
  "function listItem(string metadataURI, uint256 price, uint256 stock) returns (uint256)",
  "function delistItem(uint256 listingId, uint256[] orderIds)",
  "function markShipped(uint256 orderId)",
  "function buyItem(uint256 listingId, uint256 quantity) payable returns (uint256)",
  "function confirmDelivery(uint256 orderId)",
  "function cancelOrder(uint256 orderId)",
  "function grantRole(bytes32 role, address account)",
  "event ItemListed(uint256 indexed listingId, address indexed seller, uint256 price, uint256 stock, string metadataURI)",
  "event ListingCancelled(uint256 indexed listingId)",
  "event ItemBought(uint256 indexed orderId, uint256 indexed listingId, address indexed buyer, uint256 quantity, uint256 amount)",
  "event OrderStatusChanged(uint256 indexed orderId, uint8 status)"
];

export const ROLE_NAMES = ["BUYER", "SELLER", "ADMIN"];
export const LISTING_STATUS = ["NONE", "ACTIVE", "CANCELLED"];
export const ORDER_STATUS = ["NONE", "PAID_HELD", "SHIPPED", "COMPLETED", "CANCELLED"];

export function escrowState(status) {
  if (status === "PAID_HELD" || status === "SHIPPED") return "held";
  if (status === "COMPLETED") return "released";
  if (status === "CANCELLED") return "refunded";
  return "none";
}
