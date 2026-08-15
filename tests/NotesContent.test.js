import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { createServer } from "vite";
import { Window } from "happy-dom";

const projectRoot = new URL("../", import.meta.url).pathname;
const browserWindow = new Window({ url: "http://localhost/" });
const { document } = browserWindow;

Object.assign(globalThis, {
  window: browserWindow,
  document,
  Element: browserWindow.Element,
  HTMLElement: browserWindow.HTMLElement,
  Event: browserWindow.Event,
  MouseEvent: browserWindow.MouseEvent,
  IS_REACT_ACT_ENVIRONMENT: true,
});

let vite;
let React;
let act;
let createRoot;
let NotesContent;
let WindowContext;
const mountedRoots = [];

async function renderNotes() {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const mount = { container, root };
  mountedRoots.push(mount);

  await act(async () => {
    root.render(
      React.createElement(
        WindowContext.Provider,
        { value: { onClose() {}, onMinimize() {}, onZoom() {}, onTitleMouseDown() {} } },
        React.createElement(NotesContent),
      ),
    );
  });

  return mount;
}

async function unmount(mount) {
  await act(async () => mount.root.unmount());
  mount.container.remove();
}

before(async () => {
  vite = await createServer({
    configFile: `${projectRoot}vite.config.js`,
    server: { hmr: false, middlewareMode: true, ws: false },
    appType: "custom",
  });
  ({ default: React } = await import("react"));
  ({ act } = React);
  ({ createRoot } = await import("react-dom/client"));
  ({ NotesContent } = await vite.ssrLoadModule("/src/features/notes/NotesContent.jsx"));
  ({ WindowContext } = await vite.ssrLoadModule("/src/windows/index.js"));
});

afterEach(async () => {
  for (const mount of mountedRoots.splice(0)) await unmount(mount);
  document.body.replaceChildren();
});

after(async () => {
  await vite.close();
  browserWindow.close();
});

test("opens Notes with the new note numbered 1", async () => {
  const mount = await renderNotes();
  const note = `I know I’m not perfect, but I want to be everything you dream of. I want to be the man who understands you—not just the big things, but the small details, too. I want you to tell me what makes you happy, what makes you laugh, and what makes you feel safe. Teach me how to love you the way you want to be loved. I don’t want to assume I know what you need; I want to listen and learn.

Your happiness means everything to me, and I will never stop trying to be the man who brings it to you. I want to be the one who shows up for you, who gets it right, and who learns from his mistakes. I will always be ready to grow, to change, and to love you more deeply than I did yesterday.

Tell me your dreams, your desires, and your fears, and I promise I’ll be right here. You deserve to be loved in a way that feels right to you, and I’m willing to do whatever it takes to be the person you need, because you are my number one.`;
  const titles = [...mount.container.querySelectorAll(".notes-item-title")]
    .map((item) => item.textContent);

  assert.deepEqual(titles, ["Histories", "Home", "Reason for Being", "1"]);
  assert.equal(mount.container.querySelector(".notes-editor").value, note);
});
