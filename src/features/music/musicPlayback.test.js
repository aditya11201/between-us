import test from "node:test";
import assert from "node:assert/strict";
import { fetchAudioBlobUrl } from "./musicPlayback.js";

test("loads audio bytes into a blob URL and revokes it when released", async () => {
  const requests = [];
  const revoked = [];
  let receivedBlob;

  const result = await fetchAudioBlobUrl("/assets/perfect.m4a", {
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return {
        ok: true,
        blob: async () => ({ type: "audio/mp4" }),
      };
    },
    urlApi: {
      createObjectURL(blob) {
        receivedBlob = blob;
        return "blob:perfect";
      },
      revokeObjectURL(url) {
        revoked.push(url);
      },
    },
  });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "/assets/perfect.m4a");
  assert.deepEqual(requests[0].options, { signal: undefined });
  assert.deepEqual(receivedBlob, { type: "audio/mp4" });
  assert.equal(result.url, "blob:perfect");

  result.revoke();
  assert.deepEqual(revoked, ["blob:perfect"]);
});

test("rejects failed audio requests", async () => {
  await assert.rejects(
    () => fetchAudioBlobUrl("/assets/missing.m4a", {
      fetchImpl: async () => ({ ok: false, status: 404 }),
      urlApi: { createObjectURL() {}, revokeObjectURL() {} },
    }),
    /audio request failed: 404/i,
  );
});

test("normalizes a generic transport blob to the catalog audio MIME type", async () => {
  let receivedBlob;
  const result = await fetchAudioBlobUrl("/assets/perfect.bin", {
    mimeType: "audio/mp4",
    fetchImpl: async () => ({
      ok: true,
      blob: async () => new Blob(["audio"], { type: "application/octet-stream" }),
    }),
    urlApi: {
      createObjectURL(blob) {
        receivedBlob = blob;
        return "blob:perfect";
      },
      revokeObjectURL() {},
    },
  });

  assert.equal(receivedBlob.type, "audio/mp4");
  assert.equal(result.url, "blob:perfect");
});
