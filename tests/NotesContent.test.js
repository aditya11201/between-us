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

test("opens Notes with Without Having You as the active note", async () => {
  const mount = await renderNotes();
  const note = `I know now that loving you does not have to mean having you.

I don’t need you to become mine for what I feel for you to be real. I don’t need to convince you, change your mind, or ask you to give me something your heart is not ready to give.

I can simply love you for who you are.

For the parts of you that are easy to understand, and the parts that may always remain a little complicated. For your strength, your fears, your softness, your silence, and all the little things that make you who you are.

I’m not here to fix you, and I’m not here to become the answer to everything you’re going through. I finally understand that some things are yours to heal in your own way, at your own pace.

But if one day you need someone to listen, someone to help, or simply someone you can reach out to, I want you to know that I’ll still care. Not because I expect something in return, but because your place in my heart was never only about whether I could call you mine.

I’m no longer trying to convince you to choose me.

I’m choosing to respect you.

And maybe that is another form of love too.

Because love does not always have to end with possession. Sometimes love is staying kind even when you have to let go of expectations. Sometimes it is wishing someone peace even when their path does not lead back to you.

So I will love you as you are, without asking you to become anything for me.

And if life ever makes you need my help, and I’m able to give it, you can still ask.

Not because I’m waiting for my chance.

Not because I’m hoping you’ll change your mind.

Simply because, in one form or another, I still care about you.

And I think I always will.`;
  const titles = [...mount.container.querySelectorAll(".notes-item-title")]
    .map((item) => item.textContent);

  assert.deepEqual(titles, ["Histories", "Home", "Reason for Being", "1", "Without Having You"]);
  assert.equal(mount.container.querySelector(".notes-editor").value, note);
});
