const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const boardSection = document.getElementById("board-section");
let painting = false;
let tool = "pen";

function resizeCanvas() {
  if (
    !boardSection ||
    boardSection.offsetWidth === 0 ||
    boardSection.offsetHeight === 0
  )
    return;

  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");

  if (canvas.width > 0 && canvas.height > 0) {
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    tempCtx.drawImage(canvas, 0, 0);
  }

  canvas.width = boardSection.offsetWidth;
  canvas.height = boardSection.offsetHeight;

  if (tempCanvas.width > 0 && tempCanvas.height > 0) {
    ctx.drawImage(tempCanvas, 0, 0);
  }

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

window.addEventListener("resize", resizeCanvas);
setTimeout(resizeCanvas, 100);

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
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  if (tool === "pen") {
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#2563eb";
    ctx.globalCompositeOperation = "source-over";
  } else {
    ctx.lineWidth = 30;
    ctx.strokeStyle = "#ffffff";
    ctx.globalCompositeOperation = "destination-out";
  }

  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
}

canvas.addEventListener("mousedown", startPosition);
canvas.addEventListener("mouseup", finishedPosition);
canvas.addEventListener("mousemove", draw);
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

function toggleBoard() {
  document.body.classList.toggle("board-hidden");
  setTimeout(resizeCanvas, 350);
}

window.setTool = setTool;
window.clearBoard = clearBoard;
window.toggleBoard = toggleBoard;
