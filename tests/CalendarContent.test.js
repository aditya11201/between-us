import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { createServer } from "vite";
import { setupHarness, unmountMount } from "./testUtils/harness.js";
import { createDom } from "./testUtils/dom.js";

const { browserWindow, document, projectRoot } = setupHarness();

let vite;
let React;
let act;
let createRoot;
let CalendarContent;
let WindowContext;
const mountedRoots = [];

function freezeToday() {
  const RealDate = globalThis.Date;

  class FrozenDate extends RealDate {
    constructor(...args) {
      super(...(args.length ? args : ["2026-04-02T12:00:00"]));
    }

    static now() {
      return new RealDate("2026-04-02T12:00:00").valueOf();
    }
  }

  globalThis.Date = FrozenDate;
  browserWindow.Date = FrozenDate;

  return () => {
    globalThis.Date = RealDate;
    browserWindow.Date = RealDate;
  };
}

async function renderCalendar() {
  const desktop = document.createElement("div");
  desktop.className = "desktop";
  document.body.append(desktop);
  const container = document.createElement("div");
  desktop.append(container);
  const root = createRoot(container);
  const mount = { container, root };
  mountedRoots.push(mount);

  await act(async () => {
    root.render(
      React.createElement(
        WindowContext.Provider,
        { value: { onClose() {}, onMinimize() {}, onZoom() {}, onTitlePointerDown() {} } },
        React.createElement(CalendarContent),
      ),
    );
  });

  return mount;
}

let dom;

const click = (element) => dom.click(element);

const unmount = (mount) => unmountMount(act, mount);

before(async () => {
  vite = await createServer({
    configFile: `${projectRoot}vite.config.js`,
    server: { hmr: false, middlewareMode: true, ws: false },
    appType: "custom",
  });
  ({ default: React } = await import("react"));
  ({ act } = React);
  ({ createRoot } = await import("react-dom/client"));
  ({ CalendarContent } = await vite.ssrLoadModule("/src/features/calendar/CalendarContent.jsx"));
  ({ WindowContext } = await vite.ssrLoadModule("/src/windows/index.js"));
  dom = createDom(act, browserWindow, document);
});

afterEach(async () => {
  for (const mount of mountedRoots.splice(0)) await unmount(mount);
  document.body.replaceChildren();
  localStorage.clear();
});

after(async () => {
  await vite.close();
  browserWindow.close();
});

test("shows the annual birthday in April and opens its detail without opening add event", async () => {
  const restoreDate = freezeToday();
  const mount = await renderCalendar();

  const birthday = mount.container.querySelector('[data-date="2026-04-05"] .calendar-day-event');
  assert.ok(birthday, "April 5 should render the seeded birthday event");
  assert.match(birthday.textContent, /The day my dream came to life/);

  await click(birthday);

  const detail = document.body.querySelector(".calendar-event-detail");
  const focusTarget = detail;
  assert.match(detail.textContent, /Repeats yearly/);
  assert.equal(document.activeElement, focusTarget);
  assert.equal(mount.container.querySelector(".calendar-event-popup"), null);

  await dom.pressEscape();
  assert.equal(document.body.querySelector(".calendar-event-detail"), null);
  assert.equal(document.activeElement, birthday);
  restoreDate();
});

test("matches the reference event detail popover structure and actions", async () => {
  const restoreDate = freezeToday();
  const mount = await renderCalendar();
  const birthday = mount.container.querySelector('[data-date="2026-04-05"] .calendar-day-event');

  await click(birthday);

  const detail = document.body.querySelector(".calendar-event-detail");
  assert.ok(detail.classList.contains("calendar-event-detail--open"));
  assert.ok(detail.querySelector(".calendar-event-detail-header"));
  assert.ok(detail.querySelector(".calendar-event-detail-color"));
  assert.ok(detail.querySelector(".calendar-event-detail-when"));
  assert.ok(detail.querySelector(".calendar-event-detail-repeat-settings"));
  assert.ok(detail.querySelector(".calendar-event-detail-unsubscribe"));
  assert.match(detail.querySelector(".calendar-event-detail-date").textContent, /5 Apr 2026/);
  assert.match(detail.querySelector(".calendar-event-detail-repeat").textContent, /Repeats yearly/);
  assert.notEqual(detail.style.left, "");
  assert.notEqual(detail.style.top, "");

  await click(detail.querySelector(".calendar-event-detail-color"));
  assert.match(document.body.querySelector(".calendar-toast").textContent, /Pemilih warna/);

  await click(detail.querySelector(".calendar-event-detail-unsubscribe"));
  assert.equal(document.body.querySelector(".calendar-event-detail"), null);
  assert.match(document.body.querySelector(".calendar-toast").textContent, /Berhenti berlangganan/);
  assert.equal(document.activeElement, mount.container.querySelector('[data-date="2026-04-05"]'));
  restoreDate();
});

test("aligns April 5 with the Sunday calendar column", async () => {
  const restoreDate = freezeToday();
  const mount = await renderCalendar();
  const days = [...mount.container.querySelectorAll(".calendar-grid > .calendar-day")];
  const birthdayDay = mount.container.querySelector('[data-date="2026-04-05"]');

  assert.equal(days.indexOf(birthdayDay) % 7, 0);
  restoreDate();
});

test("closes event detail before starting a new event from another day", async () => {
  const restoreDate = freezeToday();
  const mount = await renderCalendar();
  await click(mount.container.querySelector('[data-date="2026-04-05"] .calendar-day-event'));

  await click(mount.container.querySelector('[data-date="2026-04-06"]'));

  assert.equal(document.body.querySelector(".calendar-event-detail"), null);
  assert.equal(mount.container.querySelector(".calendar-event-popup"), null);
  restoreDate();
});

test("saves a yearly event for the selected day", async () => {
  const restoreDate = freezeToday();
  const mount = await renderCalendar();
  const day = mount.container.querySelector('[data-date="2026-04-06"]');
  await click(day);

  const input = mount.container.querySelector(".calendar-popup-input");
  await dom.fill(input, "Anniversary");

  const recurrence = mount.container.querySelector('[name="repeat-yearly"]');
  await click(recurrence);
  await click(mount.container.querySelector(".calendar-popup-add"));

  const events = JSON.parse(localStorage.getItem("calendar-events"));
  assert.deepEqual(events["2026-04-06"].at(-1), {
    id: events["2026-04-06"].at(-1).id,
    text: "Anniversary",
    createdAt: events["2026-04-06"].at(-1).createdAt,
    allDay: true,
    repeatYearly: true,
  });
  restoreDate();
});

test("renders with default calendars when saved calendar lists are malformed", async () => {
  const restoreDate = freezeToday();
  localStorage.setItem("calendar-lists", "not json");

  const mount = await renderCalendar();

  assert.ok(mount.container.querySelector(".calendar-list-item"));
  restoreDate();
});

test("ignores malformed calendar entries inside otherwise valid saved lists", async () => {
  const restoreDate = freezeToday();
  localStorage.setItem("calendar-lists", JSON.stringify({
    icloud: [{ id: "broken", name: {}, color: "#fff", checked: true }],
    other: [],
  }));

  const mount = await renderCalendar();

  assert.equal(mount.container.querySelectorAll(".calendar-list-item").length, 0);
  restoreDate();
});
