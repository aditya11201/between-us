const LOCAL_COMMANDS = {
  about: "About",
  hackintosh: "Hackintosh",
  cats: "Cats",
  surprise: "Surprise",
  games: "Games",
};

const HOSTNAME_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?::\d+)?(?:[/?#].*)?$/i;

export function normalizeSafariTarget(rawValue) {
  const value = typeof rawValue === "string" ? rawValue.trim() : "";

  if (!value) return { kind: "empty" };

  const command = value.toLowerCase();
  if (LOCAL_COMMANDS[command]) {
    return { kind: "local", command, title: LOCAL_COMMANDS[command] };
  }

  const url = /^https?:\/\//i.test(value)
    ? value
    : HOSTNAME_PATTERN.test(value)
      ? `https://${value}`
      : `https://www.google.com/search?q=${encodeURIComponent(value)}`;

  return { kind: "blocked", url, title: url };
}

export function createSafariTab(id, title, url, isStart) {
  const page = { url, title, isStart };
  return { id, title, url, isStart, history: [page], historyIndex: 0 };
}

export function visitSafariTab(tab, page) {
  const history = [...tab.history.slice(0, tab.historyIndex + 1), { ...page }];
  return {
    ...tab,
    ...page,
    history,
    historyIndex: history.length - 1,
  };
}

export function moveSafariTabHistory(tab, direction) {
  const offset = direction === "back" ? -1 : direction === "forward" ? 1 : 0;
  const historyIndex = tab.historyIndex + offset;

  if (offset === 0 || historyIndex < 0 || historyIndex >= tab.history.length) {
    return tab;
  }

  return { ...tab, ...tab.history[historyIndex], historyIndex };
}

export function clearSafariHistory() {
  return [];
}

export function reopenLastClosedSafariTab(recentlyClosedTabs, id) {
  const [closedTab, ...remaining] = recentlyClosedTabs;
  if (!closedTab) return { tab: null, remaining: recentlyClosedTabs };

  return {
    tab: {
      ...closedTab,
      id,
      history: closedTab.history.map((entry) => ({ ...entry })),
    },
    remaining,
  };
}
