import express, { Router } from "express";
import { createDiscountCodes, deleteDiscountCode, getCategories, getDiscountCodes } from "../controllers/product.controller";
import isAuthenticated from "@packages/middleware/isAuthenticated";
import { isSeller } from "@packages/middleware/authorizeRole";

const router: Router = express.Router();

router.get("/get-categories", getCategories);
router.post("/create-discount-code", isAuthenticated, isSeller, createDiscountCodes);
router.get("/get-discount-codes", isAuthenticated, isSeller, getDiscountCodes);
router.delete("/delete-discount-code/:id", isAuthenticated, isSeller, deleteDiscountCode);

export default router;