import express from "express";
import rateLimit from "express-rate-limit";
import passport from "../config/passport.js";
import { verifyRecaptcha } from "../middleware/recaptcha.middleware.js";
import {
  register,
  login,
  handleOAuthCallback,
  generate2FA,
  verify2FA,
  verifyOAuth2FA,
  verifyAdminTOTP,
  disable2FA,
  getMe,
} from "../controllers/auth.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Trop de tentatives. Réessayez dans 15 minutes.",
  },
});

const FRONTEND_URL = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

const GOOGLE_AUTH_OPTIONS = {
  scope: ["profile", "email"],
  prompt: "select_account",
};

router.get("/me", verifyToken, getMe);
router.post("/register", verifyRecaptcha, register);
router.post("/login", loginLimiter, verifyRecaptcha, login);

router.get("/2fa/generate", verifyToken, generate2FA);
router.post("/2fa/verify", verifyToken, verify2FA);
router.post("/2fa/verify-oauth", verifyOAuth2FA);
router.post("/2fa/disable", verifyToken, disable2FA);

router.post("/admin/verify-totp", verifyToken, verifyAdminTOTP);

router.get("/google", passport.authenticate("google", GOOGLE_AUTH_OPTIONS));
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${FRONTEND_URL}/?authError=google_failed`,
    session: false,
  }),
  handleOAuthCallback,
);

router.get("/github", passport.authenticate("github", { scope: ["user:email"] }));
router.get(
  "/github/callback",
  passport.authenticate("github", {
    failureRedirect: `${FRONTEND_URL}/?authError=github_failed`,
    session: false,
  }),
  handleOAuthCallback,
);

export default router;
