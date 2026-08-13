import assert from "node:assert/strict";
import test from "node:test";
import {
  BIRTHDAY_EVENT,
  getEventsForDate,
  restoreEvents,
} from "./calendarModel.js";

test("keeps one-time events on their exact calendar date", () => {
  const events = {
    "2026-04-05": [{ id: "one-time", text: "Dinner" }],
  };

  assert.deepEqual(getEventsForDate(events, "2026-04-05"), events["2026-04-05"]);
  assert.deepEqual(getEventsForDate(events, "2027-04-05"), []);
});

test("shows the seeded birthday once every April 5", () => {
  const events = restoreEvents(null);

  assert.deepEqual(getEventsForDate(events, "2026-04-05"), [BIRTHDAY_EVENT]);
  assert.deepEqual(getEventsForDate(events, "2027-04-05"), [BIRTHDAY_EVENT]);
  assert.deepEqual(getEventsForDate(events, "2027-04-06"), []);
});

test("matches an added yearly event on later years without duplicating its source date", () => {
  const yearlyEvent = { id: "yearly", text: "Anniversary", repeatYearly: true };
  const events = {
    "2026-08-17": [yearlyEvent],
  };

  assert.deepEqual(getEventsForDate(events, "2026-08-17"), [yearlyEvent]);
  assert.deepEqual(getEventsForDate(events, "2027-08-17"), [yearlyEvent]);
  assert.deepEqual(getEventsForDate(events, "2025-08-17"), []);
});

test("restores invalid or legacy storage without losing the birthday event", () => {
  assert.deepEqual(restoreEvents("not json"), {
    "2026-04-05": [BIRTHDAY_EVENT],
  });
  assert.deepEqual(restoreEvents(JSON.stringify({ "2026-10-01": [{ id: "legacy", text: "Legacy" }] })), {
    "2026-10-01": [{ id: "legacy", text: "Legacy" }],
    "2026-04-05": [BIRTHDAY_EVENT],
  });
});

test("keeps valid events when one persisted date is malformed", () => {
  const restoredEvents = restoreEvents(JSON.stringify({
    "2026-04-05": { broken: true },
    "2026-10-01": [{ id: "valid", text: "Keep me" }],
  }));

  assert.deepEqual(restoredEvents, {
    "2026-10-01": [{ id: "valid", text: "Keep me" }],
    "2026-04-05": [BIRTHDAY_EVENT],
  });
});

test("removes malformed event entries while keeping their valid siblings", () => {
  const restoredEvents = restoreEvents(JSON.stringify({
    "2026-10-01": [null, { id: "valid", text: "Keep me" }],
  }));

  assert.deepEqual(restoredEvents["2026-10-01"], [{ id: "valid", text: "Keep me" }]);
});
