import express from "express";
import {
  getAllJobs,
  getJobById,
  getJobsCatalog,
  syncJobsFromWeLoveDevs,
} from "../controllers/jobs.controller.js";

const router = express.Router();

router.get("/", getAllJobs);
router.get("/catalog/all", getJobsCatalog);
router.post("/sync", syncJobsFromWeLoveDevs);
router.get("/:id", getJobById);

export default router;
