export function createDom(act, browserWindow, document) {
  function dispatch(el, type, init = {}) {
    const EventConstructor = type === "keydown"
      ? browserWindow.KeyboardEvent
      : browserWindow.MouseEvent;
    const event = new EventConstructor(type, {
      bubbles: true,
      cancelable: true,
      ...init,
    });
    el.dispatchEvent(event);
    return event;
  }

  function click(el) {
    return act(async () => {
      dispatch(el, "click");
    });
  }

  function doubleClick(el) {
    return act(async () => {
      el.dispatchEvent(new browserWindow.MouseEvent("dblclick", { bubbles: true }));
    });
  }

  function setValue(input, value) {
    const setter = Object.getOwnPropertyDescriptor(
      browserWindow.HTMLInputElement.prototype,
      "value",
    ).set;
    setter.call(input, value);
    input.dispatchEvent(new browserWindow.Event("input", { bubbles: true }));
    input.dispatchEvent(new browserWindow.Event("change", { bubbles: true }));
  }

  function fill(input, value) {
    return act(async () => {
      setValue(input, value);
    });
  }

  function pressEscape() {
    return act(async () => {
      dispatch(document, "keydown", { key: "Escape" });
    });
  }

  return { click, doubleClick, dispatch, setValue, fill, pressEscape };
}
