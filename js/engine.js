document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const lessonId = urlParams.get("id");

  if (!lessonId) {
    document.getElementById("quiz-root").innerHTML =
      "<h3>Помилка: ID уроку не вказано в посиланні</h3>";
    return;
  }

  loadLesson(lessonId);
});

async function loadLesson(id) {
  try {
    // 1. Завантажуємо JSON
    const response = await fetch(`data/${id}.json`);

    if (!response.ok) throw new Error("Урок не знайдено");

    const data = await response.json();

    // 2. Встановлюємо заголовок
    document.title = data.title;
    const titleEl = document.getElementById("lesson-title");
    if (titleEl) titleEl.innerText = data.title;

    // 3. Рендеримо вправи
    renderExercises(data.exercises);

    // 4. 🔥 Рендеримо кнопки навігації (НОВЕ)
    renderFooter(data.links);

    // 5. Запускаємо MathJax (формули)
    if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
      MathJax.typesetPromise().catch((err) =>
        console.log("MathJax error:", err),
      );
    } else {
      console.log("MathJax ще завантажується...");
    }
  } catch (error) {
    document.getElementById("quiz-root").innerHTML =
      `<h3>Помилка: ${error.message}</h3>`;
    console.error(error);
  }
}

function renderExercises(exercises) {
  const root = document.getElementById("quiz-root");
  root.innerHTML = "";

  exercises.forEach((ex) => {
    const card = document.createElement("div");
    card.className = "exercise-block";

    let visualHtml = ex.visual
      ? `<div style="padding: 0 24px 20px;">${ex.visual}</div>`
      : "";

    let html = `
      <div class="exercise-header">
        <h3>${ex.title}</h3>
        ${ex.desc ? `<p style="margin:5px 0 0; color:#64748b">${ex.desc}</p>` : ""}
      </div>
      ${visualHtml}
      <div class="task-list">
    `;

    ex.tasks.forEach((task) => {
      html += `
        <div class="task-row">
          <div class="task-content">${task.id} ${task.q}</div>
          <div class="interactive-area">
      `;

      if (task.opts) {
        html += `<div class="options-container">`;
        task.opts.forEach((opt) => {
          const safeOpt = opt.replace(/"/g, "&quot;");
          const safeAns = task.a.replace(/"/g, "&quot;");
          html += `<button class="option-btn" onclick="checkOption(this, '${safeOpt}', '${safeAns}')">${opt}</button>`;
        });
        html += `</div>`;
      } else {
        const safeAns = task.a.replace(/"/g, "&quot;");
        html += `
          <div class="input-group">
            <input type="text" placeholder="?" onkeydown="if(event.key==='Enter') this.nextElementSibling.click()">
            <button class="btn-check" onclick="checkInput(this, '${safeAns}')">ОК</button>
          </div>
        `;
      }

      html += `</div></div>`;
    });

    html += `</div>`;
    card.innerHTML = html;
    root.appendChild(card);
  });
}

// 🔥 НОВА ФУНКЦІЯ: Рендер кнопок внизу
function renderFooter(links) {
  const footer = document.getElementById("lesson-footer");
  if (!footer) return;

  footer.innerHTML = ""; // Очищаємо перед рендером

  // Якщо посилань немає в JSON, просто виходимо
  if (!links || links.length === 0) return;

  links.forEach((link) => {
    const a = document.createElement("a");
    a.href = link.url;
    // Додаємо класи: базовий + тип (homework/test/lesson)
    a.className = `btn-nav-link ${link.type || ""}`;
    a.innerText = link.title;

    // Відкривати в тій самій вкладці (за замовчуванням)
    footer.appendChild(a);
  });
}

// Глобальні функції перевірки
window.checkInput = function (btn, correctAns) {
  const input = btn.previousElementSibling;
  const userVal = input.value.trim();

  input.classList.remove("correct", "wrong");

  if (userVal === correctAns) {
    input.classList.add("correct");
    input.disabled = true;
    btn.style.display = "none";
  } else {
    input.classList.add("wrong");
  }
};

window.checkOption = function (btn, userVal, correctAns) {
  const parent = btn.parentElement;
  const allBtns = parent.querySelectorAll(".option-btn");

  if (userVal === correctAns) {
    btn.classList.add("correct");
    allBtns.forEach((b) => (b.disabled = true));
  } else {
    btn.classList.add("wrong");
  }
};
