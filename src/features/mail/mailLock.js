export const DEMO_MAIL_PASSWORD = "REDACTED-IMPORTANT-MAIL";

export function isMailPasswordValid(password) {
  return password === DEMO_MAIL_PASSWORD;
}

export function getLockedMailState() {
  return {
    importantUnlocked: false,
    selectedId: null,
    draft: null,
    view: "message",
    query: "",
    unlockError: "",
  };
}
