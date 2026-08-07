import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { compile } from "sass";
import { Window } from "happy-dom";

const source = readFileSync(new URL("./MailContent.jsx", import.meta.url), "utf8");
const styles = compile(fileURLToPath(new URL("../../styles/components/Mail/Mail.scss", import.meta.url))).css;

test("renders traffic lights in a persistent Mail titlebar", () => {
  const headerIndex = source.search(/<header\s+className="mail__window-header"/);
  const lightsIndex = source.indexOf('className="mail__traffic-lights"');
  const sidebarIndex = source.indexOf('<aside className="mail__sidebar"');

  assert.ok(headerIndex >= 0, "Mail window header should be rendered");
  assert.ok(lightsIndex > headerIndex, "traffic lights should be inside the Mail window header");
  assert.ok(sidebarIndex >= 0, "Mail sidebar should be rendered");
  assert.ok(headerIndex < sidebarIndex, "Mail window header must be outside the sidebar");
  assert.match(source, /mail__traffic-light--close[\s\S]*onClick=\{onClose\}/);
  assert.match(source, /mail__traffic-light--minimize[\s\S]*onClick=\{onMinimize\}/);
  assert.match(source, /mail__traffic-light--maximize[\s\S]*onClick=\{\(\) => \{[\s\S]*onMaximize\(\)/);
});

test("traffic light colors remain visible over the Mail button reset", () => {
  const window = new Window();
  const style = window.document.createElement("style");
  style.textContent = styles;
  window.document.head.append(style);
  window.document.body.innerHTML = '<div class="mail"><button class="mail__traffic-light mail__traffic-light--close"></button></div>';

  assert.equal(
    window.getComputedStyle(window.document.querySelector("button")).backgroundColor,
    "#ff5f57",
  );

  window.close();
});
