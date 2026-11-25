import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import crypto from "crypto";
import nodemailer from "nodemailer";

const RegisterSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),

  role: z.enum(["candidate", "recruiter"]),
  searchType: z.enum(["internship", "job", "both"]).nullable().optional(),
  company: z.string().max(200).optional(),
  jobTitle: z.string().max(200).optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  token2fa: z.string().optional(),
});

const SECURITY_TIMING_HASH = process.env.SECURITY_TIMING_HASH || bcrypt.hashSync(crypto.randomUUID ? crypto.randomUUID() : "secure_random_fallback", 12);


function normaliseEmail(email) {
  return email.trim().toLowerCase();
}

function createAuthToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("FATAL: JWT_SECRET est manquant dans l'environnement.");
  }
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      first_name: user.firstName,
      last_name: user.lastName,
      search_type: user.searchType,
      company: user.company,
      job_title: user.jobTitle,
      two_factor_enabled: !!user.two_factor_enabled,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );
}

function toPublicUser(user) {
  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    role: user.role,
    searchType: user.search_type,
    company: user.company,
    jobTitle: user.job_title,
    two_factor_enabled: !!user.two_factor_enabled,
  };
}

export async function getMe(req, res) {
  try {
    const db = req.app.locals.db;
    const [rows] = await db.execute(
      "SELECT id, first_name, last_name, email, role, search_type, company, job_title, two_factor_enabled FROM users WHERE id = ?",
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
    return res.json({ success: true, user: toPublicUser(rows[0]) });
  } catch (err) {
    console.error("getMe error:", err);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
}

export async function register(req, res) {
  try {
    const db = req.app.locals.db;
    const data = RegisterSchema.parse(req.body);

    const email = normaliseEmail(data.email);

    const [existing] = await db.execute(
      "SELECT id FROM users WHERE email = ?",
      [email],
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Un compte existe déjà avec cet email.",
      });
    }

    const [banned] = await db.execute(
      "SELECT email FROM banned_emails WHERE email = ?",
      [email]
    );

    if (banned.length > 0) {
      return res.status(403).json({
        success: false,
        message: "Cette adresse email n'est pas autorisée à s'inscrire.",
      });
    }

    if (data.role === "candidate") {
      const validSearchType = data.searchType ?? "both";

      if (!["internship", "job", "both"].includes(validSearchType)) {
        return res.status(400).json({
          success: false,
          message: "Type de recherche invalide.",
        });
      }
    }

    if (data.role === "recruiter" && !data.company?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Le nom de l'entreprise est obligatoire pour un recruteur.",
      });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const searchType =
      data.role === "candidate" ? (data.searchType ?? "both") : null;

    const company =
      data.role === "recruiter" ? (data.company?.trim() ?? null) : null;

    const jobTitle =
      data.role === "recruiter" ? (data.jobTitle?.trim() ?? null) : null;

    const [result] = await db.execute(
      `INSERT INTO users
       (first_name, last_name, email, password_hash, role, search_type, company, job_title)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.firstName.trim(),
        data.lastName.trim(),
        email,
        passwordHash,
        data.role,
        searchType,
        company,
        jobTitle,
      ],
    );

    const [newRows] = await db.execute(
      `SELECT
        id,
        first_name,
        last_name,
        email,
        role,
        search_type,
        company,
        job_title,
        created_at
       FROM users
       WHERE id = ?`,
      [result.insertId],
    );

    const user = newRows[0];
    const publicUser = toPublicUser(user);
    const token = createAuthToken(publicUser);

    return res.status(201).json({
      success: true,
      message: "Compte créé avec succès.",
      token,
      user: publicUser,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Données invalides.",
        details: err.errors,
      });
    }

    console.error("Register error:", err);

    return res.status(500).json({
      success: false,
      message: "Erreur serveur.",
    });
  }
}

export async function login(req, res) {
  try {
    const db = req.app.locals.db;
    const data = LoginSchema.parse(req.body);

    const email = normaliseEmail(data.email);

    const [rows] = await db.execute(
      `SELECT
        id,
        first_name,
        last_name,
        email,
        password_hash,
        role,
        search_type,
        company,
        job_title,
        two_factor_enabled,
        two_factor_secret,
        status
       FROM users
       WHERE email = ?`,
      [email],
    );

    const user = rows[0];

    const passwordMatch = user
      ? await bcrypt.compare(data.password, user.password_hash || SECURITY_TIMING_HASH)
      : await bcrypt.compare(data.password, SECURITY_TIMING_HASH);

    if (!user || !passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Email ou mot de passe incorrect.",
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: "Votre compte a été suspendu par un administrateur.",
      });
    }

    if (user.status === 'banned') {
      return res.status(403).json({
        success: false,
        message: "Votre compte a été banni définitivement.",
      });
    }

    if (!["candidate", "recruiter", "admin"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Rôle non autorisé.",
      });
    }

    if (user.two_factor_enabled) {
      if (!data.token2fa) {
        return res.json({
          success: true,
          require2FA: true,
          message: "Code 2FA requis.",
        });
      }

      const isValid = speakeasy.totp.verify({
        secret: user.two_factor_secret,
        encoding: 'base32',
        token: data.token2fa,
        window: 1
      });

      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: "Code 2FA invalide.",
        });
      }
    }

    const publicUser = toPublicUser(user);
    const token = createAuthToken(publicUser);

    return res.json({
      success: true,
      message: "Connexion réussie.",
      token,
      user: publicUser,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Données invalides.",
        details: err.errors,
      });
    }

    console.error("Login error:", err);

    return res.status(500).json({
      success: false,
      message: "Erreur serveur.",
    });
  }
}

export function handleOAuthCallback(req, res) {
  const frontendUrl = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

  console.log('OAuth callback - User:', req.user);

  if (!req.user) {
    console.log('OAuth callback - No user found');
    return res.redirect(`${frontendUrl}/?authError=oauth_failed`);
  }

  if (req.user.status === "suspended") {
    console.log('OAuth callback - Account suspended');
    return res.redirect(`${frontendUrl}/?authError=account_suspended`);
  }

  if (req.user.status === "banned") {
    console.log('OAuth callback - Account banned');
    return res.redirect(`${frontendUrl}/?authError=account_banned`);
  }

  if (!process.env.JWT_SECRET) {
    throw new Error("FATAL: JWT_SECRET est manquant dans l'environnement.");
  }

  const {
    password_hash,
    google_id,
    github_id,
    two_factor_secret,
    two_factor_enabled,
    ...rawUser
  } = req.user;

  console.log('OAuth callback - Raw user:', rawUser);

  if (two_factor_enabled) {
    const tempToken = jwt.sign(
      { id: rawUser.id, email: rawUser.email, require2FA: true },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );
    console.log('OAuth callback - 2FA required, redirecting with temp token');
    return res.redirect(`${frontendUrl}/?oauth2fa=${tempToken}`);
  }

  const token = jwt.sign(
    {
      id: rawUser.id,
      email: rawUser.email,
      role: rawUser.role,
      first_name: rawUser.first_name,
      last_name: rawUser.last_name,
      search_type: rawUser.search_type,
      company: rawUser.company,
      job_title: rawUser.job_title,
      two_factor_enabled: !!rawUser.two_factor_enabled,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

  console.log('OAuth callback - Redirecting with token:', token);
  return res.redirect(`${frontendUrl}/?token=${token}`);
}

export async function generate2FA(req, res) {
  try {
    const db = req.app.locals.db;
    const userId = req.user.id;

    const secretData = speakeasy.generateSecret({ 
      name: `JobSense (${req.user.email})` 
    });
    
    await db.execute(
      "UPDATE users SET two_factor_secret = ? WHERE id = ?",
      [secretData.base32, userId]
    );

    const qrCodeUrl = await qrcode.toDataURL(secretData.otpauth_url);

    res.json({
      success: true,
      secret: secretData.base32,
      qrCodeUrl,
    });
  } catch (err) {
    console.error("Erreur generate2FA:", err);
    res.status(500).json({ success: false, message: "Erreur serveur." });
  }
}

export async function verify2FA(req, res) {
  try {
    const db = req.app.locals.db;
    const userId = req.user.id;
    const { token } = req.body;

    const [rows] = await db.execute(
      "SELECT two_factor_secret FROM users WHERE id = ?",
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Utilisateur non trouvé." });
    }

    const user = rows[0];

    const isValid = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: token,
      window: 1
    });

    if (isValid) {
      await db.execute(
        "UPDATE users SET two_factor_enabled = TRUE WHERE id = ?",
        [userId]
      );
      res.json({ success: true, message: "2FA activé avec succès." });
    } else {
      res.status(400).json({ success: false, message: "Code invalide." });
    }
  } catch (err) {
    console.error("Erreur verify2FA:", err);
    res.status(500).json({ success: false, message: "Erreur serveur." });
  }
}

export async function verifyOAuth2FA(req, res) {
  try {
    const db = req.app.locals.db;
    const { tempToken, token } = req.body;

    if (!tempToken || !token) {
      return res.status(400).json({ success: false, message: "Données manquantes." });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("FATAL: JWT_SECRET est manquant dans l'environnement.");
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: "Token temporaire invalide ou expiré." });
    }

    if (!decoded.require2FA) {
      return res.status(400).json({ success: false, message: "Token invalide." });
    }

    const [rows] = await db.execute(
      `SELECT id, first_name, last_name, email, role, search_type, company, job_title, two_factor_secret
       FROM users WHERE id = ?`,
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Utilisateur non trouvé." });
    }

    const user = rows[0];

    const isValid = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: token,
      window: 1
    });

    if (!isValid) {
      return res.status(401).json({ success: false, message: "Code 2FA invalide." });
    }

    const fullToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        search_type: user.search_type,
        company: user.company,
        job_title: user.job_title,
        two_factor_enabled: user.two_factor_enabled,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      token: fullToken,
      user: toPublicUser(user),
    });

  } catch (err) {
    console.error("Erreur verifyOAuth2FA:", err);
    res.status(500).json({ success: false, message: "Erreur serveur." });
  }
}

export async function disable2FA(req, res) {
  try {
    const db = req.app.locals.db;
    const userId = req.user.id;
    
    await db.execute(
      "UPDATE users SET two_factor_enabled = FALSE, two_factor_secret = NULL WHERE id = ?",
      [userId]
    );

    res.json({ success: true, message: "A2F désactivé avec succès." });
  } catch (error) {
    console.error("Erreur disable2FA:", error);
    res.status(500).json({ success: false, message: "Erreur serveur." });
  }
}

export const verifyAdminTOTP = async (req, res) => {
  try {
    const { token } = req.body;
    const db = req.app.locals.db;

    const [rows] = await db.execute(
      'SELECT id, first_name, last_name, email, role, two_factor_secret, two_factor_enabled FROM users WHERE id = ?',
      [req.user.id]
    );
    const dbUser = rows[0];
    
    if (!dbUser || dbUser.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Accès refusé. Réservé aux administrateurs." });
    }

    if (!dbUser.two_factor_enabled || !dbUser.two_factor_secret) {
      return res.status(400).json({ success: false, message: "La double authentification n'est pas activée sur ce compte." });
    }

    const isValid = speakeasy.totp.verify({
      secret: dbUser.two_factor_secret,
      encoding: 'base32',
      token: token,
      window: 1
    });

    if (!isValid) {
      return res.status(401).json({ success: false, message: "Code A2F invalide." });
    }

    const adminToken = jwt.sign(
      { id: req.user.id, role: 'admin', adminSession: true },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: "2h" }
    );

    res.json({
      success: true,
      token: adminToken,
      user: {
        id: dbUser.id,
        firstName: dbUser.first_name,
        lastName: dbUser.last_name,
        email: dbUser.email,
        role: 'admin'
      }
    });
  } catch (error) {
    console.error("Admin pin error:", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};