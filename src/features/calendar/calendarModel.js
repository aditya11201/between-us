export const BIRTHDAY_EVENT = {
  id: "birthday-april-5",
  text: "The day my dream came to life",
  allDay: true,
  repeatYearly: true,
  type: "birthday",
};

const BIRTHDAY_DATE_KEY = "2026-04-05";

function isEvent(value) {
  return value && typeof value === "object" && typeof value.text === "string";
}

function normalizeEvent(event) {
  return event.id === BIRTHDAY_EVENT.id ? { ...event, ...BIRTHDAY_EVENT } : event;
}

function hasBirthday(events) {
  return Object.values(events).some((dateEvents) =>
    Array.isArray(dateEvents) && dateEvents.some((event) => event?.id === BIRTHDAY_EVENT.id),
  );
}

export function restoreHiddenEventIds(savedIds) {
  try {
    const parsedIds = savedIds ? JSON.parse(savedIds) : [];
    return Array.isArray(parsedIds) ? parsedIds.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function removeHiddenEvents(events, hiddenEventIds) {
  return Object.fromEntries(
    Object.entries(events)
      .map(([dateKey, dateEvents]) => [
        dateKey,
        dateEvents.filter((event) => !hiddenEventIds.includes(event.id)),
      ])
      .filter(([, dateEvents]) => dateEvents.length > 0),
  );
}

export function restoreEvents(savedEvents, hiddenEventIds = []) {
  const birthdayHidden = hiddenEventIds.includes(BIRTHDAY_EVENT.id);

  try {
    const parsedEvents = savedEvents ? JSON.parse(savedEvents) : {};
    const restoredEvents = parsedEvents && typeof parsedEvents === "object" && !Array.isArray(parsedEvents)
      ? Object.fromEntries(
        Object.entries(parsedEvents)
          .filter(([, dateEvents]) => Array.isArray(dateEvents))
          .map(([dateKey, dateEvents]) => [dateKey, dateEvents.filter(isEvent).map(normalizeEvent)]),
      )
      : {};

    if (birthdayHidden) return removeHiddenEvents(restoredEvents, hiddenEventIds);
    if (hasBirthday(restoredEvents)) return restoredEvents;

    return {
      ...restoredEvents,
      [BIRTHDAY_DATE_KEY]: [...(restoredEvents[BIRTHDAY_DATE_KEY] || []), BIRTHDAY_EVENT],
    };
  } catch {
    return birthdayHidden ? {} : { [BIRTHDAY_DATE_KEY]: [BIRTHDAY_EVENT] };
  }
}

export function getEventsForDate(events, dateKey) {
  const exactEvents = Array.isArray(events[dateKey]) ? events[dateKey].filter(isEvent) : [];
  const monthDay = dateKey.slice(5);
  const targetYear = Number(dateKey.slice(0, 4));
  const recurringEvents = Object.entries(events).flatMap(([eventDate, dateEvents]) => {
    const sourceYear = Number(eventDate.slice(0, 4));

    if (eventDate === dateKey || sourceYear >= targetYear || eventDate.slice(5) !== monthDay) {
      return [];
    }

    return Array.isArray(dateEvents)
      ? dateEvents.filter((event) => isEvent(event) && event.repeatYearly)
      : [];
  });

  return [...exactEvents, ...recurringEvents];
}
