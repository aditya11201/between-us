export function installClock(browserWindow) {
  const originals = {
    globalSetTimeout: globalThis.setTimeout,
    globalClearTimeout: globalThis.clearTimeout,
    globalSetInterval: globalThis.setInterval,
    globalClearInterval: globalThis.clearInterval,
    windowSetTimeout: browserWindow.setTimeout,
    windowClearTimeout: browserWindow.clearTimeout,
    windowSetInterval: browserWindow.setInterval,
    windowClearInterval: browserWindow.clearInterval,
  };
  const timeouts = new Map();
  const intervals = new Map();
  let now = 0;
  let nextId = 1;

  function schedule(store, callback, delay, args) {
    const duration = Math.max(1, Number(delay) || 0);
    const id = nextId++;
    store.set(id, {
      callback,
      args,
      delay: duration,
      duration,
      due: now + duration,
    });
    return id;
  }

  function setTimeoutMock(callback, delay, ...args) {
    return schedule(timeouts, callback, delay, args);
  }

  function setIntervalMock(callback, delay, ...args) {
    return schedule(intervals, callback, delay, args);
  }

  function clearTimeoutMock(id) {
    timeouts.delete(id);
  }

  function clearIntervalMock(id) {
    intervals.delete(id);
  }

  function nextTask(target) {
    return [
      ...[...timeouts].map(([id, task]) => ({ id, store: timeouts, task })),
      ...[...intervals].map(([id, task]) => ({ id, store: intervals, task })),
    ]
      .filter(({ task }) => task.due <= target)
      .sort((left, right) => left.task.due - right.task.due)[0];
  }

  function advance(milliseconds) {
    const target = now + milliseconds;
    let task;

    while ((task = nextTask(target))) {
      now = task.task.due;
      if (task.store === intervals) {
        task.task.due += task.task.duration;
      } else {
        task.store.delete(task.id);
      }
      task.task.callback(...task.task.args);
    }

    now = target;
  }

  Object.assign(globalThis, {
    setTimeout: setTimeoutMock,
    clearTimeout: clearTimeoutMock,
    setInterval: setIntervalMock,
    clearInterval: clearIntervalMock,
  });
  Object.assign(browserWindow, {
    setTimeout: setTimeoutMock,
    clearTimeout: clearTimeoutMock,
    setInterval: setIntervalMock,
    clearInterval: clearIntervalMock,
  });

  return {
    advance,
    restore() {
      Object.assign(globalThis, {
        setTimeout: originals.globalSetTimeout,
        clearTimeout: originals.globalClearTimeout,
        setInterval: originals.globalSetInterval,
        clearInterval: originals.globalClearInterval,
      });
      Object.assign(browserWindow, {
        setTimeout: originals.windowSetTimeout,
        clearTimeout: originals.windowClearTimeout,
        setInterval: originals.windowSetInterval,
        clearInterval: originals.windowClearInterval,
      });
      timeouts.clear();
      intervals.clear();
    },
    activeTimers: () => [
      ...[...timeouts].map(([id, task]) => ({ id, type: "timeout", ...task })),
      ...[...intervals].map(([id, task]) => ({ id, type: "interval", ...task })),
    ],
    activeTimerCount: () => timeouts.size + intervals.size,
    activeIntervalCount: () => intervals.size,
  };
}

export async function advanceTimers(act, clock, milliseconds) {
  await act(async () => {
    clock.advance(milliseconds);
    await Promise.resolve();
  });
}
