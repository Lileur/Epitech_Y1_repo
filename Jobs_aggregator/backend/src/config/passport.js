import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import db from "./db.js";

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

/** URL publique du backend (obligatoire pour OAuth — pas de chemin relatif). */
const apiPublicUrl = (process.env.API_PUBLIC_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);

function oauthCallback(path, envOverride) {
  if (envOverride) return envOverride;
  return `${apiPublicUrl}${path}`;
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: oauthCallback(
          "/api/auth/google/callback",
          process.env.GOOGLE_CALLBACK_URL,
        ),
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email =
            profile.emails?.[0]?.value || `${profile.id}@google.user`;
          const [rows] = await db.execute(
            "SELECT * FROM users WHERE google_id = ? OR email = ?",
            [profile.id, email],
          );
          let user = rows[0];

          if (!user) {
            const firstName =
              profile.name?.givenName || profile.displayName || "Utilisateur";
            const lastName = profile.name?.familyName || "Google";

            const [result] = await db.execute(
              `INSERT INTO users (first_name, last_name, email, google_id, role, search_type) VALUES (?, ?, ?, ?, 'candidate', 'both')`,
              [firstName, lastName, email, profile.id],
            );
            const [newRows] = await db.execute(
              "SELECT * FROM users WHERE id = ?",
              [result.insertId],
            );
            user = newRows[0];
          } else if (!user.google_id) {
            await db.execute("UPDATE users SET google_id = ? WHERE id = ?", [
              profile.id,
              user.id,
            ]);
          }

          done(null, user);
        } catch (err) {
          done(err);
        }
      },
    ),
  );
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: oauthCallback(
          "/api/auth/github/callback",
          process.env.GITHUB_CALLBACK_URL,
        ),
        scope: ["user:email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email =
            profile.emails?.[0]?.value || `${profile.username}@github.user`;
          const [rows] = await db.execute(
            "SELECT * FROM users WHERE github_id = ? OR email = ?",
            [profile.id, email],
          );
          let user = rows[0];

          if (!user) {
            const nameParts = (
              profile.displayName ||
              profile.username ||
              "Utilisateur GitHub"
            ).split(" ");
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(" ") || "GitHub";

            const [result] = await db.execute(
              `INSERT INTO users (first_name, last_name, email, github_id, role, search_type) VALUES (?, ?, ?, ?, 'candidate', 'both')`,
              [firstName, lastName, email, profile.id],
            );
            const [newRows] = await db.execute(
              "SELECT * FROM users WHERE id = ?",
              [result.insertId],
            );
            user = newRows[0];
          } else if (!user.github_id) {
            await db.execute("UPDATE users SET github_id = ? WHERE id = ?", [
              profile.id,
              user.id,
            ]);
          }

          done(null, user);
        } catch (err) {
          done(err);
        }
      },
    ),
  );
}

export default passport;
