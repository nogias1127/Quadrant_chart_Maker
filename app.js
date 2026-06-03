const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";

const CANVAS = {
  width: 768,
  height: 1024,
  plotX: 74,
  plotY: 326,
  plotW: 620,
  plotH: 620
};

const DEFAULT_STATE = {
  theme: "pinkPop",
  backgroundColor: "#ea7e95",
  panelColor: "#ffffff",
  gridColor: "#ef9aae",
  title: {
    text: "かに",
    x: 112,
    y: 120,
    size: 108,
    color: "#ffffff"
  },
  labels: {
    top: { text: "めちゃくちゃ喋る", x: 384, y: 292, size: 34, color: "#ffffff", anchor: "middle" },
    bottom: { text: "静かになる", x: 384, y: 1000, size: 34, color: "#ffffff", anchor: "middle" },
    left: { text: "剥くのが上手い", x: 38, y: 636, size: 32, color: "#ffffff", anchor: "middle", vertical: true },
    right: { text: "剥くのが下手", x: 732, y: 636, size: 32, color: "#ffffff", anchor: "middle", vertical: true }
  },
  items: []
};

let state = structuredClone(DEFAULT_STATE);
let selectedId = null;
let pendingMode = null;
let pendingImageSrc = null;
let drag = null;
let idCounter = 1;

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  bindElements();
  setupThemeSelect();
  bindEvents();
  syncControlsFromState();
  render();
});

function bindElements() {
  const ids = [
    "chartSvg",
    "themeSelect",
    "bgColorInput",
    "titleColorInput",
    "labelColorInput",
    "titleInput",
    "titleSizeInput",
    "labelSizeInput",
    "topLabelInput",
    "bottomLabelInput",
    "leftLabelInput",
    "rightLabelInput",
    "newTextInput",
    "newTextSizeInput",
    "newTextColorInput",
    "newTextVerticalInput",
    "addTextModeBtn",
    "imageInput",
    "newImageWidthInput",
    "newImageHeightInput",
    "addImageModeBtn",
    "modeHint",
    "selectedInfo",
    "selectedTextControls",
    "selectedTextInput",
    "selectedTextSizeInput",
    "selectedTextColorInput",
    "selectedTextVerticalInput",
    "selectedImageControls",
    "selectedImageWidthInput",
    "selectedImageHeightInput",
    "deleteSelectedBtn",
    "clearItemsBtn",
    "downloadPngBtn",
    "downloadSvgBtn"
  ];

  for (const id of ids) {
    els[id] = document.getElementById(id);
  }
}

function setupThemeSelect() {
  for (const [key, theme] of Object.entries(THEMES)) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = theme.name;
    els.themeSelect.appendChild(option);
  }
}

function bindEvents() {
  els.themeSelect.addEventListener("change", applyTheme);

  els.bgColorInput.addEventListener("input", () => {
    state.backgroundColor = els.bgColorInput.value;
    render();
  });

  els.titleColorInput.addEventListener("input", () => {
    state.title.color = els.titleColorInput.value;
    render();
  });

  els.labelColorInput.addEventListener("input", () => {
    for (const label of Object.values(state.labels)) {
      label.color = els.labelColorInput.value;
    }
    render();
  });

  els.titleInput.addEventListener("input", () => {
    state.title.text = els.titleInput.value;
    render();
  });

  els.titleSizeInput.addEventListener("input", () => {
    state.title.size = clampNumber(els.titleSizeInput.value, 20, 160, 108);
    render();
  });

  els.labelSizeInput.addEventListener("input", () => {
    const size = clampNumber(els.labelSizeInput.value, 12, 80, 34);
    for (const label of Object.values(state.labels)) {
      label.size = size;
    }
    render();
  });

  els.topLabelInput.addEventListener("input", () => {
    state.labels.top.text = els.topLabelInput.value;
    render();
  });

  els.bottomLabelInput.addEventListener("input", () => {
    state.labels.bottom.text = els.bottomLabelInput.value;
    render();
  });

  els.leftLabelInput.addEventListener("input", () => {
    state.labels.left.text = els.leftLabelInput.value;
    render();
  });

  els.rightLabelInput.addEventListener("input", () => {
    state.labels.right.text = els.rightLabelInput.value;
    render();
  });

  els.addTextModeBtn.addEventListener("click", () => {
    pendingMode = "text";
    selectedId = null;
    updateModeHint("文字を置きたい場所をクリック/タップしてください。");
    updateSelectedPanel();
    render();
  });

  els.imageInput.addEventListener("change", handleImageInput);

  els.addImageModeBtn.addEventListener("click", () => {
    if (!pendingImageSrc) return;
    pendingMode = "image";
    selectedId = null;
    updateModeHint("画像を置きたい場所をクリック/タップしてください。");
    updateSelectedPanel();
    render();
  });

  els.chartSvg.addEventListener("pointerdown", handlePointerDown);
  els.chartSvg.addEventListener("pointermove", handlePointerMove);
  els.chartSvg.addEventListener("pointerup", handlePointerUp);
  els.chartSvg.addEventListener("pointercancel", handlePointerUp);

  els.selectedTextInput.addEventListener("input", () => {
    const item = getSelectedItem();
    if (!item || item.type !== "text") return;
    item.text = els.selectedTextInput.value;
    render();
  });

  els.selectedTextSizeInput.addEventListener("input", () => {
    const item = getSelectedItem();
    if (!item || item.type !== "text") return;
    item.size = clampNumber(els.selectedTextSizeInput.value, 10, 180, 42);
    render();
  });

  els.selectedTextColorInput.addEventListener("input", () => {
    const item = getSelectedItem();
    if (!item || item.type !== "text") return;
    item.color = els.selectedTextColorInput.value;
    render();
  });

  els.selectedTextVerticalInput.addEventListener("change", () => {
    const item = getSelectedItem();
    if (!item || item.type !== "text") return;
    item.vertical = els.selectedTextVerticalInput.checked;
    render();
  });

  els.selectedImageWidthInput.addEventListener("input", () => {
    const item = getSelectedItem();
    if (!item || item.type !== "image") return;
    item.width = clampNumber(els.selectedImageWidthInput.value, 20, 700, 120);
    render();
  });

  els.selectedImageHeightInput.addEventListener("input", () => {
    const item = getSelectedItem();
    if (!item || item.type !== "image") return;
    item.height = clampNumber(els.selectedImageHeightInput.value, 20, 700, 120);
    render();
  });

  els.deleteSelectedBtn.addEventListener("click", deleteSelectedItem);

  els.clearItemsBtn.addEventListener("click", () => {
    if (!state.items.length) return;
    if (!confirm("配置した文字・画像をすべて削除しますか？")) return;
    state.items = [];
    selectedId = null;
    updateSelectedPanel();
    render();
  });

  els.downloadPngBtn.addEventListener("click", downloadPng);
  els.downloadSvgBtn.addEventListener("click", downloadSvg);

  document.addEventListener("keydown", (event) => {
    if ((event.key === "Delete" || event.key === "Backspace") && selectedId) {
      const active = document.activeElement;
      if (active && ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName)) return;
      deleteSelectedItem();
    }

    if (event.key === "Escape") {
      pendingMode = null;
      drag = null;
      updateModeHint("通常モード：要素をクリック/タップすると選択、ドラッグで移動できます。");
      render();
    }
  });
}

function syncControlsFromState() {
  els.themeSelect.value = state.theme;
  els.bgColorInput.value = state.backgroundColor;
  els.titleColorInput.value = state.title.color;
  els.labelColorInput.value = state.labels.top.color;
  els.titleInput.value = state.title.text;
  els.titleSizeInput.value = state.title.size;
  els.labelSizeInput.value = state.labels.top.size;
  els.topLabelInput.value = state.labels.top.text;
  els.bottomLabelInput.value = state.labels.bottom.text;
  els.leftLabelInput.value = state.labels.left.text;
  els.rightLabelInput.value = state.labels.right.text;
}

function applyTheme() {
  const key = els.themeSelect.value;
  const theme = THEMES[key];
  if (!theme) return;

  state.theme = key;
  state.backgroundColor = theme.background;
  state.panelColor = theme.panel;
  state.gridColor = theme.grid;
  state.title.color = theme.title;

  for (const label of Object.values(state.labels)) {
    label.color = theme.text;
  }

  syncControlsFromState();
  render();
}

function handleImageInput(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("画像ファイルを選んでください。");
    event.target.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    pendingImageSrc = reader.result;
    els.addImageModeBtn.disabled = false;
    updateModeHint("画像を読み込みました。「画像を置く場所を選ぶ」を押してください。");
  };
  reader.readAsDataURL(file);
}

function render() {
  const svg = els.chartSvg;
  removeAllChildren(svg);
  svg.setAttribute("width", CANVAS.width);
  svg.setAttribute("height", CANVAS.height);
  svg.setAttribute("viewBox", `0 0 ${CANVAS.width} ${CANVAS.height}`);

  appendRect(svg, 0, 0, CANVAS.width, CANVAS.height, state.backgroundColor);

  drawDecorations(svg);
  drawBaseChart(svg);
  drawText(svg, state.title);
  drawLabel(svg, state.labels.top);
  drawLabel(svg, state.labels.bottom);
  drawVerticalLabel(svg, state.labels.left);
  drawVerticalLabel(svg, state.labels.right);

  for (const item of state.items) {
    drawItem(svg, item);
  }

  drawSelection(svg);
}

function drawDecorations(svg) {
  const group = createSvgElement("g");
  group.setAttribute("opacity", "0.95");

  // Simple decorative sun/crab-like icons, intentionally generic.
  appendCircle(group, 610, 76, 36, state.title.color);
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI * 2 * i) / 10;
    appendLine(
      group,
      610 + Math.cos(angle) * 48,
      76 + Math.sin(angle) * 48,
      610 + Math.cos(angle) * 64,
      76 + Math.sin(angle) * 64,
      state.title.color,
      5
    );
  }

  appendCircle(group, 708, 112, 21, state.title.color);
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8;
    appendLine(
      group,
      708 + Math.cos(angle) * 30,
      112 + Math.sin(angle) * 30,
      708 + Math.cos(angle) * 40,
      112 + Math.sin(angle) * 40,
      state.title.color,
      4
    );
  }

  svg.appendChild(group);
}

function drawBaseChart(svg) {
  appendRect(svg, CANVAS.plotX, CANVAS.plotY, CANVAS.plotW, CANVAS.plotH, state.panelColor);

  appendLine(
    svg,
    CANVAS.plotX + CANVAS.plotW / 2,
    CANVAS.plotY,
    CANVAS.plotX + CANVAS.plotW / 2,
    CANVAS.plotY + CANVAS.plotH,
    state.gridColor,
    2
  );

  appendLine(
    svg,
    CANVAS.plotX,
    CANVAS.plotY + CANVAS.plotH / 2,
    CANVAS.plotX + CANVAS.plotW,
    CANVAS.plotY + CANVAS.plotH / 2,
    state.gridColor,
    2
  );
}

function drawLabel(svg, label) {
  drawText(svg, {
    text: label.text,
    x: label.x,
    y: label.y,
    size: label.size,
    color: label.color,
    anchor: label.anchor || "middle"
  });
}

function drawVerticalLabel(svg, label) {
  drawVerticalText(svg, {
    text: label.text,
    x: label.x,
    y: label.y,
    size: label.size,
    color: label.color,
    anchor: label.anchor || "middle",
    lineGap: 1.05
  });
}

function drawItem(svg, item) {
  const group = createSvgElement("g");
  group.classList.add("chart-item");
  group.dataset.itemId = item.id;
  group.setAttribute("tabindex", "0");

  if (item.type === "text") {
    if (item.vertical) {
      drawVerticalText(group, item);
    } else {
      drawText(group, item);
    }
  } else if (item.type === "image") {
    const image = createSvgElement("image");
    image.setAttribute("x", item.x - item.width / 2);
    image.setAttribute("y", item.y - item.height / 2);
    image.setAttribute("width", item.width);
    image.setAttribute("height", item.height);
    image.setAttribute("preserveAspectRatio", "xMidYMid meet");
    image.setAttributeNS(XLINK_NS, "href", item.src);
    image.setAttribute("href", item.src);
    group.appendChild(image);
  }

  svg.appendChild(group);
}

function drawSelection(svg) {
  const item = getSelectedItem();
  if (!item) return;

  let box;
  if (item.type === "image") {
    box = {
      x: item.x - item.width / 2,
      y: item.y - item.height / 2,
      w: item.width,
      h: item.height
    };
  } else {
    const textLength = [...item.text].length || 1;
    if (item.vertical) {
      box = {
        x: item.x - item.size * 0.7,
        y: item.y - (textLength * item.size * 1.05) / 2,
        w: item.size * 1.4,
        h: textLength * item.size * 1.05
      };
    } else {
      box = {
        x: item.x - (textLength * item.size * 0.58) / 2,
        y: item.y - item.size * 0.9,
        w: textLength * item.size * 0.58,
        h: item.size * 1.2
      };
    }
  }

  const rect = createSvgElement("rect");
  rect.setAttribute("class", "selection-box");
  rect.setAttribute("x", box.x - 6);
  rect.setAttribute("y", box.y - 6);
  rect.setAttribute("width", box.w + 12);
  rect.setAttribute("height", box.h + 12);
  svg.appendChild(rect);
}

function handlePointerDown(event) {
  const point = getSvgPoint(event);

  if (pendingMode === "text") {
    addTextItem(point);
    return;
  }

  if (pendingMode === "image") {
    addImageItem(point);
    return;
  }

  const group = event.target.closest && event.target.closest(".chart-item");
  if (!group) {
    selectedId = null;
    updateSelectedPanel();
    render();
    return;
  }

  const itemId = group.dataset.itemId;
  const item = state.items.find((entry) => entry.id === itemId);
  if (!item) return;

  selectedId = item.id;
  drag = {
    id: item.id,
    startX: point.x,
    startY: point.y,
    itemX: item.x,
    itemY: item.y
  };

  els.chartSvg.setPointerCapture(event.pointerId);
  updateSelectedPanel();
  render();
}

function handlePointerMove(event) {
  if (!drag) return;
  const item = state.items.find((entry) => entry.id === drag.id);
  if (!item) return;

  const point = getSvgPoint(event);
  item.x = drag.itemX + (point.x - drag.startX);
  item.y = drag.itemY + (point.y - drag.startY);
  render();
}

function handlePointerUp(event) {
  if (!drag) return;
  try {
    els.chartSvg.releasePointerCapture(event.pointerId);
  } catch {
    // pointer capture may already be released in some browsers
  }
  drag = null;
  updateSelectedPanel();
}

function addTextItem(point) {
  const text = els.newTextInput.value || "テキスト";
  const item = {
    id: createId(),
    type: "text",
    text,
    x: point.x,
    y: point.y,
    size: clampNumber(els.newTextSizeInput.value, 10, 160, 42),
    color: els.newTextColorInput.value,
    vertical: els.newTextVerticalInput.checked
  };

  state.items.push(item);
  selectedId = item.id;
  pendingMode = null;
  updateModeHint("通常モード：要素をクリック/タップすると選択、ドラッグで移動できます。");
  updateSelectedPanel();
  render();
}

function addImageItem(point) {
  if (!pendingImageSrc) return;

  const item = {
    id: createId(),
    type: "image",
    src: pendingImageSrc,
    x: point.x,
    y: point.y,
    width: clampNumber(els.newImageWidthInput.value, 20, 500, 120),
    height: clampNumber(els.newImageHeightInput.value, 20, 500, 120)
  };

  state.items.push(item);
  selectedId = item.id;
  pendingMode = null;
  updateModeHint("通常モード：要素をクリック/タップすると選択、ドラッグで移動できます。");
  updateSelectedPanel();
  render();
}

function updateSelectedPanel() {
  const item = getSelectedItem();

  els.selectedTextControls.classList.add("hidden");
  els.selectedImageControls.classList.add("hidden");
  els.deleteSelectedBtn.disabled = !item;

  if (!item) {
    els.selectedInfo.textContent = "未選択です。";
    return;
  }

  els.selectedInfo.textContent = item.type === "text" ? "文字要素を選択中です。" : "画像要素を選択中です。";

  if (item.type === "text") {
    els.selectedTextControls.classList.remove("hidden");
    els.selectedTextInput.value = item.text;
    els.selectedTextSizeInput.value = item.size;
    els.selectedTextColorInput.value = item.color;
    els.selectedTextVerticalInput.checked = !!item.vertical;
  }

  if (item.type === "image") {
    els.selectedImageControls.classList.remove("hidden");
    els.selectedImageWidthInput.value = Math.round(item.width);
    els.selectedImageHeightInput.value = Math.round(item.height);
  }
}

function deleteSelectedItem() {
  if (!selectedId) return;
  state.items = state.items.filter((item) => item.id !== selectedId);
  selectedId = null;
  updateSelectedPanel();
  render();
}

function getSelectedItem() {
  return state.items.find((item) => item.id === selectedId) || null;
}

function updateModeHint(text) {
  els.modeHint.textContent = text;
}

function getSvgPoint(event) {
  const svg = els.chartSvg;
  const pt = svg.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

function createId() {
  const id = `item-${Date.now()}-${idCounter}`;
  idCounter += 1;
  return id;
}

function clampNumber(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function drawText(parent, config) {
  const text = createSvgElement("text");
  text.textContent = config.text;
  text.setAttribute("x", config.x);
  text.setAttribute("y", config.y);
  text.setAttribute("fill", config.color);
  text.setAttribute("font-size", config.size);
  text.setAttribute("font-weight", "800");
  text.setAttribute("font-family", 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", "Yu Gothic", sans-serif');
  text.setAttribute("text-anchor", config.anchor || "middle");
  text.setAttribute("dominant-baseline", "middle");
  text.setAttribute("paint-order", "stroke");
  parent.appendChild(text);
}

function drawVerticalText(parent, config) {
  const chars = [...(config.text || "")];
  const text = createSvgElement("text");
  text.setAttribute("x", config.x);
  text.setAttribute("y", config.y);
  text.setAttribute("fill", config.color);
  text.setAttribute("font-size", config.size);
  text.setAttribute("font-weight", "800");
  text.setAttribute("font-family", 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI Emoji", "Hiragino Sans", "Yu Gothic", sans-serif');
  text.setAttribute("text-anchor", config.anchor || "middle");
  text.setAttribute("dominant-baseline", "middle");

  const gap = config.size * (config.lineGap || 1.05);
  const startY = config.y - ((chars.length - 1) * gap) / 2;

  chars.forEach((char, index) => {
    const tspan = createSvgElement("tspan");
    tspan.textContent = char;
    tspan.setAttribute("x", config.x);
    tspan.setAttribute("y", startY + index * gap);
    text.appendChild(tspan);
  });

  parent.appendChild(text);
}

function appendRect(parent, x, y, width, height, fill) {
  const rect = createSvgElement("rect");
  rect.setAttribute("x", x);
  rect.setAttribute("y", y);
  rect.setAttribute("width", width);
  rect.setAttribute("height", height);
  rect.setAttribute("fill", fill);
  parent.appendChild(rect);
  return rect;
}

function appendCircle(parent, cx, cy, r, fill) {
  const circle = createSvgElement("circle");
  circle.setAttribute("cx", cx);
  circle.setAttribute("cy", cy);
  circle.setAttribute("r", r);
  circle.setAttribute("fill", fill);
  parent.appendChild(circle);
  return circle;
}

function appendLine(parent, x1, y1, x2, y2, stroke, strokeWidth) {
  const line = createSvgElement("line");
  line.setAttribute("x1", x1);
  line.setAttribute("y1", y1);
  line.setAttribute("x2", x2);
  line.setAttribute("y2", y2);
  line.setAttribute("stroke", stroke);
  line.setAttribute("stroke-width", strokeWidth);
  line.setAttribute("stroke-linecap", "round");
  parent.appendChild(line);
  return line;
}

function createSvgElement(tagName) {
  return document.createElementNS(SVG_NS, tagName);
}

function removeAllChildren(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function prepareSvgString() {
  const currentSelected = selectedId;
  selectedId = null;
  render();

  const clone = els.chartSvg.cloneNode(true);
  clone.setAttribute("xmlns", SVG_NS);
  clone.setAttribute("xmlns:xlink", XLINK_NS);
  clone.setAttribute("width", CANVAS.width);
  clone.setAttribute("height", CANVAS.height);

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);

  selectedId = currentSelected;
  render();

  return `<?xml version="1.0" encoding="UTF-8"?>\n${svgString}`;
}

function downloadSvg() {
  const svgString = prepareSvgString();
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob(blob, createFilename("svg"));
}

function downloadPng() {
  const svgString = prepareSvgString();
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const image = new Image();

  image.onload = () => {
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS.width * scale;
    canvas.height = CANVAS.height * scale;

    const ctx = canvas.getContext("2d");
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.drawImage(image, 0, 0);

    URL.revokeObjectURL(url);

    canvas.toBlob((blob) => {
      if (!blob) {
        alert("PNG保存に失敗しました。SVG保存を試してください。");
        return;
      }
      downloadBlob(blob, createFilename("png"));
    }, "image/png");
  };

  image.onerror = () => {
    URL.revokeObjectURL(url);
    alert("PNG保存に失敗しました。SVG保存を試してください。");
  };

  image.src = url;
}

function createFilename(extension) {
  const now = new Date();
  const pad = (num) => String(num).padStart(2, "0");
  const timestamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "_",
    pad(now.getHours()),
    pad(now.getMinutes())
  ].join("");

  return `quadrant-chart-${timestamp}.${extension}`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
