import { Router } from "express";
import { authController } from "../controllers/authController";
import { requireAuth } from "../middleware/authMiddleware";
import {
  createAuthRouterLimiter,
  createForgotPasswordLimiter,
  createResendVerificationLimiter,
  createSignInLimiter,
  createSignUpLimiter,
} from "../middleware/rateLimiter";

const router = Router();

// Baseline limiter for every route under /api/auth, plus tighter,
// purpose-specific limiters on the routes most attractive to abuse.
router.use(createAuthRouterLimiter());

router.post("/sign-up", createSignUpLimiter(), authController.signUp);
router.post("/sign-in", createSignInLimiter(), authController.signIn);
router.post("/refresh", authController.refresh);
router.post("/sign-out", authController.signOut);
router.post("/sign-out-all", requireAuth, authController.signOutAllDevices);
router.get("/user", requireAuth, authController.getCurrentUser);

router.post("/verify-email", authController.verifyEmail);
router.post(
  "/resend-verification",
  requireAuth,
  createResendVerificationLimiter(),
  authController.resendVerification
);
router.post("/forgot-password", createForgotPasswordLimiter(), authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

export default router;
