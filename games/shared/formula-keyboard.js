import {attachFormulaShortcuts} from "./formula-shortcuts.js";
function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k,v] of Object.entries(attrs)) {
    if (k === "text") node.textContent = v;
    else if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const child of children) node.append(child);
  return node;
}
const symbols = [["¬","שלילה"],["∧","וגם"],["∨","או"],["⊕","או מוציא (XOR)"],["→","גרירה"],["↔","אם ורק אם"],["(","סוגר פותח"],[")","סוגר סוגר"],["T","אמת"],["F","שקר"]];

// Show symbols only for the field being edited. Keyboard users can Tab into
// the panel; pointer users keep the caret and selection in the input.
let pointerActive = false;
const pendingHides = new Set();
if(typeof document!=='undefined')document.addEventListener('pointerdown', () => { pointerActive = true; }, true);
function finishPointer() {
  pointerActive = false;
  // Removing a panel during pointerdown can move the clicked control before
  // mouseup, swallowing its click. Wait until that click has been dispatched.
  setTimeout(() => {
    for (const hide of pendingHides) hide();
    pendingHides.clear();
  }, 0);
}
if(typeof document!=='undefined')document.addEventListener('pointerup', finishPointer, true);
if(typeof document!=='undefined')document.addEventListener('pointercancel', finishPointer, true);
export function contextualKeyboard(input, panel, {shortcuts=true}={}) {
  if(shortcuts)attachFormulaShortcuts(input,panel);
  panel.classList.add('field-symbol-keyboard');
  const show = () => {
    if(input.readOnly||input.disabled){panel.hidden=true;return;}
    // Put this field's keyboard directly below its input/label, including
    // fields inserted dynamically by the proof and substitution editors.
    const label=input.closest('label');
    const anchor=label&&label.querySelectorAll('input,textarea').length===1?label:input;
    if(anchor.nextElementSibling!==panel)anchor.after(panel);
    panel.hidden = false;
  };
  const hide = () => {
    panel.hidden = document.activeElement !== input && !panel.contains(document.activeElement);
  };
  const leave = event => {
    if (event.relatedTarget === input || panel.contains(event.relatedTarget)) return;
    if (pointerActive) pendingHides.add(hide);
    else panel.hidden = true;
  };
  panel.hidden = document.activeElement !== input;
  input.addEventListener('focus', show);
  input.addEventListener('blur', leave);
  panel.addEventListener('focusin', show);
  panel.addEventListener('focusout', leave);
  panel.addEventListener('pointerdown', event => {
    if (event.button === 0 && event.target.closest('button')) event.preventDefault();
  });
  return panel;
}

export function keyboard(input, changed) {
  return contextualKeyboard(input, el("div", { class: "bk-keys", role: "group", "aria-label": "סמלים לנוסחה" },
    symbols.map(([symbol, name]) => el("button", {
      type: "button", class: "bk-key", text: symbol, "aria-label": name,
      onclick() {
        const a = input.selectionStart ?? input.value.length, b = input.selectionEnd ?? a;
        if (input.value.length - (b-a) + symbol.length > 240) return;
        input.value = input.value.slice(0,a) + symbol + input.value.slice(b);
        input.focus(); input.setSelectionRange(a+symbol.length,a+symbol.length);
        changed();
      },
    }))));
}

