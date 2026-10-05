export function matchesQuery(haystack, query) {
  return String(haystack ?? "")
    .toLowerCase()
    .includes(String(query ?? "").trim().toLowerCase());
}
