// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title SimpleGameMarketplace
/// @notice Marketplace item game sederhana: bayar ETH, dana ditahan di escrow.
/// Flow: listItem -> buyItem (PAID_HELD) -> markShipped (SHIPPED) -> confirmDelivery (COMPLETED)
/// Batal: cancelOrder / delistItem -> CANCELLED + refund otomatis.
contract SimpleGameMarketplace is AccessControl, ReentrancyGuard {
    // Admin = DEFAULT_ADMIN_ROLE, Seller = SELLER_ROLE, Buyer = selain keduanya
    bytes32 public constant SELLER_ROLE = keccak256("SELLER_ROLE");

    enum Role { BUYER, SELLER, ADMIN }
    enum ListingStatus { NONE, ACTIVE, CANCELLED }
    enum OrderStatus { NONE, PAID_HELD, SHIPPED, COMPLETED, CANCELLED }

    struct Listing {
        address seller;
        uint256 price;       // harga per item (wei)
        uint256 stock;
        ListingStatus status;
        string metadataURI;  // data off-chain (IPFS)
    }

    struct Order {
        uint256 listingId;
        address buyer;
        address seller;
        uint256 quantity;
        uint256 amount;      // dana di escrow
        OrderStatus status;
    }

    uint256 public listingCount;
    uint256 public orderCount;
    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Order) public orders;

    event ItemListed(uint256 indexed listingId, address indexed seller, uint256 price, uint256 stock, string metadataURI);
    event ListingCancelled(uint256 indexed listingId);
    event ItemBought(uint256 indexed orderId, uint256 indexed listingId, address indexed buyer, uint256 quantity, uint256 amount);
    event OrderStatusChanged(uint256 indexed orderId, OrderStatus status);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // ---------- Role ----------

    /// Cek role wallet. Admin memberi seller via grantRole(SELLER_ROLE, alamat).
    function getUserRole(address user) external view returns (Role) {
        if (hasRole(DEFAULT_ADMIN_ROLE, user)) return Role.ADMIN;
        if (hasRole(SELLER_ROLE, user)) return Role.SELLER;
        return Role.BUYER;
    }

    // ---------- Seller ----------

    function listItem(string calldata metadataURI, uint256 price, uint256 stock)
        external
        onlyRole(SELLER_ROLE)
        returns (uint256 id)
    {
        require(price > 0 && stock > 0, "Harga/stok tidak valid");

        id = ++listingCount;
        listings[id] = Listing(msg.sender, price, stock, ListingStatus.ACTIVE, metadataURI);
        emit ItemListed(id, msg.sender, price, stock, metadataURI);
    }

    /// Soft-delete listing + refund order PAID_HELD yang disebut di orderIds.
    function delistItem(uint256 listingId, uint256[] calldata orderIds) external nonReentrant {
        Listing storage l = listings[listingId];
        require(l.seller == msg.sender, "Bukan seller");
        require(l.status == ListingStatus.ACTIVE, "Listing tidak aktif");

        l.status = ListingStatus.CANCELLED;
        l.stock = 0;
        emit ListingCancelled(listingId);

        for (uint256 i = 0; i < orderIds.length; i++) {
            require(orders[orderIds[i]].listingId == listingId, "Order bukan milik listing");
            _cancel(orderIds[i]);
        }
    }

    function markShipped(uint256 orderId) external {
        Order storage o = orders[orderId];
        require(o.seller == msg.sender, "Bukan seller");
        require(o.status == OrderStatus.PAID_HELD, "Status salah");

        o.status = OrderStatus.SHIPPED;
        emit OrderStatusChanged(orderId, OrderStatus.SHIPPED);
    }

    // ---------- Buyer ----------

    function buyItem(uint256 listingId, uint256 quantity) external payable returns (uint256 id) {
        Listing storage l = listings[listingId];
        require(l.status == ListingStatus.ACTIVE, "Listing tidak aktif");
        require(msg.sender != l.seller, "Tidak bisa beli sendiri");
        require(quantity > 0 && quantity <= l.stock, "Stok tidak cukup");

        uint256 total = l.price * quantity;
        require(msg.value == total, "ETH tidak sesuai");

        l.stock -= quantity;

        id = ++orderCount;
        orders[id] = Order(listingId, msg.sender, l.seller, quantity, total, OrderStatus.PAID_HELD);
        emit ItemBought(id, listingId, msg.sender, quantity, total);
        emit OrderStatusChanged(id, OrderStatus.PAID_HELD);
    }

    /// Buyer konfirmasi item diterima -> dana cair ke seller.
    function confirmDelivery(uint256 orderId) external nonReentrant {
        Order storage o = orders[orderId];
        require(o.buyer == msg.sender, "Bukan buyer");
        require(o.status == OrderStatus.SHIPPED, "Status salah");

        o.status = OrderStatus.COMPLETED;
        emit OrderStatusChanged(orderId, OrderStatus.COMPLETED);

        (bool ok, ) = o.seller.call{value: o.amount}("");
        require(ok, "Transfer gagal");
    }

    // ---------- Cancel ----------

    /// Batalkan order sebelum dikirim (buyer atau seller) -> refund otomatis.
    function cancelOrder(uint256 orderId) external nonReentrant {
        Order storage o = orders[orderId];
        require(msg.sender == o.buyer || msg.sender == o.seller, "Tidak berwenang");
        _cancel(orderId);
    }

    function _cancel(uint256 orderId) internal {
        Order storage o = orders[orderId];
        require(o.status == OrderStatus.PAID_HELD, "Status salah");

        o.status = OrderStatus.CANCELLED;
        emit OrderStatusChanged(orderId, OrderStatus.CANCELLED);

        Listing storage l = listings[o.listingId];
        if (l.status == ListingStatus.ACTIVE) l.stock += o.quantity; // kembalikan stok

        (bool ok, ) = o.buyer.call{value: o.amount}("");
        require(ok, "Refund gagal");
    }
}
