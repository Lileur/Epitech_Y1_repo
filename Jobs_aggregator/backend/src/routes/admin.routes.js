import express from "express";
import {
  getSecurityMetrics,
  getUsers,
  updateUserStatus,
  deleteUser,
  promoteUser,
  getAdminJobs,
  updateJobModeration,
  deleteAdminJob,
} from "../controllers/admin.controller.js";
import { verifyToken, requireRole } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { z } from "zod";

const router = express.Router();

const adminOnly = [verifyToken, requireRole("admin")];

const UpdateUserStatusSchema = z.object({
  status: z.enum(["active", "suspended", "banned"]),
});

const UpdateJobModerationSchema = z.object({
  status: z.enum(["published", "pending", "hidden", "rejected"]),
  note: z.string().max(500).optional(),
});

const PromoteSchema = z.object({
  token2fa: z.string().min(6).max(8),
});

router.get("/security-metrics", ...adminOnly, getSecurityMetrics);
router.get("/users", ...adminOnly, getUsers);
router.put("/users/:id/status", ...adminOnly, validateBody(UpdateUserStatusSchema), updateUserStatus);
router.post("/users/:id/promote", ...adminOnly, validateBody(PromoteSchema), promoteUser);
router.delete("/users/:id", ...adminOnly, deleteUser);

router.get("/jobs", ...adminOnly, getAdminJobs);
router.patch("/jobs/:id/moderation", ...adminOnly, validateBody(UpdateJobModerationSchema), updateJobModeration);
router.delete("/jobs/:id", ...adminOnly, deleteAdminJob);

export default router;
