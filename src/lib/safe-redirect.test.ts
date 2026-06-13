import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearStoredRedirect,
  persistRedirect,
  readStoredRedirect,
  resolveRedirect,
  safeRedirectTarget,
} from "./safe-redirect";

const STORAGE_KEY = "post_login_redirect";

beforeEach(() => {
  localStorage.clear();
  // jsdom defaults to http://localhost; make origin explicit/stable.
  if (window.location.origin !== "http://localhost") {
    // no-op — jsdom origin is already http://localhost
  }
});

afterEach(() => {
  localStorage.clear();
});

describe("safeRedirectTarget", () => {
  it("returns fallback for empty/invalid input", () => {
    expect(safeRedirectTarget(null)).toBe("/app");
    expect(safeRedirectTarget(undefined)).toBe("/app");
    expect(safeRedirectTarget("")).toBe("/app");
    expect(safeRedirectTarget("   ")).toBe("/app");
  });

  it("rejects external/protocol-relative/scheme URLs", () => {
    expect(safeRedirectTarget("https://evil.com/x")).toBe("/app");
    expect(safeRedirectTarget("//evil.com/x")).toBe("/app");
    expect(safeRedirectTarget("javascript:alert(1)")).toBe("/app");
    expect(safeRedirectTarget("/\\evil.com")).toBe("/app");
  });

  it("rejects forbidden routes", () => {
    expect(safeRedirectTarget("/")).toBe("/app");
    expect(safeRedirectTarget("/login")).toBe("/app");
    expect(safeRedirectTarget("/signup")).toBe("/app");
    expect(safeRedirectTarget("/onboarding")).toBe("/app");
    expect(safeRedirectTarget("/client/abc123")).toBe("/app");
  });

  it("preserves valid same-origin paths with query and hash", () => {
    expect(safeRedirectTarget("/app/leads")).toBe("/app/leads");
    expect(safeRedirectTarget("/app/leads?status=new")).toBe("/app/leads?status=new");
    expect(safeRedirectTarget("/profile#tab")).toBe("/profile#tab");
  });

  it("honours custom fallback", () => {
    expect(safeRedirectTarget(null, "/profile")).toBe("/profile");
    expect(safeRedirectTarget("https://evil.com", "/profile")).toBe("/profile");
  });
});

describe("persist / read / clear redirect", () => {
  it("persistRedirect writes to localStorage under the expected key", () => {
    persistRedirect("/app/leads");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("/app/leads");
    expect(readStoredRedirect()).toBe("/app/leads");
  });

  it("clearStoredRedirect removes the value", () => {
    persistRedirect("/app/finance");
    clearStoredRedirect();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(readStoredRedirect()).toBeNull();
  });

  it("readStoredRedirect returns null when nothing is stored", () => {
    expect(readStoredRedirect()).toBeNull();
  });
});

describe("resolveRedirect (precedence + safety)", () => {
  it("prefers query string over stored value", () => {
    persistRedirect("/app/finance");
    expect(resolveRedirect("/app/leads")).toBe("/app/leads");
  });

  it("falls back to stored value when query is missing — survives a hard reload", () => {
    // Simulate: user navigated to /app/leads while logged out, ProtectedRoute
    // persisted the target, then the page was hard-reloaded with no ?redirect.
    persistRedirect("/app/leads?status=new");
    expect(resolveRedirect(null)).toBe("/app/leads?status=new");
    expect(resolveRedirect(undefined)).toBe("/app/leads?status=new");
    expect(resolveRedirect("")).toBe("/app/leads?status=new");
  });

  it("falls back to /app when neither query nor storage has a value", () => {
    expect(resolveRedirect(null)).toBe("/app");
  });

  it("sanitises a malicious stored value back to fallback", () => {
    localStorage.setItem(STORAGE_KEY, "https://evil.com/steal");
    expect(resolveRedirect(null)).toBe("/app");
  });

  it("sanitises a forbidden stored value (e.g. /login) back to fallback", () => {
    localStorage.setItem(STORAGE_KEY, "/login");
    expect(resolveRedirect(null)).toBe("/app");
  });

  it("supports a custom fallback target", () => {
    expect(resolveRedirect(null, "/profile")).toBe("/profile");
  });
});

describe("ProtectedRoute → login round-trip (integration-style)", () => {
  // These simulate the full flow without rendering React:
  //   1. ProtectedRoute persists the intended target when guest.
  //   2. AdminLogin resolves it (via query OR storage) after login.
  //   3. Storage is cleared once the redirect is consumed.
  it("stores on guest visit, consumes on successful login", () => {
    // 1. Guest hits /app/leads → ProtectedRoute persists it.
    persistRedirect("/app/leads");
    expect(readStoredRedirect()).toBe("/app/leads");

    // 2. User lands on /login (no ?redirect, e.g. hard reload). resolveRedirect
    //    must still return the stored target.
    const target = resolveRedirect(null);
    expect(target).toBe("/app/leads");

    // 3. After successful login the app clears storage.
    clearStoredRedirect();
    expect(readStoredRedirect()).toBeNull();
  });

  it("query string takes precedence even when storage holds a different value", () => {
    persistRedirect("/app/leads");
    const target = resolveRedirect("/app/finance");
    expect(target).toBe("/app/finance");
  });

  it("invalid stored value after reload falls back to /app and can be cleared", () => {
    localStorage.setItem(STORAGE_KEY, "//evil.com");
    expect(resolveRedirect(null)).toBe("/app");
    clearStoredRedirect();
    expect(readStoredRedirect()).toBeNull();
  });
});