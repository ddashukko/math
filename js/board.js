const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const boardSection = document.getElementById("board-section");
let painting = false;
let tool = "pen"; // 'pen' або 'eraser'

// --- НАЛАШТУВАННЯ РОЗМІРУ ---
function resizeCanvas() {
  if (!boardSection || boardSection.style.display === "none") return;

  // Зберігаємо малюнок перед зміною розміру
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  if (canvas.width > 0 && canvas.height > 0) {
    tempCtx.drawImage(canvas, 0, 0);
  }

  // Змінюємо розмір
  canvas.width = boardSection.offsetWidth;
  canvas.height = boardSection.offsetHeight;

  // Відновлюємо малюнок
  ctx.drawImage(tempCanvas, 0, 0);

  // Налаштування ліній
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
  document.getElementById(btnId).classList.add("active");
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
