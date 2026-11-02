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
const symbols = [["¬","שלילה"],["∧","וגם"],["∨","או"],["→","גרירה"],["↔","אם ורק אם"],["(","סוגר פותח"],[")","סוגר סוגר"],["T","אמת"],["F","שקר"]];

export function keyboard(input, changed) {
  return el("div", { class: "bk-keys", role: "group", "aria-label": "סמלים לנוסחה" },
    symbols.map(([symbol, name]) => el("button", {
      type: "button", class: "bk-key", text: symbol, "aria-label": name,
      onclick() {
        const a = input.selectionStart ?? input.value.length, b = input.selectionEnd ?? a;
        if (input.value.length - (b-a) + symbol.length > 240) return;
        input.value = input.value.slice(0,a) + symbol + input.value.slice(b);
        input.focus(); input.setSelectionRange(a+symbol.length,a+symbol.length);
        changed();
      },
    })));
}

