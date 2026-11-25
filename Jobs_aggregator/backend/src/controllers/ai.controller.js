import { recommendJobs } from "../AI/AIfeatures.js";
import { filterAndSortJobs } from "../AI/Filterandsort.js";
import { collectFromWeLoveDevs } from "../AI/DataCollect.js";

export async function getRecommendedJobs(req, res) {
  try {
    const targetJobId = req.params.id;
    if (!targetJobId) {
      return res.status(400).json({ error: "Invalid job id" });
    }

    const db = req.app.locals.db;
    const recommendations = await recommendJobs(targetJobId, db);
    return res.json({ success: true, data: recommendations });
  } catch (error) {
    console.error("AI recommendation error:", error);
    return res.status(500).json({ error: "Failed to compute recommendations" });
  }
}

export async function getFilteredJobs(req, res) {
  try {
    const db = req.app.locals.db;
    const jobs = await filterAndSortJobs(req.query, db);
    return res.json({ success: true, data: jobs });
  } catch (error) {
    console.error("AI filter/sort error:", error);
    return res.status(500).json({ error: "Failed to filter jobs" });
  }
}

export async function previewExternalCollection(req, res) {
  try {
    const apiKey = process.env.WLD_API_KEY;
    if (!apiKey) {
      return res
        .status(400)
        .json({ error: "WLD_API_KEY is missing in environment" });
    }

    const normalizedOffers = await collectFromWeLoveDevs(apiKey);
    return res.json({
      success: true,
      count: normalizedOffers.length,
      data: normalizedOffers.slice(0, 20),
    });
  } catch (error) {
    console.error("AI data collect error:", error);
    return res.status(500).json({ error: "Failed to collect offers" });
  }
}
