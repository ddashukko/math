const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const boardSection = document.getElementById("board-section");
let painting = false;
let tool = "pen"; // 'pen' або 'eraser'

// --- НАЛАШТУВАННЯ РОЗМІРУ (З ЗАХИСТОМ ВІД ПОМИЛОК) ---
function resizeCanvas() {
  // Якщо дошки немає або вона прихована (ширина 0) — нічого не робимо
  if (
    !boardSection ||
    boardSection.clientWidth === 0 ||
    boardSection.clientHeight === 0
  )
    return;

  // Зберігаємо малюнок перед зміною розміру
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");

  // Якщо старий канвас мав нормальний розмір, зберігаємо його
  if (canvas.width > 0 && canvas.height > 0) {
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    tempCtx.drawImage(canvas, 0, 0);
  }

  // Змінюємо розмір реального канвасу під розмір блоку
  canvas.width = boardSection.offsetWidth;
  canvas.height = boardSection.offsetHeight;

  // Відновлюємо малюнок (тільки якщо є що відновлювати)
  if (tempCanvas.width > 0 && tempCanvas.height > 0) {
    ctx.drawImage(tempCanvas, 0, 0);
  }

  // Налаштування ліній (злітають при зміні розміру, тому ставимо заново)
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

window.addEventListener("resize", resizeCanvas);
// Затримка для коректного завантаження
setTimeout(resizeCanvas, 100);

// --- МАЛЮВАННЯ ---
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

  const rect = canvas.getBoundingClientRect();
  // Підтримка Touch (телефони) і Mouse (комп'ютер)
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;

  const x = clientX - rect.left;
  const y = clientY - rect.top;

  if (tool === "pen") {
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#2563eb"; // Синій колір ручки
    ctx.globalCompositeOperation = "source-over";
  } else {
    ctx.lineWidth = 30; // Гумка товстіша
    ctx.strokeStyle = "#ffffff";
    ctx.globalCompositeOperation = "destination-out";
  }

  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
}

// Події миші
canvas.addEventListener("mousedown", startPosition);
canvas.addEventListener("mouseup", finishedPosition);
canvas.addEventListener("mousemove", draw);

// Події тачскріну (для планшетів)
canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  startPosition(e);
});
canvas.addEventListener("touchend", (e) => {
  e.preventDefault();
  finishedPosition();
});
canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  draw(e);
});

// --- ІНСТРУМЕНТИ ---
function setTool(t) {
  tool = t;
  document
    .querySelectorAll(".tool-btn")
    .forEach((b) => b.classList.remove("active"));

  const btnId = t === "pen" ? "btn-pen" : "btn-eraser";
  const btn = document.getElementById(btnId);
  if (btn) btn.classList.add("active");
}

function clearBoard() {
  if (confirm("Очистити все?")) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

// --- ПЕРЕМИКАЧ ВИДИМОСТІ ДОШКИ ---
function toggleBoard() {
  document.body.classList.toggle("board-hidden");

  // Оновлюємо розмір canvas після анімації CSS
  setTimeout(resizeCanvas, 350);
}

// Робимо функції доступними глобально
window.setTool = setTool;
window.clearBoard = clearBoard;
window.toggleBoard = toggleBoard;
