export const TARGET_ORIGIN = "https://aditya11201.github.io";
export const TARGET_PATH_PREFIX = "/birthday-wishes/";
export const TARGET_URL = "https://aditya11201.github.io/birthday-wishes/";

const LOCAL_COMMANDS = Object.freeze({
  about: "About",
  hackintosh: "Hackintosh",
  cats: "Cats",
  surprise: "Surprise",
  games: "Games",
});

const HOSTNAME_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?::\d+)?(?:[/?#].*)?$/i;
const EXPLICIT_SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:/i;

function blocked(url, reason) {
  const result = { kind: "blocked", url, title: url };
  if (reason) result.reason = reason;
  return result;
}

function redactCredentials(parsed) {
  return `${parsed.protocol}//${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function resolveSafariNavigation(rawValue) {
  const value = typeof rawValue === "string" ? rawValue.trim() : "";

  if (!value) return { kind: "empty" };

  const command = value.toLowerCase();
  if (Object.hasOwn(LOCAL_COMMANDS, command)) {
    return { kind: "local", command, title: LOCAL_COMMANDS[command] };
  }

  const isExplicitUrl = EXPLICIT_SCHEME_PATTERN.test(value);
  if (!isExplicitUrl && !HOSTNAME_PATTERN.test(value)) {
    let searchUrl;
    try {
      searchUrl = `https://www.google.com/search?q=${encodeURIComponent(value)}`;
    } catch {
      return { kind: "blocked", reason: "invalid-url" };
    }
    return blocked(searchUrl);
  }

  const candidate = isExplicitUrl ? value : `https://${value}`;
  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    return { kind: "blocked", reason: "invalid-url" };
  }

  const safeHref = parsed.username || parsed.password ? redactCredentials(parsed) : parsed.href;
  if (parsed.protocol !== "https:") return blocked(safeHref, "protocol");
  if (parsed.username || parsed.password) return blocked(safeHref, "credentials");
  if (parsed.origin !== TARGET_ORIGIN) return blocked(safeHref, "origin");

  const rootPath = TARGET_PATH_PREFIX.slice(0, -1);
  if (parsed.pathname === rootPath) parsed.pathname = TARGET_PATH_PREFIX;
  if (!parsed.pathname.startsWith(TARGET_PATH_PREFIX)) {
    return blocked(safeHref, "path");
  }

  return { kind: "iframe", url: parsed.href, title: parsed.href };
}
