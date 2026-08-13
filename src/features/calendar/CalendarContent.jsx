import React, { useState, useContext, useMemo, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FiHeart } from "react-icons/fi";
import { WindowContext } from "@/windows";
import {
  BIRTHDAY_EVENT,
  getEventsForDate as getEventsForDateKey,
  restoreEvents,
  restoreHiddenEventIds,
} from "./calendarModel";

// Списки календарей
const ICLOUD_CALENDARS = [
  { id: "home", name: "Home", color: "#a855f7", checked: true },
  { id: "calendar", name: "Calendar", color: "#f97316", checked: true },
  { id: "work", name: "Work", color: "#a855f7", checked: true },
];

const OTHER_CALENDARS = [
  { id: "birthdays", name: "Birthdays", color: "#6b7280", checked: true },
  { id: "siri", name: "Siri Suggestions", color: "#eab308", checked: true },
];

const isCalendar = (calendar) => (
  calendar &&
  typeof calendar === "object" &&
  typeof calendar.id === "string" &&
  typeof calendar.name === "string" &&
  typeof calendar.color === "string" &&
  typeof calendar.checked === "boolean"
);

export function CalendarContent() {
  const { onClose, onMinimize, onZoom, onTitleMouseDown } = useContext(WindowContext);

  const today = new Date();
  const [currentDate, setCurrentDate] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const [view, setView] = useState("Month");
  const [searchQuery, setSearchQuery] = useState("");

  // Календари (состояние чекбоксов)
  const [calendars, setCalendars] = useState(() => {
    try {
      const saved = localStorage.getItem("calendar-lists");
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed && Array.isArray(parsed.icloud) && Array.isArray(parsed.other)) {
        return {
          icloud: parsed.icloud.filter(isCalendar),
          other: parsed.other.filter(isCalendar),
        };
      }
    } catch {
      // Fall through to the default calendar lists.
    }

    return {
      icloud: ICLOUD_CALENDARS,
      other: OTHER_CALENDARS,
    };
  });

  // События (хранятся в localStorage)
  const [hiddenEventIds, setHiddenEventIds] = useState(() => (
    restoreHiddenEventIds(localStorage.getItem("calendar-hidden-events"))
  ));
  const [events, setEvents] = useState(() => {
    try {
      return restoreEvents(
        localStorage.getItem("calendar-events"),
        restoreHiddenEventIds(localStorage.getItem("calendar-hidden-events")),
      );
    } catch {
      return restoreEvents(null);
    }
  });

  // Сохранение при изменении
  React.useEffect(() => {
    try {
      localStorage.setItem("calendar-events", JSON.stringify(events));
    } catch {
      // ponytail: events still work for the open session if storage is unavailable.
    }
  }, [events]);

  React.useEffect(() => {
    try {
      localStorage.setItem("calendar-hidden-events", JSON.stringify(hiddenEventIds));
    } catch {
      // ponytail: a dismissed event stays dismissed for the open session.
    }
  }, [hiddenEventIds]);

  React.useEffect(() => {
    try {
      localStorage.setItem("calendar-lists", JSON.stringify(calendars));
    } catch {
      // ponytail: calendar list changes remain in memory if storage is unavailable.
    }
  }, [calendars]);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNamesShort = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const dayNamesFull = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Получаем дни месяца для основной сетки
  const daysInMonth = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const days = [];

    const startDay = firstDay.getDay();

    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(currentYear, currentMonth - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      });
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push({
        date: new Date(currentYear, currentMonth, day),
        isCurrentMonth: true,
      });
    }

    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(currentYear, currentMonth + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Мини-календарь
  const miniCalendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const days = [];

    const startDay = firstDay.getDay();

    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(currentYear, currentMonth, day));
    }

    return days;
  }, [currentYear, currentMonth]);

  const isToday = useCallback((date) => {
    if (!date) return false;
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }, [today]);

  const isSelected = useCallback((date) => {
    if (!date) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  }, [selectedDate]);

  const getEventsForDate = useCallback((date) => {
    if (!date) return [];
    const key = formatDateKey(date);
    return getEventsForDateKey(events, key);
  }, [events]);

  const formatDateKey = useCallback((date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }, []);

  const formatMonthYear = useCallback((date) => {
    return date.toLocaleDateString("en-US", { month: 'long', year: 'numeric' });
  }, []);

  // Навигация
  const prevMonth = useCallback(() => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  }, [currentYear, currentMonth]);

  const nextMonth = useCallback(() => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  }, [currentYear, currentMonth]);

  const goToToday = useCallback(() => {
    setCurrentDate(today);
    setSelectedDate(today);
  }, [today]);

  // Переключение календарей
  const toggleCalendar = useCallback((calendarId) => {
    setCalendars(prev => {
      const newCalendars = { ...prev };
      ['icloud', 'other'].forEach(section => {
        newCalendars[section] = newCalendars[section].map(cal =>
          cal.id === calendarId ? { ...cal, checked: !cal.checked } : cal
        );
      });
      return newCalendars;
    });
  }, []);

  // Управление событиями
  const [showEventInput, setShowEventInput] = useState(false);
  const [newEventText, setNewEventText] = useState("");
  const [newEventRepeatsYearly, setNewEventRepeatsYearly] = useState(false);
  const [eventForDate, setEventForDate] = useState(null);
  const [eventDetail, setEventDetail] = useState(null);
  const [eventDetailPosition, setEventDetailPosition] = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const eventDetailRef = useRef(null);
  const eventDetailTriggerRef = useRef(null);
  const toastTimerRef = useRef(null);
  const positionFrameRef = useRef(null);

  const closeEventDetail = useCallback((restoreFocus = true) => {
    setEventDetail(null);
    setEventDetailPosition(null);
    if (restoreFocus) eventDetailTriggerRef.current?.focus();
  }, []);

  const openEventDetail = useCallback((event, date, trigger) => {
    eventDetailTriggerRef.current = trigger;
    setEventDetailPosition(null);
    setEventDetail({ event, date });
  }, []);

  const showToast = useCallback((message) => {
    setToastMessage(message);
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMessage(""), 1800);
  }, []);

  const openEventInput = useCallback((date) => {
    setSelectedDate(date);
    setEventForDate(date);
    setShowEventInput(true);
    setNewEventText("");
    setNewEventRepeatsYearly(false);
  }, []);

  const handleDateClick = useCallback((date) => {
    if (eventDetail) {
      closeEventDetail();
      return;
    }
    openEventInput(date);
  }, [closeEventDetail, eventDetail, openEventInput]);

  const addEvent = useCallback(() => {
    if (!newEventText.trim() || !eventForDate) return;
    const key = formatDateKey(eventForDate);
    const newEvent = {
      id: Date.now(),
      text: newEventText.trim(),
      createdAt: new Date().toISOString(),
      allDay: true,
      repeatYearly: newEventRepeatsYearly,
    };
    setEvents(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), newEvent]
    }));
    setNewEventText("");
    setNewEventRepeatsYearly(false);
    setShowEventInput(false);
  }, [newEventText, newEventRepeatsYearly, eventForDate, formatDateKey]);

  const deleteEvent = useCallback((eventId, date) => {
    if (eventId === BIRTHDAY_EVENT.id) {
      setHiddenEventIds((ids) => ids.includes(eventId) ? ids : [...ids, eventId]);
    }
    setEvents(prev => Object.fromEntries(
      Object.entries(prev)
        .map(([key, dateEvents]) => [key, dateEvents.filter((event) => event.id !== eventId)])
        .filter(([, dateEvents]) => dateEvents.length > 0),
    ));
  }, []);

  const handleUnsubscribe = useCallback(() => {
    if (!eventDetail) return;
    const trigger = eventDetailTriggerRef.current;
    deleteEvent(eventDetail.event.id, eventDetail.date);
    showToast(`Berhenti berlangganan: ${eventDetail.event.text}`);
    closeEventDetail(false);
    trigger?.closest(".calendar-day")?.focus();
  }, [closeEventDetail, deleteEvent, eventDetail, showToast]);

  // Подсчёт событий для даты
  const getEventCount = useCallback((date) => {
    if (!date) return 0;
    return getEventsForDate(date).length;
  }, [getEventsForDate]);

  const updateEventDetailPosition = useCallback(() => {
    if (!eventDetail || !eventDetailRef.current || !eventDetailTriggerRef.current) return;

    const chipRect = eventDetailTriggerRef.current.getBoundingClientRect();
    const popover = eventDetailRef.current;
    const viewportWidth = window.innerWidth || 1024;
    const viewportHeight = window.innerHeight || 768;
    const popoverWidth = popover.offsetWidth || Math.min(520, viewportWidth - 20);
    const popoverHeight = popover.offsetHeight || 320;
    const centerY = chipRect.top + chipRect.height / 2;
    const gap = 14;
    let left = chipRect.right + gap;
    let flip = false;

    if (left + popoverWidth > viewportWidth - 8) {
      left = chipRect.left - gap - popoverWidth;
      flip = true;
    }

    if (left < 8) {
      left = Math.min(chipRect.right + gap, viewportWidth - popoverWidth - 8);
      flip = false;
    }
    left = Math.max(8, left);
    const top = Math.max(8, Math.min(centerY - popoverHeight / 2, viewportHeight - popoverHeight - 8));
    const arrowTop = Math.max(24, Math.min(centerY - top, popoverHeight - 24));

    setEventDetailPosition((previous) => {
      if (
        previous?.left === left &&
        previous?.top === top &&
        previous?.arrowTop === arrowTop &&
        previous?.flip === flip
      ) {
        return previous;
      }

      return { left, top, arrowTop, flip };
    });
  }, [eventDetail]);

  useLayoutEffect(() => {
    updateEventDetailPosition();
  }, [updateEventDetailPosition]);

  useEffect(() => {
    if (!eventDetail) return undefined;

    eventDetailRef.current?.focus();

    const dismissEventDetail = (event) => {
      if (event.type === "keydown" && event.key !== "Escape") return;
      if (event.type === "click" && event.target.closest(".calendar-event-detail, .calendar-day-event")) return;
      closeEventDetail();
    };

    document.addEventListener("click", dismissEventDetail);
    document.addEventListener("keydown", dismissEventDetail);
    window.addEventListener("resize", dismissEventDetail);
    return () => {
      document.removeEventListener("click", dismissEventDetail);
      document.removeEventListener("keydown", dismissEventDetail);
      window.removeEventListener("resize", dismissEventDetail);
    };
  }, [closeEventDetail, eventDetail, updateEventDetailPosition]);

  useEffect(() => {
    if (!eventDetail) return undefined;

    const schedulePositionUpdate = () => {
      if (positionFrameRef.current !== null) return;
      const requestFrame = window.requestAnimationFrame
        ? window.requestAnimationFrame.bind(window)
        : window.setTimeout.bind(window);
      positionFrameRef.current = requestFrame(() => {
        positionFrameRef.current = null;
        updateEventDetailPosition();
      });
    };

    window.addEventListener("scroll", schedulePositionUpdate, true);
    window.addEventListener("mousemove", schedulePositionUpdate);

    return () => {
      window.removeEventListener("scroll", schedulePositionUpdate, true);
      window.removeEventListener("mousemove", schedulePositionUpdate);
      if (positionFrameRef.current !== null) {
        window.cancelAnimationFrame?.(positionFrameRef.current);
        window.clearTimeout(positionFrameRef.current);
        positionFrameRef.current = null;
      }
    };
  }, [eventDetail, updateEventDetailPosition]);

  useEffect(() => () => window.clearTimeout(toastTimerRef.current), []);

  // Поиск событий
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const results = [];
    Object.entries(events).forEach(([dateKey, evts]) => {
      evts.forEach(evt => {
        if (evt.text.toLowerCase().includes(query)) {
          results.push({ ...evt, date: dateKey });
        }
      });
    });
    return results;
  }, [events, searchQuery]);

  return (
    <div className="calendar">
      {/* ── Title Bar ── */}
      <div className="calendar-titlebar" onMouseDown={(e) => !e.target.closest('.calendar-traffic-light') && onTitleMouseDown(e)}>
        <div className="calendar-traffic-lights">
          <button className="calendar-traffic-light calendar-traffic-light--close" onClick={onClose} />
          <button className="calendar-traffic-light calendar-traffic-light--minimize" onClick={onMinimize} />
          <button className="calendar-traffic-light calendar-traffic-light--zoom" onClick={onZoom} />
        </div>
        <div className="calendar-toolbar">
          <button className="calendar-toolbar-btn" onClick={goToToday}>Today</button>
          <div className="calendar-view-switcher">
            {['Day', 'Week', 'Month', 'Year'].map(v => (
              <button
                key={v}
                className={`calendar-view-btn ${view === v ? 'active' : ''}`}
                onClick={() => setView(v)}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="calendar-search">
            <svg className="calendar-search-icon" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
            </svg>
            <input
              type="text"
              className="calendar-search-input"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="calendar-body">
        {/* Sidebar */}
        <div className="calendar-sidebar">
          {/* Create Event Button */}
          <button className="calendar-create-btn" aria-label="Add event" onClick={() => openEventInput(selectedDate)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0a1 1 0 0 1 1 1v6h6a1 1 0 0 1 0 2H9v6a1 1 0 0 1-2 0V9H1a1 1 0 0 1 0-2h6V1a1 1 0 0 1 1-1z"/>
            </svg>
          </button>

          {/* Calendars List */}
          <div className="calendar-section">
            <span className="calendar-section-title">iCloud</span>
            {calendars.icloud.map(cal => (
              <label key={cal.id} className="calendar-list-item">
                <input
                  type="checkbox"
                  checked={cal.checked}
                  onChange={() => toggleCalendar(cal.id)}
                  style={{ accentColor: cal.color }}
                />
                <span className="calendar-list-color" style={{ backgroundColor: cal.color }} />
                <span className="calendar-list-name">{cal.name}</span>
              </label>
            ))}
          </div>

          <div className="calendar-section">
            <span className="calendar-section-title">Other</span>
            {calendars.other.map(cal => (
              <label key={cal.id} className="calendar-list-item">
                <input
                  type="checkbox"
                  checked={cal.checked}
                  onChange={() => toggleCalendar(cal.id)}
                  style={{ accentColor: cal.color }}
                />
                <span className="calendar-list-color" style={{ backgroundColor: cal.color }} />
                <span className="calendar-list-name">{cal.name}</span>
              </label>
            ))}
          </div>

          {/* Mini Calendar */}
          <div className="calendar-mini-wrapper">
            <div className="calendar-mini-header">
              <button className="calendar-mini-nav" onClick={prevMonth}>‹</button>
              <span className="calendar-mini-title">{monthNames[currentMonth]} {currentYear}</span>
              <button className="calendar-mini-nav" onClick={nextMonth}>›</button>
            </div>
            <div className="calendar-mini-grid">
              {dayNamesShort.map(day => (
                <div key={day} className="calendar-mini-day-name">{day}</div>
              ))}
              {miniCalendarDays.map((date, index) => {
                const hasEvents = date && getEventCount(date) > 0;
                return (
                  <div
                    key={index}
                    className={`calendar-mini-day ${!date ? 'empty' : ''} ${isToday(date) ? 'today' : ''} ${isSelected(date) ? 'selected' : ''}`}
                    onClick={() => date && handleDateClick(date)}
                  >
                    <span className="calendar-mini-day-num">{date?.getDate()}</span>
                    {hasEvents && <span className="calendar-mini-dot" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Calendar Grid */}
        <div className="calendar-main">
          {/* Header */}
          <div className="calendar-main-header">
            <h1 className="calendar-main-title">{formatMonthYear(currentDate)}</h1>
            <div className="calendar-main-nav">
              <button className="calendar-nav-btn" onClick={prevMonth}>‹</button>
              <button className="calendar-today-btn" onClick={goToToday}>Today</button>
              <button className="calendar-nav-btn" onClick={nextMonth}>›</button>
            </div>
          </div>

          {/* Day Names */}
          <div className="calendar-weekdays">
            {dayNamesFull.map((day, index) => (
              <div key={day} className="calendar-weekday">
                <span className="calendar-weekday-name">{dayNamesShort[index]}</span>
                <span className="calendar-weekday-full">{day}</span>
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="calendar-grid">
            {daysInMonth.map((item, index) => {
              const date = item.date;
              const isCurrentMonth = item.isCurrentMonth;
              const eventCount = getEventCount(date);
              const hasEvents = eventCount > 0;

              return (
                <div
                  key={index}
                  data-date={formatDateKey(date)}
                  tabIndex={-1}
                  className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday(date) ? 'today' : ''} ${isSelected(date) ? 'selected' : ''}`}
                  onClick={() => handleDateClick(date)}
                >
                  <span className="calendar-day-num">{date.getDate()}</span>
                  {hasEvents && (
                    <div className="calendar-day-events">
                      {getEventsForDate(date).slice(0, 3).map((evt, i) => (
                        <button
                          key={`${evt.id}-${i}`}
                          type="button"
                          className={`calendar-day-event ${evt.type === "birthday" ? "birthday" : ""}`}
                          aria-label={`Open ${evt.text}`}
                          title={evt.text}
                          onClick={(event) => {
                            event.stopPropagation();
                            openEventDetail(evt, date, event.currentTarget);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              event.stopPropagation();
                              openEventDetail(evt, date, event.currentTarget);
                            }
                          }}
                        >
                          <span className="calendar-event-indicator" aria-hidden="true">
                            {evt.type === "birthday" ? (
                              <FiHeart data-calendar-icon="heart" aria-hidden="true" />
                            ) : (
                              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 2h2v2h6V2h2v2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2V2zm-3 8v10h16V10H4z" /></svg>
                            )}
                          </span>
                          <span className="calendar-event-title">{evt.text}</span>
                        </button>
                      ))}
                      {eventCount > 3 && (
                        <div className="calendar-day-more">+{eventCount - 3} more</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Event Input Popup */}
          {showEventInput && eventForDate && (
            <div className="calendar-event-popup">
              <div className="calendar-event-popup-header">
                <span className="calendar-popup-title">
                  {formatMonthYear(eventForDate)} {eventForDate.getDate()}
                </span>
                <button className="calendar-popup-close" onClick={() => setShowEventInput(false)}>×</button>
              </div>
              <input
                type="text"
                className="calendar-popup-input"
                placeholder="Add event..."
                value={newEventText}
                onChange={(e) => setNewEventText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addEvent()}
                autoFocus
              />
              <label className="calendar-popup-repeat">
                <input
                  type="checkbox"
                  name="repeat-yearly"
                  checked={newEventRepeatsYearly}
                  onChange={(event) => setNewEventRepeatsYearly(event.target.checked)}
                />
                Repeat yearly
              </label>
              <button className="calendar-popup-add" onClick={addEvent}>Add</button>
            </div>
          )}
          {eventDetail && createPortal(
            <section
              ref={eventDetailRef}
              className={`calendar-event-detail calendar-event-detail--open ${eventDetailPosition?.flip ? "calendar-event-detail--flip" : ""}`}
              role="dialog"
              tabIndex={-1}
              aria-labelledby="calendar-event-detail-title"
              style={{
                top: `${eventDetailPosition?.top ?? 8}px`,
                left: `${eventDetailPosition?.left ?? 8}px`,
                "--calendar-event-arrow-top": `${eventDetailPosition?.arrowTop ?? 32}px`,
              }}
            >
              <div className="calendar-event-detail-section calendar-event-detail-header">
                <h2 id="calendar-event-detail-title">{eventDetail.event.text}</h2>
                <button type="button" className="calendar-event-detail-color" aria-label="Change event color" onClick={() => showToast("Pemilih warna (demo)")}>
                  <span className={`calendar-event-detail-dot ${eventDetail.event.type === "birthday" ? "birthday" : ""}`} aria-hidden="true" />
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 5l4 4H8l4-4zm0 14l-4-4h8l-4 4z" /></svg>
                </button>
              </div>

              <div className="calendar-event-detail-section calendar-event-detail-when">
                <div className="calendar-event-detail-when-text">
                  <span className="calendar-event-detail-date">{eventDetail.date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                  {eventDetail.event.repeatYearly && <span className="calendar-event-detail-repeat">Repeats yearly</span>}
                </div>
                <button type="button" className="calendar-event-detail-repeat-settings" aria-label="Repeat settings" onClick={() => showToast("Pengaturan pengulangan (demo)")}>
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" /></svg>
                </button>
              </div>

              <div className="calendar-event-detail-footer">
                <button type="button" className="calendar-event-detail-unsubscribe" onClick={handleUnsubscribe}>Unsubscribe</button>
              </div>
            </section>,
            document.querySelector(".desktop") || document.body,
          )}
          {toastMessage && createPortal(
            <div className="calendar-toast calendar-toast--show">{toastMessage}</div>,
            document.querySelector(".desktop") || document.body,
          )}
        </div>
      </div>
    </div>
  );
}
