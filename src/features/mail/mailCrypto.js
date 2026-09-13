export async function fetchImportantMailEnvelope() {
  const baseUrl = import.meta.env?.BASE_URL ?? "/";
  const response = await fetch(`${baseUrl}important-mail.enc.json`);
  if (!response.ok) {
    throw new Error(`Failed to load encrypted mail: ${response.status}`);
  }
  return response.json();
}

export async function decryptImportantMail(envelope, password) {
  try {
    const { iterations, salt, iv, ct } = envelope;
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveKey"],
    );
    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", hash: "SHA-256", salt: base64ToBytes(salt), iterations },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"],
    );
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(iv) },
      key,
      base64ToBytes(ct),
    );
    return JSON.parse(new TextDecoder().decode(plaintext));
  } catch {
    // Wrong password (GCM auth failure) or malformed envelope — both mean "no".
    return null;
  }
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
