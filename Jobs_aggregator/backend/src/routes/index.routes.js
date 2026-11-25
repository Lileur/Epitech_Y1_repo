import express from 'express';
import authRoutes from './auth.routes.js';
import jobsRoutes from './jobs.routes.js';
import adminRoutes from './admin.routes.js';
import aiRoutes from "./ai.routes.js";
import applicationsRoutes from "./applications.routes.js";
import usersRoutes from "./users.routes.js";

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/jobs', jobsRoutes);
router.use('/users', usersRoutes);
router.use('/applications', applicationsRoutes);
router.use('/admin', adminRoutes);
router.use("/ai", aiRoutes);

export default router;
