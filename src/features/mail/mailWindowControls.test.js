import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./MailContent.jsx", import.meta.url), "utf8");

test("keeps Mail window controls outside the collapsible sidebar", () => {
  const controlsIndex = source.indexOf('className="mail__window-controls"');
  const sidebarIndex = source.indexOf('<aside className="mail__sidebar"');

  assert.ok(controlsIndex >= 0, "Mail window controls should be rendered");
  assert.ok(sidebarIndex >= 0, "Mail sidebar should be rendered");
  assert.ok(controlsIndex < sidebarIndex, "window controls must not be nested in the collapsible sidebar");
  assert.match(source, /mail__traffic-light--close[\s\S]*onClick=\{onClose\}/);
  assert.match(source, /mail__traffic-light--minimize[\s\S]*onClick=\{onMinimize\}/);
  assert.match(source, /mail__traffic-light--maximize[\s\S]*onClick=\{\(\) => \{[\s\S]*onMaximize\(\)/);
});
