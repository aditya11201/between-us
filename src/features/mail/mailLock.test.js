import test from "node:test";
import assert from "node:assert/strict";
import {
  DEMO_MAIL_PASSWORD,
  getLockedMailState,
  isMailPasswordValid,
} from "./mailLock.js";

test("accepts only the exact demo Mail password", () => {
  assert.equal(isMailPasswordValid(DEMO_MAIL_PASSWORD), true);
  assert.equal(isMailPasswordValid("wrong-password"), false);
  assert.equal(isMailPasswordValid(` ${DEMO_MAIL_PASSWORD} `), false);
});

test("returns a clean locked Mail state", () => {
  assert.deepEqual(getLockedMailState(), {
    importantUnlocked: false,
    selectedId: null,
    draft: null,
    view: "message",
    query: "",
    unlockError: "",
  });
});
