const MAX_EVENTS = 6000;
const BUCKET_MS = 3000;
const TRAFFIC_BUCKETS = 20;

const state = {
  startedAt: Date.now(),
  totalRequests: 0,
  events: [],
  buckets: [],
};

const normalizePath = (originalUrl = "") => {
  const [path] = originalUrl.split("?");
  return path || "/";
};

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
};

const toNum = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getBucket = (timestamp) => {
  const ts = Math.floor(timestamp / BUCKET_MS) * BUCKET_MS;
  const last = state.buckets[state.buckets.length - 1];
  if (!last || last.ts !== ts) {
    state.buckets.push({ ts, count: 0, bytes: 0, errors: 0 });
    if (state.buckets.length > TRAFFIC_BUCKETS) {
      state.buckets.shift();
    }
  }
  return state.buckets[state.buckets.length - 1];
};

export const securityMetricsMiddleware = (req, res, next) => {
  const started = process.hrtime.bigint();
  const path = normalizePath(req.originalUrl);
  const ip = getClientIp(req);

  res.on("finish", () => {
    const ended = process.hrtime.bigint();
    const durationMs = Number(ended - started) / 1_000_000;
    const statusCode = res.statusCode || 0;
    const responseSize = toNum(res.getHeader("content-length"));
    const timestamp = Date.now();

    state.totalRequests += 1;
    state.events.push({
      ts: timestamp,
      path,
      method: req.method,
      statusCode,
      durationMs,
      ip,
      bytes: responseSize,
    });
    if (state.events.length > MAX_EVENTS) {
      state.events.splice(0, state.events.length - MAX_EVENTS);
    }

    const bucket = getBucket(timestamp);
    bucket.count += 1;
    bucket.bytes += responseSize;
    if (statusCode >= 400) {
      bucket.errors += 1;
    }
  });

  next();
};

export const getSecurityMetricsSnapshot = () => {
  const now = Date.now();
  const minuteAgo = now - 60_000;
  const lastMinute = state.events.filter((event) => event.ts >= minuteAgo);

  const status = { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0 };
  const endpointMap = new Map();
  const ipMap = new Map();
  const latencies = [];
  let totalBytesMinute = 0;

  for (const event of lastMinute) {
    totalBytesMinute += event.bytes;
    latencies.push(event.durationMs);

    if (event.statusCode >= 500) status["5xx"] += 1;
    else if (event.statusCode >= 400) status["4xx"] += 1;
    else if (event.statusCode >= 300) status["3xx"] += 1;
    else status["2xx"] += 1;

    const endpoint = endpointMap.get(event.path) || {
      path: event.path,
      count: 0,
      errors: 0,
      totalMs: 0,
      maxMs: 0,
    };
    endpoint.count += 1;
    endpoint.totalMs += event.durationMs;
    endpoint.maxMs = Math.max(endpoint.maxMs, event.durationMs);
    if (event.statusCode >= 400) endpoint.errors += 1;
    endpointMap.set(event.path, endpoint);

    const ip = ipMap.get(event.ip) || {
      ip: event.ip,
      requests: 0,
      errors: 0,
      paths: new Set(),
      lastSeen: event.ts,
    };
    ip.requests += 1;
    if (event.statusCode >= 400) ip.errors += 1;
    ip.paths.add(event.path);
    ip.lastSeen = Math.max(ip.lastSeen, event.ts);
    ipMap.set(event.ip, ip);
  }

  latencies.sort((a, b) => a - b);
  const avgResponseMs =
    latencies.length > 0
      ? Number((latencies.reduce((sum, value) => sum + value, 0) / latencies.length).toFixed(2))
      : 0;
  const p95ResponseMs =
    latencies.length > 0 ? Number(latencies[Math.floor(latencies.length * 0.95)].toFixed(2)) : 0;

  const topEndpoints = Array.from(endpointMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map((entry) => ({
      path: entry.path,
      count: entry.count,
      errorRate: entry.count > 0 ? Number(((entry.errors / entry.count) * 100).toFixed(2)) : 0,
      avgMs: entry.count > 0 ? Number((entry.totalMs / entry.count).toFixed(2)) : 0,
      maxMs: Number(entry.maxMs.toFixed(2)),
    }));

  const suspiciousIps = Array.from(ipMap.values())
    .map((entry) => ({
      ip: entry.ip,
      requests: entry.requests,
      errors: entry.errors,
      errorRate: entry.requests > 0 ? Number(((entry.errors / entry.requests) * 100).toFixed(2)) : 0,
      uniquePaths: entry.paths.size,
      lastSeen: new Date(entry.lastSeen).toISOString(),
      riskScore: Math.min(
        100,
        Math.round(entry.requests * 1.5 + entry.errors * 8 + (entry.paths.size > 15 ? 12 : 0)),
      ),
    }))
    .filter((entry) => entry.requests >= 5 || entry.errorRate >= 35)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 10);

  const requestsPerSecond = Number((lastMinute.length / 60).toFixed(2));
  const throughputMbps = Number((((totalBytesMinute * 8) / 1_000_000) / 60).toFixed(2));
  const errorRate =
    lastMinute.length > 0
      ? Number((((status["4xx"] + status["5xx"]) / lastMinute.length) * 100).toFixed(2))
      : 0;
  const riskIndex = Math.min(100, Math.round(requestsPerSecond * 2 + errorRate * 1.6 + (p95ResponseMs / 30)));

  const trafficSeries = state.buckets.map((bucket) => bucket.count);

  return {
    generatedAt: new Date().toISOString(),
    uptimeSec: Math.floor((now - state.startedAt) / 1000),
    summary: {
      totalRequests: state.totalRequests,
      lastMinuteRequests: lastMinute.length,
      requestsPerSecond,
      errorRate,
      avgResponseMs,
      p95ResponseMs,
      throughputMbps,
      riskIndex,
    },
    statusCodes: status,
    services: [
      {
        key: "public-api",
        name: "API Jobs",
        status: errorRate > 20 ? "degraded" : "online",
        latencyMs: avgResponseMs,
      },
      {
        key: "database",
        name: "MySQL",
        status: p95ResponseMs > 1200 ? "degraded" : "online",
        latencyMs: Math.max(5, Math.round(avgResponseMs * 0.6)),
      },
      {
        key: "welovedevs",
        name: "Provider WeLoveDevs",
        status: topEndpoints.some((entry) => entry.path.includes("/jobs/sync") && entry.errorRate > 0)
          ? "degraded"
          : "online",
        latencyMs: Math.max(80, Math.round(p95ResponseMs * 0.8)),
      },
    ],
    topEndpoints,
    suspiciousIps,
    trafficSeries,
  };
};

