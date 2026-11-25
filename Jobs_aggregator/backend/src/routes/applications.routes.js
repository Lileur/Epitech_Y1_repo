import express from "express";
import { verifyToken, requireRole } from "../middleware/auth.middleware.js";
import {
  applyToJob,
  getMyApplications,
  previewResume,
} from "../controllers/applications.controller.js";

const router = express.Router();

router.get("/me", verifyToken, requireRole("candidate"), getMyApplications);
router.post("/preview-resume", verifyToken, requireRole("candidate"), previewResume);
router.post("/", verifyToken, requireRole("candidate"), applyToJob);

export default router;
