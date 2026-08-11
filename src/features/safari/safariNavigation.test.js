import test from "node:test";
import assert from "node:assert/strict";
import { resolveSafariNavigation } from "./safariNavigation.js";

test("recognizes existing local Safari commands", () => {
  assert.deepEqual(resolveSafariNavigation("  GAMES "), {
    kind: "local",
    command: "games",
    title: "Games",
  });
});

test("accepts the birthday-wishes root URL", () => {
  assert.deepEqual(resolveSafariNavigation("https://aditya11201.github.io/birthday-wishes/"), {
    kind: "iframe",
    url: "https://aditya11201.github.io/birthday-wishes/",
    title: "https://aditya11201.github.io/birthday-wishes/",
  });
});

test("canonicalizes a target URL without a trailing slash", () => {
  assert.equal(
    resolveSafariNavigation("https://aditya11201.github.io/birthday-wishes").url,
    "https://aditya11201.github.io/birthday-wishes/",
  );
});

const APOLOGY_URL = "https://aditya11201.github.io/apology-web-app/";

test("accepts the apology-app root URL", () => {
  assert.deepEqual(resolveSafariNavigation(APOLOGY_URL), {
    kind: "iframe",
    url: APOLOGY_URL,
    title: APOLOGY_URL,
  });
});

test("canonicalizes the apology-app root without a trailing slash", () => {
  assert.equal(
    resolveSafariNavigation("https://aditya11201.github.io/apology-web-app").url,
    APOLOGY_URL,
  );
});

test("accepts apology-app descendants with query and hash values", () => {
  const result = resolveSafariNavigation(
    "https://aditya11201.github.io/apology-web-app/section?scene=finale#message",
  );

  assert.equal(result.kind, "iframe");
  assert.equal(
    result.url,
    "https://aditya11201.github.io/apology-web-app/section?scene=finale#message",
  );
});

test("rejects a lookalike apology-app path", () => {
  assert.equal(
    resolveSafariNavigation("https://aditya11201.github.io/apology-web-app-attacker/").kind,
    "blocked",
  );
});

test("preserves allowed target query and hash values", () => {
  const result = resolveSafariNavigation(
    "https://aditya11201.github.io/birthday-wishes/?scene=finale#message",
  );

  assert.equal(result.kind, "iframe");
  assert.equal(result.url, "https://aditya11201.github.io/birthday-wishes/?scene=finale#message");
});

test("accepts a descendant of the target path", () => {
  assert.equal(
    resolveSafariNavigation("https://aditya11201.github.io/birthday-wishes/section").kind,
    "iframe",
  );
});

test("rejects the parent project path even on the same host", () => {
  assert.equal(
    resolveSafariNavigation("https://aditya11201.github.io/karenjourney/").kind,
    "blocked",
  );
});

test("rejects a lookalike path", () => {
  assert.equal(
    resolveSafariNavigation("https://aditya11201.github.io/birthday-wishes-attacker/").kind,
    "blocked",
  );
});

test("rejects another origin", () => {
  assert.equal(resolveSafariNavigation("https://evil.example/birthday-wishes/").kind, "blocked");
});

test("rejects non-HTTPS and executable protocols", () => {
  for (const value of [
    "http://aditya11201.github.io/birthday-wishes/",
    "javascript:alert(1)",
    "data:text/html,hello",
    "file:///etc/passwd",
  ]) {
    assert.equal(resolveSafariNavigation(value).kind, "blocked");
  }
});

test("rejects embedded credentials", () => {
  assert.equal(
    resolveSafariNavigation("https://user:secret@aditya11201.github.io/birthday-wishes/").kind,
    "blocked",
  );
});

test("redacts credentials from blocked navigation results", () => {
  const result = resolveSafariNavigation(
    "https://user:secret@aditya11201.github.io/birthday-wishes/?scene=finale#message",
  );

  assert.deepEqual(result, {
    kind: "blocked",
    url: "https://aditya11201.github.io/birthday-wishes/?scene=finale#message",
    title: "https://aditya11201.github.io/birthday-wishes/?scene=finale#message",
    reason: "credentials",
  });
  assert.equal(JSON.stringify(result).includes("secret"), false);
});

test("keeps plain search text out of the iframe", () => {
  const result = resolveSafariNavigation("birthday wishes");

  assert.equal(result.kind, "blocked");
  assert.equal(result.url, "https://www.google.com/search?q=birthday%20wishes");
});

test("blocks lone UTF-16 surrogates without exposing malformed input", () => {
  const result = resolveSafariNavigation("\uD800");

  assert.deepEqual(result, { kind: "blocked", reason: "invalid-url" });
  assert.equal(JSON.stringify(result).includes("\uD800"), false);
});

test("does not echo credentials from malformed URLs", () => {
  const result = resolveSafariNavigation("https://user:secret@");

  assert.deepEqual(result, { kind: "blocked", reason: "invalid-url" });
  assert.equal(JSON.stringify(result).includes("secret"), false);
});
