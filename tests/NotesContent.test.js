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
  const note = `I’m sorry for what happened the other day.

Looking back at it now with a clearer mind, I realize that my emotions got the better of me. I was scared, overwhelmed, and somewhere along the way, I acted against something I’ve always believed about love.

Love should never have to be forced.

It shouldn’t have to be convinced, negotiated, or proven until someone finally gives in. Real feelings come in their own way, in their own time, and I’m sorry if the way I acted made you feel pressured, hurt, or as if I was asking your heart to give me something it simply wasn’t ready to give.

I’ve learned a lot from what happened.

And I think I understand something now that I should have understood more clearly before:

loving you does not have to mean having you.

What I feel for you doesn’t become less real just because you cannot return it in the same way. I don’t need to convince you to choose me, change your mind, or become someone you’re not ready to be.

I can simply care about you for who you are.

For the parts of you that are easy to understand, and the parts that may always remain a little complicated. For your strength, your fears, your softness, your silence, and all the little things that make you you.

And I finally understand that I’m not here to fix you.

I’m not here to become your cure.

Some wounds are yours to understand and heal in your own way, at your own pace. I can’t decide what healing should look like for you, and I don’t want to anymore.

I want to respect your process instead of trying to guide it.

I honestly still don’t know what my place in your life will look like from here. I don’t know whether staying will eventually be something I can do peacefully, or whether someday I’ll need some distance to take care of my own heart too.

I’m still figuring that part out.

But whatever happens, I don’t want my care for you to become another weight you have to carry.

If one day you need someone to listen, someone to help, or simply someone you feel comfortable reaching out to, and I’m in a place where I’m able to be there, you can still ask.

Not because I’m waiting for another chance.

Not because I’m secretly hoping you’ll change your mind.

And not because I expect your feelings to eventually become the same as mine.

Simply because you became someone deeply important to me, and that doesn’t disappear overnight just because things didn’t turn out the way I once hoped.

I’m no longer trying to convince you to choose me.

I’m trying to learn how to respect your choice.

And maybe that is another form of love too.

Maybe love isn’t always about holding on.

Sometimes it’s letting go of expectations without turning the love into resentment.

Sometimes it’s accepting that someone’s path may not lead back to you and still genuinely hoping they find peace along the way.

So I’m not asking you to become anything for me anymore.

I just want you to become whatever version of yourself makes you feel safe, whole, and at peace.

And I hope I can learn to do the same for myself.

Whatever happens from here, thank you for being someone I was able to care about this deeply.`;
  const titles = [...mount.container.querySelectorAll(".notes-item-title")]
    .map((item) => item.textContent);

  assert.deepEqual(titles, ["Histories", "Home", "Reason for Being", "1", "Without Having You"]);
  assert.equal(mount.container.querySelector(".notes-editor").value, note);
});
