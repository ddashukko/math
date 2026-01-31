import {
  db,
  setDoc,
  doc,
  auth,
  onAuthStateChanged,
  collection,
  getDocs,
  deleteDoc,
  getDoc,
  signInWithPopup,
  provider,
} from "./firebase-config.js";
import { courses } from "./courses-data.js";

// --- ЗМІННІ СТАТИСТИКИ ---
let totalTasksCount = 0;
let correctCount = 0;
let wrongCount = 0;
let currentLessonId = "";
let isTestFinished = false;
let currentLinks = [];

// --- LOADER ---
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
  }, 500);
}

// 1. ЗАВАНТАЖЕННЯ
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

// 2. АВТОРИЗАЦІЯ
onAuthStateChanged(auth, (user) => {
  const authModal = document.getElementById("auth-modal");

  if (user) {
    if (authModal) authModal.classList.remove("active");
    if (currentLessonId) {
      updateLoader(70, "Вхід в систему...");
      restoreProgress(user.email);
    }
  } else {
    updateLoader(100, "Очікування входу...");
    hideLoader();
    if (authModal) {
      authModal.classList.add("active");
    }
  }
});

window.googleLogin = async function () {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Помилка входу:", error);
    alert("Не вдалося увійти.");
  }
};

// ЗАВАНТАЖЕННЯ УРОКУ
async function loadLesson(id) {
  try {
    updateLoader(30, "Пошук файлу...");

    const course = courses.find((c) => c.id === id);
    let fetchPath = "";

    if (course) {
      fetchPath = `data/${course.subject}/${course.grade}/${course.type}/${course.filename}.json`;
      document.body.className = "";
      document.body.classList.add(`mode-${course.type}`);
    } else {
      fetchPath = `data/${id}.json`;
      document.body.classList.add("mode-lesson");
    }

    if (window.innerWidth <= 768) {
      document.body.classList.add("board-hidden");
    }

    const response = await fetch(fetchPath);
    if (!response.ok) throw new Error("Файл уроку не знайдено");

    const data = await response.json();

    document.title = data.title;
    const titleEl = document.getElementById("lesson-title");
    if (titleEl) titleEl.innerText = data.title;

    currentLinks = data.links || [];

    countTotalTasks(data.exercises || []);
    if (data.repetition) countTotalTasks(data.repetition);

    updateScoreUI();
    updateLoader(50, "Малюємо вправи...");

    renderLessonContent(data);
    renderFooter(data.links);

    if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
      updateLoader(60, "Налаштування формул...");
      MathJax.typesetPromise().catch((err) =>
        console.log("MathJax error:", err),
      );
    }
  } catch (error) {
    console.error(error);
    alert("Помилка завантаження.");
    hideLoader();
  }
}

// ГЕНЕРАЦІЯ КОНТЕНТУ
function renderLessonContent(data) {
  const root = document.getElementById("quiz-root");
  if (!root) return;
  root.innerHTML = "";

  if (data.cheatSheet) {
    const theoryBlock = document.createElement("div");
    theoryBlock.className = "cheat-sheet";
    theoryBlock.innerHTML = data.cheatSheet;
    root.appendChild(theoryBlock);
  }

  if (data.exercises && data.exercises.length > 0) {
    renderExercises(data.exercises, currentLessonId, root);
  }

  if (data.repetition && data.repetition.length > 0) {
    const repSection = document.createElement("div");
    repSection.className = "section-repetition";
    repSection.innerHTML = `<h3>🔄 Вправи для повторення</h3>`;
    root.appendChild(repSection);
    renderExercises(data.repetition, currentLessonId, repSection);
  }
}

function renderExercises(exercises, lessonId, container) {
  exercises.forEach((ex) => {
    const card = document.createElement("div");
    card.className = "exercise-block";

    // 1. Перевіряємо, чи є ЗАГАЛЬНА картинка для всієї вправи (ex.image)
    let exerciseImageHtml = ex.image
      ? `<div style="padding: 0 24px 20px; display:flex; justify-content:center;">
           <img src="${ex.image}" alt="Рисунок до вправи" style="max-width: 100%; max-height: 400px; height: auto; border-radius: 8px; border: 1px solid #e2e8f0;">
         </div>`
      : "";

    // 2. Блок для HTML-вставок (якщо є)
    let visualHtml = ex.visual
      ? `<div style="padding: 0 24px 20px; display:flex; justify-content:center;">${ex.visual}</div>`
      : "";

    // 3. Формуємо шапку картки: Заголовок -> Опис -> Картинка -> Завдання
    let html = `
      <div class="exercise-header">
        <h3>${ex.title}</h3>
        ${ex.desc ? `<p>${ex.desc}</p>` : ""}
      </div>
      ${exerciseImageHtml} 
      ${visualHtml}
      <div class="task-list">`;

    ex.tasks.forEach((task) => {
      const uniqueTaskId = `${lessonId}_${ex.id}_${task.id}`;
      const safeAns = task.a.toString().replace(/"/g, "&quot;");

      // (Опціонально) Картинка для конкретного завдання, якщо колись знадобиться
      let taskImageHtml = task.image
        ? `<div class="task-image-container"><img src="${task.image}" class="task-img"></div>`
        : "";

      html += `<div class="task-row">
        <div class="task-content">
           <span style="font-weight:bold; margin-right:8px; color:#3b82f6;">${task.id}</span> 
           ${task.q}
           ${taskImageHtml}
        </div>
        <div class="interactive-area" id="area-${uniqueTaskId}">`;

      if (task.opts) {
        html += `<div class="options-container" id="container-${uniqueTaskId}">`;
        task.opts.forEach((opt) => {
          const safeOpt = opt.toString().replace(/"/g, "&quot;");
          html += `<button class="option-btn" data-val="${safeOpt}" onclick="checkOption(this, '${safeOpt}', '${safeAns}', '${uniqueTaskId}')">${opt}</button>`;
        });
        html += `</div>`;
      } else {
        html += `<div class="input-group">
          <input type="text" id="input-${uniqueTaskId}" placeholder="..." autocomplete="off"
             onkeydown="if(event.key==='Enter') this.nextElementSibling.click()"
             onchange="if(document.body.classList.contains('mode-test')) checkInput(this, '${safeAns}', '${uniqueTaskId}')">
          <button class="btn-check" onclick="checkInput(this, '${safeAns}', '${uniqueTaskId}')">ОК</button>
        </div>`;
      }
      html += `</div></div>`;
    });
    html += `</div>`;
    card.innerHTML = html;
    container.appendChild(card);
  });
}

function countTotalTasks(exercises) {
  exercises.forEach((ex) => (totalTasksCount += ex.tasks.length));
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

  const isTestMode = document.body.classList.contains("mode-test");

  if (isTestMode) {
    if (isTestFinished)
      scoreEl.innerText = `🏁 ${correctCount} / ${totalTasksCount}`;
    else scoreEl.innerText = `📝 Екзамен`;
  } else {
    scoreEl.innerText = `✅ ${correctCount} / ${totalTasksCount}`;
  }
}

// ВАЛІДАТОР
function validateAnswer(userRaw, correctRaw) {
  if (!userRaw) return false;
  let u = userRaw.toString().toLowerCase().trim().replace(/,/g, ".");
  let c = correctRaw.toString().toLowerCase().trim().replace(/,/g, ".");
  if (u === c) return true;
  if (c.includes(";")) {
    const uParts = u
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s !== "")
      .sort();
    const cParts = c
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s !== "")
      .sort();
    if (uParts.length !== cParts.length) return false;
    return uParts.every((val, index) => val === cParts[index]);
  }
  return false;
}

window.checkInput = function (btn, correctAns, taskId) {
  const input = btn.previousElementSibling || btn;
  const userVal = input.value;
  const isCorrect = validateAnswer(userVal, correctAns);
  const isTestMode = document.body.classList.contains("mode-test");

  if (isTestFinished) return;

  if (isTestMode) {
    saveProgress(taskId, isCorrect, userVal);
    input.style.borderColor = "#64748b";
  } else {
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
    if (btn.tagName === "BUTTON") btn.style.display = "none";
    updateScoreUI();
    saveProgress(taskId, isCorrect, userVal);
  }
};

window.checkOption = function (btn, userVal, correctAns, taskId) {
  const parent = btn.parentElement;
  const isTestMode = document.body.classList.contains("mode-test");
  const isCorrect = userVal === correctAns;

  if (isTestFinished) return;

  if (isTestMode) {
    const allBtns = parent.querySelectorAll(".option-btn");
    allBtns.forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    saveProgress(taskId, isCorrect, userVal);
  } else {
    if (btn.disabled || parent.getAttribute("data-answered")) return;
    if (isCorrect) {
      btn.classList.add("correct");
      correctCount++;
    } else {
      btn.classList.add("wrong");
      wrongCount++;
    }
    parent.querySelectorAll(".option-btn").forEach((b) => (b.disabled = true));
    parent.setAttribute("data-answered", "true");
    updateScoreUI();
    saveProgress(taskId, isCorrect, userVal);
  }
};

// ВІДНОВЛЕННЯ
async function restoreProgress(email) {
  updateLoader(80, "Відновлення...");
  try {
    const isTestMode = document.body.classList.contains("mode-test");
    const progressDoc = await getDoc(
      doc(db, "users", email, "progress", currentLessonId),
    );

    if (
      progressDoc.exists() &&
      isTestMode &&
      progressDoc.data().percent !== undefined
    ) {
      isTestFinished = true;
    }

    const solutionsRef = collection(db, "users", email, "solutions");
    const snapshot = await getDocs(solutionsRef);

    // Скидаємо лічильники перед перерахунком
    correctCount = 0;
    wrongCount = 0;

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const taskId = data.taskId;

      if (taskId && taskId.startsWith(currentLessonId)) {
        // Рахуємо статистику
        if (data.correct) correctCount++;
        else wrongCount++;

        // Відновлюємо UI
        const inputEl = document.getElementById(`input-${taskId}`);
        if (inputEl) {
          inputEl.value = data.answer;
          if (!isTestMode || isTestFinished) {
            inputEl.disabled = true;
            if (data.correct) inputEl.classList.add("correct");
            else inputEl.classList.add("wrong");
            if (inputEl.nextElementSibling)
              inputEl.nextElementSibling.style.display = "none";
          }
        }
        const optionsContainer = document.getElementById(`container-${taskId}`);
        if (optionsContainer) {
          const buttons = optionsContainer.querySelectorAll(".option-btn");
          buttons.forEach((btn) => {
            const isSelected = btn.getAttribute("data-val") === data.answer;
            if (!isTestMode || isTestFinished) {
              btn.disabled = true;
              if (isSelected) {
                if (data.correct) btn.classList.add("correct");
                else btn.classList.add("wrong");
              }
            } else {
              if (isSelected) btn.classList.add("selected");
            }
          });
          if (!isTestMode || isTestFinished)
            optionsContainer.setAttribute("data-answered", "true");
        }
      }
    });

    if (isTestFinished) {
      lockAllInputs();
      showFinishedState();
    }
    updateScoreUI();
  } catch (error) {
    console.error(error);
  } finally {
    updateLoader(100, "Готово!");
    hideLoader();
  }
}

// 🔥 ЗБЕРЕЖЕННЯ (Виправлено логіку)
async function saveProgress(taskId, isCorrect, userAnswer) {
  if (!navigator.onLine) {
    console.warn("Немає інтернету. Прогрес не збережено.");
    return;
  }
  const user = auth.currentUser;
  if (!user) return;

  try {
    // 1. 🔥 СПОЧАТКУ ГАРАНТУЄМО, ЩО ЮЗЕР ІСНУЄ (Щоб не було "привидів")
    // Це створить документ, якщо його немає, і адмінка його побачить
    await setDoc(
      doc(db, "users", user.email),
      {
        email: user.email,
        lastActive: new Date(),
        displayName: user.displayName || "Учень", // Якщо імені немає в Google, пишемо заглушку
      },
      { merge: true },
    );

    // 2. Тепер зберігаємо конкретну відповідь
    await setDoc(doc(db, "users", user.email, "solutions", taskId), {
      taskId: taskId,
      answer: userAnswer,
      correct: isCorrect,
      timestamp: new Date(),
    });

    // 3. Оновлюємо загальний прогрес уроку
    if (!document.body.classList.contains("mode-test")) {
      let percent =
        totalTasksCount > 0
          ? Math.round((correctCount / totalTasksCount) * 100)
          : 0;

      await setDoc(
        doc(db, "users", user.email, "progress", currentLessonId),
        {
          lessonId: currentLessonId,
          totalTasks: totalTasksCount,
          correct: correctCount,
          wrong: wrongCount,
          percent: percent,
          lastUpdate: new Date(),
        },
        { merge: true },
      );
    }
  } catch (e) {
    console.error("Помилка збереження:", e);
  }
}

// 🔥 ЗАВЕРШЕННЯ (Виправлено логіку)
window.finishLesson = function () {
  if (!navigator.onLine) {
    alert("🛑 Немає інтернету!");
    return;
  }
  const user = auth.currentUser;
  if (!user) {
    alert("Увійди в систему!");
    return;
  }

  showConfirm("Завершити роботу?", "Оцінка буде збережена.", async () => {
    updateLoader(50, "Перевірка...");

    const solutionsRef = collection(db, "users", user.email, "solutions");
    const snapshot = await getDocs(solutionsRef);

    let finalCorrect = 0;
    let finalWrong = 0;

    snapshot.forEach((doc) => {
      if (doc.data().taskId.startsWith(currentLessonId)) {
        if (doc.data().correct) {
          finalCorrect++;
        } else {
          finalWrong++; // Рахуємо тільки РЕАЛЬНІ помилки
        }
      }
    });

    correctCount = finalCorrect;
    const percent =
      totalTasksCount > 0
        ? Math.round((finalCorrect / totalTasksCount) * 100)
        : 0;

    // 🔥 Більше не пишемо "total - correct" у wrong.
    await setDoc(
      doc(db, "users", user.email, "progress", currentLessonId),
      {
        lessonId: currentLessonId,
        totalTasks: totalTasksCount,
        correct: finalCorrect,
        wrong: finalWrong, // Тепер це чесне число помилок
        percent: percent,
        lastUpdate: new Date(),
      },
      { merge: true },
    );

    isTestFinished = true;
    hideLoader();
    closeConfirmModal();
    lockAllInputs();
    await restoreProgress(user.email);
    showFinishedState();
  });
};

function showFinishedState() {
  let modal = document.getElementById("modal-overlay");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal-overlay";
    modal.className = "modal-overlay";
    modal.innerHTML = '<div class="modal-content"></div>';
    document.body.appendChild(modal);
  }

  const modalContent = modal.querySelector(".modal-content");
  const percent =
    totalTasksCount > 0
      ? Math.round((correctCount / totalTasksCount) * 100)
      : 0;
  const isBad = percent < 50;
  const circleClass = isBad ? "score-circle bad" : "score-circle";

  let nextStepsHtml = "";
  if (currentLinks && currentLinks.length > 0) {
    currentLinks.forEach((link) => {
      if (link.url.includes("index.html")) return;
      let icon = link.type === "homework" ? "🏠" : "📝";
      nextStepsHtml += `<a href="${link.url}" class="btn-modal action">${icon} &nbsp; ${link.title}</a>`;
    });
  }

  let reviewBtnHtml =
    percent < 100
      ? `<button onclick="reviewMistakes()" class="btn-modal warning">👀 Помилки</button>`
      : "";

  modalContent.innerHTML = `
    <div class="${circleClass}">${percent}%</div>
    <h2 class="modal-title">${percent >= 80 ? "Блискуче! 🌟" : percent >= 50 ? "Непогано! 👍" : "Спробуй ще раз 🥺"}</h2>
    <p class="modal-desc">Правильно: <b>${correctCount}</b> з <b>${totalTasksCount}</b></p>
    <div style="margin: 20px 0;">${nextStepsHtml}</div>
    ${reviewBtnHtml}
    <div style="display:flex; gap:10px; margin-top:10px;">
        <button onclick="retryTest()" class="btn-modal secondary" style="margin:0;">🔄 Перездати</button>
        <a href="index.html" class="btn-modal secondary" style="margin:0;">🏠 Меню</a>
    </div>
  `;
  modal.classList.add("active");
  if (typeof updateScoreUI === "function") updateScoreUI();
}

function lockAllInputs() {
  const root = document.getElementById("quiz-root");
  root.querySelectorAll("input").forEach((input) => (input.disabled = true));
  root.querySelectorAll(".option-btn").forEach((btn) => (btn.disabled = true));
}

window.retryTest = function () {
  showConfirm("Перездати?", "Всі відповіді будуть видалені.", async () => {
    updateLoader(30, "Очищення...");
    const user = auth.currentUser;
    if (!user) return;
    try {
      const solutionsRef = collection(db, "users", user.email, "solutions");
      const snapshot = await getDocs(solutionsRef);
      const deletePromises = [];
      snapshot.forEach((docSnap) => {
        if (docSnap.data().taskId.startsWith(currentLessonId))
          deletePromises.push(deleteDoc(docSnap.ref));
      });
      await Promise.all(deletePromises);
      await deleteDoc(
        doc(db, "users", user.email, "progress", currentLessonId),
      );
      window.location.reload();
    } catch (e) {
      console.error(e);
      hideLoader();
    }
  });
};

window.reviewMistakes = function () {
  const modal = document.getElementById("modal-overlay");
  if (modal) modal.classList.remove("active");
  setTimeout(() => {
    const firstError = document.querySelector(".wrong");
    if (firstError) {
      firstError.scrollIntoView({ behavior: "smooth", block: "center" });
      firstError.style.transition = "transform 0.3s";
      firstError.style.transform = "scale(1.1)";
      setTimeout(() => (firstError.style.transform = "scale(1)"), 500);
    } else {
      alert("Помилок не знайдено!");
    }
  }, 300);
};

function renderFooter(links) {
  let footer = document.getElementById("lesson-footer");
  if (!footer) {
    const container = document.querySelector(".container");
    if (container) {
      footer = document.createElement("div");
      footer.id = "lesson-footer";
      footer.className = "footer-nav";
      container.appendChild(footer);
    } else return;
  }

  if (isTestFinished) return;
  footer.innerHTML = "";

  const finishBtn = document.createElement("button");
  finishBtn.className = "btn-finish-gradient";
  finishBtn.innerHTML = document.body.classList.contains("mode-test")
    ? "Здати тест"
    : "Завершити урок";
  finishBtn.onclick = window.finishLesson;
  footer.appendChild(finishBtn);
}

function showConfirm(title, text, onYesCallback) {
  const modal = document.getElementById("confirm-modal");
  const titleEl = document.getElementById("confirm-title");
  const textEl = document.getElementById("confirm-text");
  const yesBtn = document.getElementById("confirm-yes-btn");

  if (!modal) {
    if (confirm(title)) onYesCallback();
    return;
  }

  titleEl.innerText = title;
  textEl.innerText = text;

  const newBtn = yesBtn.cloneNode(true);
  yesBtn.parentNode.replaceChild(newBtn, yesBtn);
  newBtn.onclick = onYesCallback;

  modal.classList.add("active");
}

window.closeConfirmModal = function () {
  const modal = document.getElementById("confirm-modal");
  if (modal) modal.classList.remove("active");
};
