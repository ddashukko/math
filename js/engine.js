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
    const response = await fetch(`data/${id}.json`);

    if (!response.ok) throw new Error("Урок не знайдено");

    const data = await response.json();

    document.title = data.title;
    document.getElementById("lesson-title").innerText = data.title;

    renderExercises(data.exercises);
  } catch (error) {
    document.getElementById("quiz-root").innerHTML =
      `<h3>Помилка: ${error.message}</h3>`;
  }
}

function renderExercises(exercises) {
  const root = document.getElementById("quiz-root");
  root.innerHTML = "";

  exercises.forEach((ex) => {
    const card = document.createElement("div");
    card.className = "exercise-block";

    let html = `
      <div class="exercise-header">
        <h3>${ex.title}</h3>
        ${ex.desc ? `<p style="margin:5px 0 0; color:#64748b">${ex.desc}</p>` : ""}
      </div>
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
          html += `<button class="option-btn" onclick="checkOption(this, '${opt}', '${task.a}')">${opt}</button>`;
        });
        html += `</div>`;
      } else {
        html += `
          <div class="input-group">
            <input type="text" placeholder="?" onkeydown="if(event.key==='Enter') this.nextElementSibling.click()">
            <button class="btn-check" onclick="checkInput(this, '${task.a}')">ОК</button>
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
