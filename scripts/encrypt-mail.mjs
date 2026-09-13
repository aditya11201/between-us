import { readFile, writeFile, mkdir } from "node:fs/promises";
import { webcrypto } from "node:crypto";
import { pathToFileURL } from "node:url";

const DEFAULT_ITERATIONS = 600000;

export async function encryptMailJson(messages, password, iterations = DEFAULT_ITERATIONS) {
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const keyMaterial = await webcrypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  const key = await webcrypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );
  const ciphertext = await webcrypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(messages)),
  );

  return {
    v: 1,
    kdf: "PBKDF2-SHA256",
    iterations,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ct: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

function bytesToBase64(bytes) {
  return Buffer.from(bytes).toString("base64");
}

async function main() {
  const password = process.env.IMPORTANT_PWD;
  if (!password) {
    console.error("Set IMPORTANT_PWD first, e.g. IMPORTANT_PWD=... npm run encrypt:mail");
    process.exit(1);
  }

  const source = await readFile("private/mail.json", "utf8");
  const messages = JSON.parse(source);
  if (!Array.isArray(messages)) {
    throw new Error("private/mail.json must be a JSON array of message objects");
  }

  const envelope = await encryptMailJson(messages, password);
  await mkdir("public", { recursive: true });
  await writeFile("public/important-mail.enc.json", `${JSON.stringify(envelope, null, 2)}\n`);
  console.log(`Encrypted ${messages.length} message(s) into public/important-mail.enc.json`);
}

const isDirectRun = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) await main();
