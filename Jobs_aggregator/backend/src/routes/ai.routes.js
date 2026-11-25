import express from "express";
import {
  getFilteredJobs,
  getRecommendedJobs,
  previewExternalCollection,
} from "../controllers/ai.controller.js";

const router = express.Router();

router.get("/recommendations/:id", getRecommendedJobs);
router.get("/search", getFilteredJobs);
router.get("/collect-preview", previewExternalCollection);

export default router;
