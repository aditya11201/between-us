import test from "node:test";
import assert from "node:assert/strict";
import { encryptMailJson } from "../scripts/encrypt-mail.mjs";

test("encryptMailJson produces a valid envelope", async () => {
  const envelope = await encryptMailJson([{ id: "m1" }], "pw", 1000);

  assert.equal(envelope.v, 1);
  assert.equal(envelope.kdf, "PBKDF2-SHA256");
  assert.equal(envelope.iterations, 1000);
  assert.equal(envelope.salt.length, 24); // 16 bytes -> 24 base64 chars
});

import { decryptImportantMail } from "../src/features/mail/mailCrypto.js";

test("round-trips messages through encrypt and decrypt", async () => {
  const messages = [
    { id: "m1", subject: "Hello" },
    { id: "m2", subject: "World" },
  ];
  const envelope = await encryptMailJson(messages, "secret-pass", 1000);

  const decrypted = await decryptImportantMail(envelope, "secret-pass");

  assert.deepEqual(decrypted, messages);
});

test("returns null for a wrong password", async () => {
  const envelope = await encryptMailJson([{ id: "m1" }], "secret-pass", 1000);

  assert.equal(await decryptImportantMail(envelope, "wrong-pass"), null);
});

test("returns null for a corrupted ciphertext", async () => {
  const envelope = await encryptMailJson([{ id: "m1" }], "secret-pass", 1000);
  const corrupted = { ...envelope, ct: envelope.ct.slice(0, -4) + "AAAA" };

  assert.equal(await decryptImportantMail(corrupted, "secret-pass"), null);
});

test("returns null for an envelope with missing fields", async () => {
  assert.equal(await decryptImportantMail({}, "secret-pass"), null);
});
