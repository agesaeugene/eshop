import express, { Router } from "express";
import { createDiscountCodes, createProduct, createSellerEvent, deleteDiscountCode, deleteProduct, deleteProductImage, followShop, getAllEvents, getAllProducts, getCategories, getDiscountCodes, getFilteredEvents, getFilteredProducts, getFilteredShops, getLayout, getProductDetails, getSellerEvents, getSellerReviews, getShopById, getShopProducts, getShopPublicEvents, getShopPublicProducts, isFollowingShop, restoreProduct, reviewSellerEvent, searchProducts, topShops, unfollowShop, uploadProductImage } from "../controllers/product.controller";
import isAuthenticated from "@packages/middleware/isAuthenticated";
import { isAdmin, isSeller } from "@packages/middleware/authorizeRoles";
import { isAdminAuthenticated } from "@packages/middleware/isAuthenticated";

const router: Router = express.Router();

router.get("/get-categories", getCategories);
router.post("/create-discount-code", isAuthenticated, isSeller, createDiscountCodes);
router.get("/get-discount-codes", isAuthenticated, isSeller, getDiscountCodes);
router.delete("/delete-discount-code/:id", isAuthenticated, isSeller, deleteDiscountCode);
router.post("/upload-product-image", isAuthenticated, isSeller, uploadProductImage);
router.delete("/delete-product-image", isAuthenticated, isSeller, deleteProductImage);
router.post("/create-product", isAuthenticated, isSeller, createProduct);
router.post("/create-event", isAuthenticated, isSeller, createSellerEvent);
router.get("/get-seller-events", isAuthenticated, isSeller, getSellerEvents);
router.get("/get-seller-reviews", isAuthenticated, isSeller, getSellerReviews);
router.put("/admin/events/:productId/status", isAdminAuthenticated, isAdmin, reviewSellerEvent);
router.get("/get-shop-products", isAuthenticated, isSeller, getShopProducts);
router.delete("/delete-product/:productId", isAuthenticated, isSeller, deleteProduct);
router.put("/restore-product/:productId", isAuthenticated, isSeller, restoreProduct);
router.get("/get-all-products", getAllProducts);
router.get("/get-product/:slug", getProductDetails)
router.get("/get-filtered-products", getFilteredProducts);
router.get("/get-filtered-offers", getFilteredEvents);
router.get("/get-filtered-shops", getFilteredShops);
router.get("/search-products", searchProducts);
router.get("/top-shops", topShops);
router.get("/get-all-events", getAllEvents);
router.get("/get-layout", getLayout);

router.get("/get-shop/:id", getShopById);
router.get("/shop-products/:shopId", getShopPublicProducts);
router.get("/shop-events/:shopId", getShopPublicEvents);
router.get("/is-following/:shopId", isAuthenticated, isFollowingShop);
router.post("/follow-shop", isAuthenticated, followShop);
router.post("/unfollow-shop", isAuthenticated, unfollowShop);

export default router;