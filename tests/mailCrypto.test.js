import test from "node:test";
import assert from "node:assert/strict";
import { encryptMailJson } from "../scripts/encrypt-mail.mjs";

test("encryptMailJson produces a valid envelope", async () => {
  const envelope = await encryptMailJson([{ id: "m1" }], "pw", 1000);

  assert.equal(envelope.v, 1);
  assert.equal(envelope.kdf, "PBKDF2-SHA256");
  assert.equal(envelope.iterations, 1000);
  assert.equal(envelope.salt.length, 24); // 16 bytes -> 24 base64 chars
  assert.equal(envelope.iv.length, 16); // 12 bytes -> 16 base64 chars
  assert.ok(envelope.ct.length > 0);
});

test("encryptMailJson is non-deterministic across runs", async () => {
  const a = await encryptMailJson([{ id: "m1" }], "pw", 1000);
  const b = await encryptMailJson([{ id: "m1" }], "pw", 1000);

  assert.notEqual(a.salt, b.salt);
  assert.notEqual(a.iv, b.iv);
  assert.notEqual(a.ct, b.ct);
});
