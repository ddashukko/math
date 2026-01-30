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
  signInWithPopup, // 🔥 Додали імпорт входу
  provider, // 🔥 Додали провайдер
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

// 2. АВТОРИЗАЦІЯ (ОНОВЛЕНО)
onAuthStateChanged(auth, (user) => {
  const authModal = document.getElementById("auth-modal");

  if (user) {
    // ✅ Користувач увійшов
    if (authModal) authModal.classList.remove("active"); // Ховаємо вікно, якщо було

    if (currentLessonId) {
      updateLoader(70, "Вхід в систему...");
      restoreProgress(user.email);
    }
  } else {
    // ⛔ Користувач НЕ увійшов
    updateLoader(100, "Очікування входу...");
    hideLoader(); // Ховаємо лоадер, щоб показати модалку

    // Показуємо вікно входу примусово
    if (authModal) {
      authModal.classList.add("active");
    } else {
      alert("Будь ласка, увійди в систему, щоб проходити тест.");
    }
  }
});

// 🔥 ФУНКЦІЯ ВХОДУ (ПРЯМО В УРОЦІ)
window.googleLogin = async function () {
  try {
    await signInWithPopup(auth, provider);
    // Після успішного входу спрацює onAuthStateChanged вище і закриє вікно
  } catch (error) {
    console.error("Помилка входу:", error);
    alert("Не вдалося увійти. Спробуйте ще раз.");
  }
};

// ... (ДАЛІ ЙДЕ ВЕСЬ ІНШИЙ КОД: loadLesson, restoreProgress і т.д. БЕЗ ЗМІН)

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

    // Мобільна адаптація дошки
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
    alert("Помилка завантаження.");
    hideLoader();
  }
}

function countTotalTasks(exercises) {
  totalTasksCount = 0;
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
      const safeAns = task.a.toString().replace(/"/g, "&quot;");

      html += `<div class="task-row">
        <div class="task-content">${task.id} ${task.q}</div>
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
    root.appendChild(card);
  });
}

// ВІДНОВЛЕННЯ ПРОГРЕСУ
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

    correctCount = 0;
    wrongCount = 0;

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const taskId = data.taskId;

      if (taskId && taskId.startsWith(currentLessonId)) {
        // INPUT
        const inputEl = document.getElementById(`input-${taskId}`);
        if (inputEl) {
          inputEl.value = data.answer;
          if (!isTestMode || isTestFinished) {
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
          } else {
            inputEl.style.borderColor = "#64748b";
          }
        }
        // BUTTONS
        const optionsContainer = document.getElementById(`container-${taskId}`);
        if (optionsContainer) {
          const buttons = optionsContainer.querySelectorAll(".option-btn");
          buttons.forEach((btn) => {
            const isSelected = btn.getAttribute("data-val") === data.answer;
            if (!isTestMode || isTestFinished) {
              btn.disabled = true;
              if (isSelected) {
                if (data.correct) {
                  btn.classList.add("correct");
                  correctCount++;
                } else {
                  btn.classList.add("wrong");
                  wrongCount++;
                }
              }
            } else {
              if (isSelected) btn.classList.add("selected");
              else btn.classList.remove("selected");
            }
          });
          if (!isTestMode || isTestFinished)
            optionsContainer.setAttribute("data-answered", "true");
        }
      }
    });

    if (isTestFinished) {
      lockAllInputs();
      showFinishedState(); // 🔥 Показуємо МОДАЛКУ
    }
    updateScoreUI();
  } catch (error) {
    console.error(error);
  } finally {
    updateLoader(100, "Готово!");
    hideLoader();
  }
}

// ПЕРЕВІРКА ВІДПОВІДЕЙ
window.checkInput = function (btn, correctAns, taskId) {
  const input = btn.previousElementSibling || btn;
  const userVal = input.value.trim();
  const isCorrect = userVal.toLowerCase() === correctAns.toLowerCase();
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

async function saveProgress(taskId, isCorrect, userAnswer) {
  if (!navigator.onLine) {
    console.warn("Немає інтернету. Прогрес не збережено.");
    return;
  }
  const user = auth.currentUser;
  if (!user) return;
  try {
    await setDoc(doc(db, "users", user.email, "solutions", taskId), {
      taskId: taskId,
      answer: userAnswer,
      correct: isCorrect,
      timestamp: new Date(),
    });
    await setDoc(
      doc(db, "users", user.email),
      {
        email: user.email,
        lastActive: new Date(),
        displayName: user.displayName || "Учень",
      },
      { merge: true },
    );

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
    console.error(e);
  }
}

// 🔥 ЗАВЕРШЕННЯ (Виклик модалки)
// 🔥 НОВА ФУНКЦІЯ ЗАВЕРШЕННЯ (Через красиву модалку)
window.finishLesson = function () {
  // 1. Перевірка інтернету
  if (!navigator.onLine) {
    alert("🛑 Немає інтернету! Перевір з'єднання.");
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    alert("Спочатку увійди в систему!");
    return;
  }

  // 2. Замість confirm() викликаємо наше вікно
  showConfirm(
    "Завершити роботу?",
    "Після цього ти побачиш свою оцінку, а вчитель отримає результат.",
    async () => {
      // 👇 Цей код запуститься ТІЛЬКИ якщо натиснуть "ТАК"
      updateLoader(50, "Перевірка результатів...");

      // ... (Тут твоя стара логіка підрахунку) ...
      const solutionsRef = collection(db, "users", user.email, "solutions");
      const snapshot = await getDocs(solutionsRef);

      let finalCorrect = 0;
      snapshot.forEach((doc) => {
        if (doc.data().taskId.startsWith(currentLessonId)) {
          if (doc.data().correct) finalCorrect++;
        }
      });

      correctCount = finalCorrect;
      const percent =
        totalTasksCount > 0
          ? Math.round((finalCorrect / totalTasksCount) * 100)
          : 0;

      await setDoc(
        doc(db, "users", user.email, "progress", currentLessonId),
        {
          lessonId: currentLessonId,
          totalTasks: totalTasksCount,
          correct: finalCorrect,
          wrong: totalTasksCount - finalCorrect,
          percent: percent,
          lastUpdate: new Date(),
        },
        { merge: true },
      );

      isTestFinished = true;
      hideLoader();
      closeConfirmModal(); // Закриваємо питання

      lockAllInputs();
      await restoreProgress(user.email);
      showFinishedState(); // Показуємо результат
    },
  );
};

// 🔥 ОНОВЛЕНА ФУНКЦІЯ МОДАЛКИ (Clean Style)
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

  // 1. Генеруємо кнопку "Наступний крок" (До уроку / Домашка)
  let nextStepsHtml = "";
  if (currentLinks && currentLinks.length > 0) {
    currentLinks.forEach((link) => {
      if (link.url.includes("index.html")) return;

      // Використовуємо .btn-modal замість .btn-nav-link для єдиного стилю
      nextStepsHtml += `
        <a href="${link.url}" class="btn-modal" style="margin-bottom: 10px;">
           👉 ${link.title}
        </a>
      `;
    });
  }

  // 2. Генеруємо кнопку "Помилки" (з новим класом .warning)
  let reviewBtnHtml = "";
  if (percent < 100) {
    reviewBtnHtml = `
        <button onclick="reviewMistakes()" class="btn-modal warning">
           👀 Переглянути помилки
        </button>
     `;
  }

  modalContent.innerHTML = `
    <div class="score-circle" style="${percent >= 50 ? "" : "border-color: #ef4444; color: #ef4444;"}">${percent}%</div>
    <h2 class="modal-title">${percent >= 50 ? "Чудово! 🎉" : "Спробуй ще раз 😕"}</h2>
    <p class="modal-desc">Правильних відповідей: <b>${correctCount}</b> з <b>${totalTasksCount}</b></p>
    
    <div style="margin-bottom: 20px;">
        ${nextStepsHtml}
    </div>

    ${reviewBtnHtml}
    
    <button onclick="retryTest()" class="btn-modal secondary">🔄 Перездати</button>
    <a href="index.html" class="btn-modal secondary">🏠 На головну</a>
  `;

  modal.classList.add("active");

  // Якщо є функція оновлення UI (наприклад, прибрати лоадер), викликаємо
  if (typeof updateScoreUI === "function") updateScoreUI();
}

function lockAllInputs() {
  const root = document.getElementById("quiz-root");
  const inputs = root.querySelectorAll("input");
  const buttons = root.querySelectorAll(".option-btn");
  inputs.forEach((input) => (input.disabled = true));
  buttons.forEach((btn) => (btn.disabled = true));
}

// 🔥 НОВА ФУНКЦІЯ ПЕРЕЗДАЧІ
window.retryTest = function () {
  showConfirm(
    "Перездати тест?",
    "Всі твої попередні відповіді в цьому уроці будуть видалені. Ти впевнена?",
    async () => {
      // 👇 Код для "ТАК"
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
    },
  );
};

// 🔍 ФУНКЦІЯ ПЕРЕГЛЯДУ ПОМИЛОК
window.reviewMistakes = function () {
  // 1. Закриваємо модалку
  const modal = document.getElementById("modal-overlay");
  if (modal) modal.classList.remove("active");

  // 2. Шукаємо першу помилку (input або button з класом .wrong)
  // Чекаємо трохи, поки модалка зникне
  setTimeout(() => {
    const firstError = document.querySelector(".wrong");
    if (firstError) {
      // Скролимо до помилки по центру екрана
      firstError.scrollIntoView({ behavior: "smooth", block: "center" });

      // Можна додати легке підсвічування (миготіння)
      firstError.style.transition = "transform 0.3s";
      firstError.style.transform = "scale(1.1)";
      setTimeout(() => (firstError.style.transform = "scale(1)"), 500);
    } else {
      alert("Помилок не знайдено! Ти геній? 🤔");
    }
  }, 300);
};

function renderFooter(links) {
  // Шукаємо футер
  let footer = document.getElementById("lesson-footer");

  // 🔥 АВТО-ФІКС: Якщо футера немає в HTML, створюємо його в блоку завдань
  if (!footer) {
    const tasksSection = document.getElementById("tasks-section");
    if (tasksSection) {
      footer = document.createElement("div");
      footer.id = "lesson-footer";
      footer.style.marginTop = "30px";
      footer.style.padding = "20px";
      tasksSection.querySelector(".container").appendChild(footer);
    } else {
      // Якщо все геть погано, просто виходимо
      return;
    }
  }

  if (isTestFinished) return;

  footer.innerHTML = "";

  const finishBtn = document.createElement("button");
  finishBtn.className = "btn-finish-gradient";

  if (document.body.classList.contains("mode-test")) {
    finishBtn.innerHTML = "Здати тест";
  } else {
    finishBtn.innerHTML = "Завершити урок";
  }

  finishBtn.onclick = window.finishLesson;
  footer.appendChild(finishBtn);
}

// =========================================
// 🛠️ УПРАВЛІННЯ МОДАЛКОЮ ПІДТВЕРДЖЕННЯ
// =========================================

function showConfirm(title, text, onYesCallback) {
  const modal = document.getElementById("confirm-modal");
  const titleEl = document.getElementById("confirm-title");
  const textEl = document.getElementById("confirm-text");
  const yesBtn = document.getElementById("confirm-yes-btn");

  if (!modal) {
    // Якщо забула додати HTML, спрацює по-старому
    if (confirm(title + "\n" + text)) onYesCallback();
    return;
  }

  // Заповнюємо текст
  titleEl.innerText = title;
  textEl.innerText = text;

  // Очищаємо старі події кнопки (щоб не натискалось двічі)
  const newBtn = yesBtn.cloneNode(true);
  yesBtn.parentNode.replaceChild(newBtn, yesBtn);

  // Вішаємо нову дію на кнопку "ТАК"
  newBtn.onclick = () => {
    onYesCallback(); // Виконуємо дію (здати або перездати)
  };

  // Показуємо вікно
  modal.classList.add("active");
}

window.closeConfirmModal = function () {
  const modal = document.getElementById("confirm-modal");
  if (modal) modal.classList.remove("active");
};
