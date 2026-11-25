import "dotenv/config";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";
import session from "express-session";
import db from "./config/db.js";
import passport from "./config/passport.js";
import indexRouter from "./routes/index.routes.js";
import { securityMetricsMiddleware } from "./services/security-metrics.service.js";
import { notFoundHandler } from "./middleware/notFound.middleware.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { runStartupMigrations } from "./db/migrations.js";

export { db as sql };

const app = express();

app.locals.db = db;

app.get("/", (req, res) => {
  res.json({ message: "JobSense API is running" });
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
    credentials: true,
  }),
);

app.use((req, res, next) => {
  console.log('Incoming request:', req.method, req.url);
  next();
});

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);

app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "15mb" }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecret_fallback",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === "production", httpOnly: true, sameSite: 'lax' },
  }),
);

app.use(passport.initialize());
app.use(passport.session());
app.use(securityMetricsMiddleware);

app.use("/api", indexRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await runStartupMigrations(db);
    console.log("Migrations base de données appliquées.");
  } catch (err) {
    console.error("Échec migrations DB:", err.message);
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

void start();

export default app;
