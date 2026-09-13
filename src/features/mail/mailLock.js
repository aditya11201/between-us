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
