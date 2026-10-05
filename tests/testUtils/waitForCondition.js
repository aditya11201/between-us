const DEFAULT_TIMEOUT_MS = 2000;
const DEFAULT_INTERVAL_MS = 10;
const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

export async function waitForCondition(
  condition,
  { description = "condition", wait = sleep } = {},
) {
  const deadline = Date.now() + DEFAULT_TIMEOUT_MS;
  let lastError;

  while (true) {
    try {
      if (await condition()) return;
    } catch (error) {
      lastError = error;
    }

    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      const detail = lastError instanceof Error
        ? ` Last error: ${lastError.message}`
        : "";
      throw new Error(
        `Timed out after ${DEFAULT_TIMEOUT_MS}ms waiting for ${description}.${detail}`,
      );
    }

    await wait(Math.min(DEFAULT_INTERVAL_MS, remaining));
  }
}

export async function waitForPreviewState(act, container, predicate, description) {
  await waitForCondition(
    async () => {
      let matches = false;
      await act(async () => {
        await Promise.resolve();
        matches = predicate(container);
      });
      return matches;
    },
    {
      description,
      wait: (delay) => act(async () => {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }),
    },
  );
}
