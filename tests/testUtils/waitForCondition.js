const DEFAULT_TIMEOUT_MS = 2000;
const DEFAULT_INTERVAL_MS = 10;
const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

export async function waitForCondition(
  condition,
  {
    description = "condition",
    timeout = DEFAULT_TIMEOUT_MS,
    interval = DEFAULT_INTERVAL_MS,
    wait = sleep,
  } = {},
) {
  const deadline = Date.now() + timeout;
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
        `Timed out after ${timeout}ms waiting for ${description}.${detail}`,
      );
    }

    await wait(Math.min(interval, remaining));
  }
}
