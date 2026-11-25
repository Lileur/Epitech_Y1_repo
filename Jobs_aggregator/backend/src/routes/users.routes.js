import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import {
  getProfile,
  saveProfile,
  getSavedJobs,
  addSavedJob,
  removeSavedJob,
} from "../controllers/users.controller.js";

const router = express.Router();

router.get("/me/profile", verifyToken, getProfile);
router.put("/me/profile", verifyToken, saveProfile);

router.get("/me/saved-jobs", verifyToken, getSavedJobs);
router.post("/me/saved-jobs", verifyToken, addSavedJob);
router.delete("/me/saved-jobs/:jobId", verifyToken, removeSavedJob);

export default router;
