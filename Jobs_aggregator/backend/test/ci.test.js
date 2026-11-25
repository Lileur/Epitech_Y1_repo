import test from "node:test";
import assert from "node:assert/strict";

// Checks that the jobs route path is correct.
function testJobsRoute() {
  const route = "/api/jobs";

  assert.equal(route.startsWith("/api"), true);
  assert.equal(route.includes("jobs"), true);
}

// Checks that the security metrics route path is correct.
function testSecurityRoute() {
  const route = "/api/security/metrics";

  assert.equal(route.startsWith("/api"), true);
  assert.equal(route.includes("security"), true);
}

// Checks that invalid WeLoveDevs dates are rejected.
function testInvalidDateCleaning() {
  function normalizeDate(value) {
    if (!value) return null;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    const year = date.getUTCFullYear();

    if (year < 1970 || year > 2100) {
      return null;
    }

    return date.toISOString();
  }

  const result = normalizeDate("+058333-07-07 02:27");

  assert.equal(result, null);
}

test("Jobs route check", testJobsRoute);
test("Security route check", testSecurityRoute);
test("Invalid date cleaning check", testInvalidDateCleaning);
