import { isAdmin } from "@packages/middleware/authorizeRoles";
import { isAdminAuthenticated } from "@packages/middleware/isAuthenticated";
import express, { Router } from "express";
import {
    addCustomizationCategory,
    addCustomizationSubCategory,
    addNewAdmin,
    banUser,
    getAdminAccountActivity,
    getAdminDashboardStats,
    getAllAdmins,
    getAllCustomizations,
    getAllEvents,
    getAllProducts,
    getAllSellers,
    getAllUsers,
    uploadSiteCustomization,
} from "../controllers/admin.controller";
import { getAdminSettings, updateAdminSettings } from "../controllers/admin-settings.controller";
import {
    getAdminNotifications,
    markAdminNotificationRead,
    markAllAdminNotificationsRead,
} from "../controllers/notification.controller";

const router: Router = express.Router();

router.get("/dashboard-stats", isAdminAuthenticated, isAdmin, getAdminDashboardStats);
router.get("/account-activity", isAdminAuthenticated, isAdmin, getAdminAccountActivity);
router.get("/get-all-products", isAdminAuthenticated, isAdmin, getAllProducts);
router.get("/get-all-events", isAdminAuthenticated, isAdmin, getAllEvents);
router.get("/get-all-admins", isAdminAuthenticated, isAdmin, getAllAdmins);
router.put("/add-new-admin", isAdminAuthenticated, isAdmin, addNewAdmin);
router.get("/get-all-customizations", isAdminAuthenticated, isAdmin, getAllCustomizations);
router.post("/add-category", isAdminAuthenticated, isAdmin, addCustomizationCategory);
router.post("/add-subcategories", isAdminAuthenticated, isAdmin, addCustomizationSubCategory);
router.post("/upload-logo", isAdminAuthenticated, isAdmin, uploadSiteCustomization);
router.post("/upload-banner", isAdminAuthenticated, isAdmin, uploadSiteCustomization);
router.get("/get-all-users", isAdminAuthenticated, isAdmin, getAllUsers);
router.get("/get-all-sellers", isAdminAuthenticated, isAdmin, getAllSellers);
router.put("/ban-user/:id", isAdminAuthenticated, isAdmin, banUser);
router.get("/settings", isAdminAuthenticated, isAdmin, getAdminSettings);
router.put("/settings", isAdminAuthenticated, isAdmin, updateAdminSettings);
router.get("/notifications", isAdminAuthenticated, isAdmin, getAdminNotifications);
router.put("/notifications/mark-all-read", isAdminAuthenticated, isAdmin, markAllAdminNotificationsRead);
router.put("/notifications/:id/read", isAdminAuthenticated, isAdmin, markAdminNotificationRead);

export default router;