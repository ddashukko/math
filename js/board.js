const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const boardSection = document.getElementById("board-section");

let painting = false;
let tool = "pen";

// Отримуємо щільність пікселів (для Retina/Mobile екранів)
const getDPR = () => window.devicePixelRatio || 1;

function resizeCanvas() {
  const rect = boardSection.getBoundingClientRect();

  // Якщо дошка схована - нічого не робимо
  if (rect.width === 0 || rect.height === 0) return;

  // 1. Зберігаємо поточний малюнок у тимчасовий канвас
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  if (canvas.width > 0) {
    tempCtx.drawImage(canvas, 0, 0);
  }

  // 2. Встановлюємо нові розміри з урахуванням DPI (чіткість)
  const dpr = getDPR();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  // Важливо: CSS розміри мають залишатися 100%
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;

  // 3. Масштабуємо контекст, щоб малювати в логічних пікселях
  ctx.scale(dpr, dpr);

  // Відновлюємо налаштування ліній
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  updateToolSettings();

  // 4. Відновлюємо малюнок
  if (tempCanvas.width > 0) {
    ctx.save();
    ctx.scale(1 / dpr, 1 / dpr); // Скидаємо масштаб для drawImage
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.restore();
  }
}

// Слідкуємо за зміною розміру контейнера (надійніше за window.resize)
const resizeObserver = new ResizeObserver(() => {
  // Викликаємо ресайз тільки якщо розміри дійсно змінились
  if (canvas.style.width !== `${boardSection.offsetWidth}px`) {
    resizeCanvas();
  }
});
resizeObserver.observe(boardSection);

function startPosition(e) {
  painting = true;
  draw(e);
}

function finishedPosition() {
  painting = false;
  ctx.beginPath();
}

function draw(e) {
  if (!painting) return;

  // Отримуємо координати події (Touch або Mouse)
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;

  // Отримуємо точні координати полотна на екрані
  const rect = canvas.getBoundingClientRect();

  // Вираховуємо координату точки малювання (x, y)
  // ВАЖЛИВО: Не треба множити на DPR, бо ми зробили ctx.scale()
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
}

function updateToolSettings() {
  if (tool === "pen") {
    ctx.lineWidth = 2; // Товщина лінії
    ctx.strokeStyle = "#2563eb"; // Синій колір
    ctx.globalCompositeOperation = "source-over";
  } else {
    ctx.lineWidth = 30; // Товщина гумки
    ctx.strokeStyle = "#ffffff";
    // Важливо для правильного стирання на прозорому фоні (якщо буде)
    // Але для білого фону destination-out може робити дірку до background-image
    // Тому краще просто малювати білим, якщо фон білий.
    // Якщо хочеш стирати до клітинок - використовуй "destination-out"
    ctx.globalCompositeOperation = "destination-out";
  }
}

// --- LISTENERS ---
canvas.addEventListener("mousedown", startPosition);
canvas.addEventListener("mouseup", finishedPosition);
canvas.addEventListener("mousemove", draw);

// Touch події (passive: false обов'язково для блокування скролу)
canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    startPosition(e);
  },
  { passive: false },
);

canvas.addEventListener(
  "touchend",
  (e) => {
    e.preventDefault();
    finishedPosition();
  },
  { passive: false },
);

canvas.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();
    draw(e);
  },
  { passive: false },
);

function setTool(t) {
  tool = t;
  document
    .querySelectorAll(".tool-btn")
    .forEach((b) => b.classList.remove("active"));

  const btnId = t === "pen" ? "btn-pen" : "btn-eraser";
  const btn = document.getElementById(btnId);
  if (btn) btn.classList.add("active");

  updateToolSettings();
}

function clearBoard() {
  if (confirm("Очистити все?")) {
    // Очищаємо з урахуванням масштабу
    const dpr = getDPR();
    // width/height у нас збільшені на dpr, а ми в масштабованому контексті
    // тому ділимо на dpr або використовуємо getBoundingClientRect
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
  }
}

function toggleBoard() {
  document.body.classList.toggle("board-hidden");
  // ResizeObserver сам побачить зміну розміру і викличе resizeCanvas
}

// Експорт функцій у глобальну область
window.setTool = setTool;
window.clearBoard = clearBoard;
window.toggleBoard = toggleBoard;

// Первинний запуск
setTimeout(resizeCanvas, 100);
