import {
  db,
  setDoc,
  doc,
  auth,
  onAuthStateChanged,
  collection,
  getDocs,
} from "./firebase-config.js";

// Змінні статистики
let totalTasksCount = 0;
let correctCount = 0;
let wrongCount = 0;
let currentLessonId = "";

// --- ФУНКЦІЇ LOADER ---
function updateLoader(percent, text) {
  const bar = document.getElementById("loader-bar");
  const txt = document.getElementById("loader-text");
  const perc = document.getElementById("loader-percent");

  if (bar) bar.style.width = `${percent}%`;
  if (txt && text) txt.innerText = text;
  if (perc) perc.innerText = `${percent}%`;
}

function hideLoader() {
  setTimeout(() => {
    const overlay = document.getElementById("loader-overlay");
    if (overlay) overlay.classList.add("hidden");
  }, 500); // Невелика затримка, щоб користувач побачив 100%
}

// 1. ЗАВАНТАЖЕННЯ СТОРІНКИ
document.addEventListener("DOMContentLoaded", () => {
  updateLoader(10, "Ініціалізація...");

  const urlParams = new URLSearchParams(window.location.search);
  currentLessonId = urlParams.get("id");

  if (!currentLessonId) {
    document.getElementById("quiz-root").innerHTML =
      "<h3>Помилка: ID уроку не вказано</h3>";
    hideLoader();
    return;
  }
  loadLesson(currentLessonId);
});

// 2. СЛУХАЄМО АВТОРИЗАЦІЮ
onAuthStateChanged(auth, (user) => {
  if (user && currentLessonId) {
    updateLoader(70, "Вхід в систему...");
    restoreProgress(user.email);
  } else {
    // Якщо це гість - просто завершуємо завантаження
    updateLoader(100, "Готово!");
    hideLoader();
  }
});

async function loadLesson(id) {
  try {
    updateLoader(30, "Завантаження даних...");
    const response = await fetch(`data/${id}.json`);

    if (!response.ok) throw new Error("Урок не знайдено");
    const data = await response.json();

    document.title = data.title;
    const titleEl = document.getElementById("lesson-title");
    if (titleEl) titleEl.innerText = data.title;

    countTotalTasks(data.exercises);
    updateScoreUI();

    updateLoader(50, "Малюємо вправи...");
    renderExercises(data.exercises, id);
    renderFooter(data.links);

    if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
      updateLoader(60, "Налаштування формул...");
      MathJax.typesetPromise().catch((err) =>
        console.log("MathJax error:", err),
      );
    }
  } catch (error) {
    console.error(error);
    document.getElementById("loader-text").innerText = "Помилка!";
    alert("Не вдалося завантажити урок.");
    hideLoader();
  }
}

function countTotalTasks(exercises) {
  totalTasksCount = 0;
  exercises.forEach((ex) => {
    totalTasksCount += ex.tasks.length;
  });
}

function updateScoreUI() {
  let scoreEl = document.getElementById("score-display");
  if (!scoreEl) {
    const headerDiv = document.querySelector("header div:nth-child(2)");
    scoreEl = document.createElement("div");
    scoreEl.id = "score-display";
    scoreEl.className = "lesson-score";
    if (headerDiv) headerDiv.prepend(scoreEl);
  }
  scoreEl.innerHTML = `✅ ${correctCount} / ${totalTasksCount}`;
}

// --- РЕНДЕРИНГ ---
function renderExercises(exercises, lessonId) {
  const root = document.getElementById("quiz-root");
  root.innerHTML = "";

  exercises.forEach((ex) => {
    const card = document.createElement("div");
    card.className = "exercise-block";

    let visualHtml = ex.visual
      ? `<div style="padding: 0 24px 20px;">${ex.visual}</div>`
      : "";
    let html = `
      <div class="exercise-header"><h3>${ex.title}</h3>${ex.desc ? `<p style="margin:5px 0 0; color:#64748b">${ex.desc}</p>` : ""}</div>
      ${visualHtml}
      <div class="task-list">`;

    ex.tasks.forEach((task) => {
      const uniqueTaskId = `${lessonId}_${ex.id}_${task.id}`;
      html += `<div class="task-row"><div class="task-content">${task.id} ${task.q}</div><div class="interactive-area">`;

      if (task.opts) {
        html += `<div class="options-container" id="container-${uniqueTaskId}">`;
        task.opts.forEach((opt) => {
          const safeOpt = opt.replace(/"/g, "&quot;");
          const safeAns = task.a.replace(/"/g, "&quot;");
          html += `<button class="option-btn" data-val="${safeOpt}" onclick="checkOption(this, '${safeOpt}', '${safeAns}', '${uniqueTaskId}')">${opt}</button>`;
        });
        html += `</div>`;
      } else {
        const safeAns = task.a.replace(/"/g, "&quot;");
        html += `<div class="input-group">
            <input type="text" id="input-${uniqueTaskId}" placeholder="?" onkeydown="if(event.key==='Enter') this.nextElementSibling.click()">
            <button class="btn-check" onclick="checkInput(this, '${safeAns}', '${uniqueTaskId}')">ОК</button>
          </div>`;
      }
      html += `</div></div>`;
    });
    html += `</div>`;
    card.innerHTML = html;
    root.appendChild(card);
  });
}

// --- ВІДНОВЛЕННЯ ---
async function restoreProgress(email) {
  updateLoader(80, "Відновлення відповідей...");
  try {
    const solutionsRef = collection(db, "users", email, "solutions");
    const snapshot = await getDocs(solutionsRef);

    snapshot.forEach((doc) => {
      const data = doc.data();
      const taskId = data.taskId;

      if (taskId && taskId.startsWith(currentLessonId)) {
        // INPUT
        const inputEl = document.getElementById(`input-${taskId}`);
        if (inputEl) {
          inputEl.value = data.answer;
          inputEl.disabled = true;
          if (data.correct) {
            inputEl.classList.add("correct");
            correctCount++;
          } else {
            inputEl.classList.add("wrong");
            wrongCount++;
          }
          if (inputEl.nextElementSibling)
            inputEl.nextElementSibling.style.display = "none";
        }

        // BUTTONS
        const optionsContainer = document.getElementById(`container-${taskId}`);
        if (optionsContainer) {
          const buttons = optionsContainer.querySelectorAll(".option-btn");
          buttons.forEach((btn) => {
            btn.disabled = true;
            if (btn.getAttribute("data-val") === data.answer) {
              if (data.correct) {
                btn.classList.add("correct");
                correctCount++;
              } else {
                btn.classList.add("wrong");
                wrongCount++;
              }
            }
          });
          optionsContainer.setAttribute("data-answered", "true");
        }
      }
    });

    updateScoreUI();
  } catch (error) {
    console.error("Помилка відновлення:", error);
  } finally {
    // 🔥 У будь-якому випадку прибираємо екран завантаження
    updateLoader(100, "Готово!");
    hideLoader();
  }
}

// --- ФУНКЦІЇ ПЕРЕВІРКИ ---
window.checkInput = function (btn, correctAns, taskId) {
  const input = btn.previousElementSibling;
  const userVal = input.value.trim();
  const isCorrect = userVal === correctAns;

  if (input.disabled) return;

  input.classList.remove("correct", "wrong");

  if (isCorrect) {
    input.classList.add("correct");
    correctCount++;
  } else {
    input.classList.add("wrong");
    wrongCount++;
  }

  input.disabled = true;
  btn.style.display = "none";

  updateScoreUI();
  saveProgress(taskId, isCorrect, userVal);
};

window.checkOption = function (btn, userVal, correctAns, taskId) {
  const parent = btn.parentElement;
  const allBtns = parent.querySelectorAll(".option-btn");

  if (btn.disabled || parent.getAttribute("data-answered")) return;

  const isCorrect = userVal === correctAns;

  if (isCorrect) {
    btn.classList.add("correct");
    correctCount++;
  } else {
    btn.classList.add("wrong");
    wrongCount++;
  }

  allBtns.forEach((b) => (b.disabled = true));
  parent.setAttribute("data-answered", "true");

  updateScoreUI();
  saveProgress(taskId, isCorrect, userVal);
};

async function saveProgress(taskId, isCorrect, userAnswer) {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const userEmail = user.email;
    await setDoc(doc(db, "users", userEmail, "solutions", taskId), {
      taskId: taskId,
      answer: userAnswer,
      correct: isCorrect,
      timestamp: new Date(),
    });
    await setDoc(
      doc(db, "users", userEmail),
      {
        email: userEmail,
        lastActive: new Date(),
        displayName: user.displayName || "Учень",
      },
      { merge: true },
    );

    const percent =
      totalTasksCount > 0
        ? Math.round((correctCount / totalTasksCount) * 100)
        : 0;
    await setDoc(doc(db, "users", userEmail, "progress", currentLessonId), {
      lessonId: currentLessonId,
      totalTasks: totalTasksCount,
      correct: correctCount,
      wrong: wrongCount,
      percent: percent,
      lastUpdate: new Date(),
    });
  } catch (e) {
    console.error(e);
  }
}

window.finishLesson = async function () {
  const totalDone = correctCount + wrongCount;
  if (totalDone === 0) {
    alert("Ти ще нічого не вирішив!");
    return;
  }
  const percent = Math.round((correctCount / totalTasksCount) * 100);
  document.getElementById("final-score").innerText = `${percent}%`;
  document.getElementById("final-text").innerText =
    `Ти виконав ${correctCount} з ${totalTasksCount} завдань правильно!`;
  document.getElementById("modal-overlay").classList.add("active");
};

function renderFooter(links) {
  const footer = document.getElementById("lesson-footer");
  if (!footer) return;
  footer.innerHTML = "";

  const finishBtn = document.createElement("button");
  finishBtn.className = "btn-home";
  finishBtn.style.background = "#4f46e5";
  finishBtn.style.color = "white";
  finishBtn.style.width = "100%";
  finishBtn.style.marginBottom = "20px";
  finishBtn.style.fontSize = "1.1rem";
  finishBtn.innerHTML = "🏁 Завершити урок";
  finishBtn.onclick = window.finishLesson;
  footer.appendChild(finishBtn);

  if (links) {
    links.forEach((link) => {
      const a = document.createElement("a");
      a.href = link.url;
      a.className = `btn-nav-link ${link.type || ""}`;
      a.innerText = link.title;
      footer.appendChild(a);
    });
  }
}
