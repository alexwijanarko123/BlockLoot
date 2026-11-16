// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SimpleGameMarketplace is AccessControl, ReentrancyGuard {
    bytes32 public constant SELLER_ROLE = keccak256("SELLER_ROLE");

    enum Role { BUYER, SELLER, ADMIN }
    enum ListingStatus { NONE, ACTIVE, CANCELLED }
    enum OrderStatus { NONE, PAID_HELD, SHIPPED, COMPLETED, CANCELLED }

    struct Listing {
        address seller;
        uint256 price;
        uint256 stock;
        ListingStatus status;
        string metadataURI;
    }

    struct Order {
        uint256 listingId;
        address buyer;
        address seller;
        uint256 quantity;
        uint256 amount;
        OrderStatus status;
    }

    uint256 public listingCount;
    uint256 public orderCount;
    mapping(uint256 => Listing) private listings;
    mapping(uint256 => Order) private orders;

    event ItemListed(uint256 indexed listingId, address indexed seller, uint256 price, uint256 stock, string metadataURI);
    event ListingUpdated(uint256 indexed listingId, uint256 price, uint256 stock, string metadataURI);
    event ListingCancelled(uint256 indexed listingId);
    event ItemBought(uint256 indexed orderId, uint256 indexed listingId, address indexed buyer, uint256 quantity, uint256 amount);
    event OrderStatusChanged(uint256 indexed orderId, OrderStatus status);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function getUserRole(address user) external view returns (Role) {
        if (hasRole(DEFAULT_ADMIN_ROLE, user)) return Role.ADMIN;
        if (hasRole(SELLER_ROLE, user)) return Role.SELLER;
        return Role.BUYER;
    }

    function addSeller(address user) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(SELLER_ROLE, user);
    }

    function removeSeller(address user) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(SELLER_ROLE, user);
    }

    function getListing(uint256 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }

    function getOrder(uint256 orderId) external view returns (Order memory) {
        return orders[orderId];
    }

    function listItem(string calldata metadataURI, uint256 price, uint256 stock)
        external
        onlyRole(SELLER_ROLE)
        returns (uint256 id)
    {
        require(price > 0 && stock > 0, "Harga/stok tidak valid");
        require(bytes(metadataURI).length > 0, "Metadata kosong");

        id = ++listingCount;
        listings[id] = Listing(msg.sender, price, stock, ListingStatus.ACTIVE, metadataURI);
        emit ItemListed(id, msg.sender, price, stock, metadataURI);
    }

    function updateListing(uint256 listingId, uint256 price, uint256 stock, string calldata metadataURI)
        external
        onlyRole(SELLER_ROLE)
    {
        Listing storage l = listings[listingId];
        require(l.seller == msg.sender, "Bukan seller");
        require(l.status == ListingStatus.ACTIVE, "Listing tidak aktif");
        require(price > 0, "Harga tidak valid");
        require(bytes(metadataURI).length > 0, "Metadata kosong");

        l.price = price;
        l.stock = stock;
        l.metadataURI = metadataURI;
        emit ListingUpdated(listingId, price, stock, metadataURI);
    }

    function delistItem(uint256 listingId, uint256[] calldata orderIds) external nonReentrant {
        Listing storage l = listings[listingId];
        require(l.seller == msg.sender || hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Tidak berwenang");
        require(l.status == ListingStatus.ACTIVE, "Listing tidak aktif");

        l.status = ListingStatus.CANCELLED;
        l.stock = 0;
        emit ListingCancelled(listingId);

        for (uint256 i = 0; i < orderIds.length; i++) {
            require(orders[orderIds[i]].listingId == listingId, "Order bukan milik listing");
            _cancel(orderIds[i]);
        }
    }

    function buyItem(uint256 listingId, uint256 quantity) external payable returns (uint256 id) {
        Listing storage l = listings[listingId];
        require(l.status == ListingStatus.ACTIVE, "Listing tidak aktif");
        require(hasRole(SELLER_ROLE, l.seller), "Seller tidak aktif");
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

    function markShipped(uint256 orderId) external {
        Order storage o = orders[orderId];
        require(o.seller == msg.sender, "Bukan seller");
        require(o.status == OrderStatus.PAID_HELD, "Status salah");

        o.status = OrderStatus.SHIPPED;
        emit OrderStatusChanged(orderId, OrderStatus.SHIPPED);
    }

    function confirmDelivery(uint256 orderId) external nonReentrant {
        Order storage o = orders[orderId];
        require(o.buyer == msg.sender, "Bukan buyer");
        require(o.status == OrderStatus.SHIPPED, "Status salah");

        o.status = OrderStatus.COMPLETED;
        emit OrderStatusChanged(orderId, OrderStatus.COMPLETED);

        (bool ok, ) = o.seller.call{value: o.amount}("");
        require(ok, "Transfer gagal");
    }

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
        if (l.status == ListingStatus.ACTIVE) l.stock += o.quantity;

        (bool ok, ) = o.buyer.call{value: o.amount}("");
        require(ok, "Refund gagal");
    }
}
