import axios from "axios";

const GOOGLE_TEST_SECRET = "6LeIxAcTAAAAAGG-vFI1TnRWxM4CJU7Iqi";

export async function verifyRecaptcha(req, res, next) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;

  if (!secret) {
    return next();
  }

  const token = req.body?.recaptchaToken;

  // Dev / clés de test Google : ne pas bloquer login & register
  const relaxed =
    process.env.RECAPTCHA_RELAXED === "1" ||
    process.env.NODE_ENV !== "production" ||
    secret === GOOGLE_TEST_SECRET;

  if (!token || typeof token !== "string" || token.trim() === "") {
    if (relaxed) {
      return next();
    }
    return res.status(400).json({
      success: false,
      message: "Vérification anti-robot requise.",
    });
  }

  try {
    const params = new URLSearchParams();
    params.append("secret", secret);
    params.append("response", token);

    const { data } = await axios.post(
      "https://www.google.com/recaptcha/api/siteverify",
      params.toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 8000 },
    );

    if (!data.success) {
      if (relaxed) {
        console.warn("reCAPTCHA échec ignoré (mode relaxed):", data["error-codes"]);
        return next();
      }
      return res.status(400).json({
        success: false,
        message: "Échec de la vérification anti-robot.",
      });
    }

    if (typeof data.score === "number" && data.score < 0.35 && !relaxed) {
      return res.status(400).json({
        success: false,
        message: "Score de confiance trop faible. Réessaie.",
      });
    }

    next();
  } catch (err) {
    console.error("reCAPTCHA verify error:", err.message);
    if (relaxed) return next();
    return res.status(503).json({
      success: false,
      message: "Service de vérification indisponible.",
    });
  }
}
