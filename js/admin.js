import {
  db,
  collection,
  getDocs,
  auth,
  onAuthStateChanged,
} from "./firebase-config.js";
import { courses } from "./courses-data.js";

// 🔒 Тільки для тебе
const ADMIN_EMAIL = "dasha.kerroll@gmail.com";

// Перевірка прав доступу
onAuthStateChanged(auth, (user) => {
  if (user && user.email === ADMIN_EMAIL) {
    initAdminPanel();
  } else {
    document.body.innerHTML =
      "<div style='display:flex; justify-content:center; align-items:center; height:100vh; flex-direction:column;'><h1>⛔ Доступ заборонено</h1><a href='index.html'>На головну</a></div>";
  }
});

// 🚀 ЗАПУСК АДМІНКИ
async function initAdminPanel() {
  const listContainer = document.getElementById("students-container");
  listContainer.innerHTML = "<div class='spinner'></div>";

  try {
    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);

    listContainer.innerHTML = "";

    if (snapshot.empty) {
      listContainer.innerHTML =
        "<p style='text-align:center; color:#94a3b8;'>Поки немає учнів.</p>";
      return;
    }

    let students = [];
    snapshot.forEach((doc) => students.push(doc.data()));

    // Сортуємо за іменем
    students.sort((a, b) =>
      (a.displayName || "").localeCompare(b.displayName || ""),
    );

    students.forEach((data) => {
      if (data.email === ADMIN_EMAIL) return;

      const div = document.createElement("div");
      div.className = "student-item";
      const lastSeen = data.lastActive
        ? new Date(data.lastActive.seconds * 1000).toLocaleDateString("uk-UA")
        : "-";

      div.innerHTML = `
          <div class="st-name">${data.displayName || "Без імені 🤷‍♂️"}</div>
          <div class="st-email">${data.email}</div>
          <div class="st-last">Був(ла): ${lastSeen}</div>
      `;

      div.onclick = () => loadStudentDetails(data, div);
      listContainer.appendChild(div);
    });

    document.getElementById("loader-panel").style.display = "none";
    document.getElementById("admin-layout").style.display = "flex";
  } catch (e) {
    console.error(e);
    alert("Помилка завантаження списку: " + e.message);
  }
}

// 📋 ЗАВАНТАЖЕННЯ ЖУРНАЛУ УЧНЯ
async function loadStudentDetails(userData, element) {
  document
    .querySelectorAll(".student-item")
    .forEach((el) => el.classList.remove("active"));
  element.classList.add("active");

  document.getElementById("placeholder-msg").style.display = "none";
  document.getElementById("student-content").style.display = "block";
  document.getElementById("st-profile-name").innerText =
    userData.displayName || "Учень";
  document.getElementById("st-profile-email").innerText = userData.email;

  const worksContainer = document.getElementById("works-container");
  worksContainer.innerHTML = "<div class='spinner'></div>";

  try {
    const progressRef = collection(db, "users", userData.email, "progress");
    const progressSnap = await getDocs(progressRef);

    document.getElementById("st-total-score").innerText = progressSnap.size;
    worksContainer.innerHTML = "";

    if (progressSnap.empty) {
      worksContainer.innerHTML =
        "<p style='text-align:center; color:#94a3b8; margin-top:20px;'>Цей учень ще не здав жодної роботи.</p>";
      return;
    }

    let records = [];
    progressSnap.forEach((doc) => records.push(doc.data()));
    records.sort((a, b) => b.lastUpdate.seconds - a.lastUpdate.seconds);

    const table = document.createElement("table");
    table.className = "results-table";
    table.innerHTML = `
        <thead>
            <tr>
                <th>Робота</th>
                <th>Оцінка</th>
                <th>Дата</th>
                <th>Перевірка</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    const tbody = table.querySelector("tbody");

    records.forEach((prog) => {
      const courseInfo = courses.find((c) => c.id === prog.lessonId);
      const title = courseInfo
        ? `${courseInfo.title} <span style="color:#94a3b8; font-weight:400; font-size:0.8em">(${courseInfo.grade} кл)</span>`
        : prog.lessonId;
      const type = courseInfo ? courseInfo.type : "lesson";

      const markHTML = calculate12Scale(prog.percent);
      const date = new Date(prog.lastUpdate.seconds * 1000).toLocaleDateString(
        "uk-UA",
      );

      const row = document.createElement("tr");
      row.innerHTML = `
          <td>
              <div style="font-weight:600; color:#334155;">${title}</div>
              <div style="font-size:0.75rem; color:#64748b; text-transform:uppercase; font-weight:700;">
                ${type === "test" ? "📝 Тест" : type === "homework" ? "🏠 ДЗ" : "📘 Урок"}
              </div>
          </td>
          <td>
              ${markHTML}
              <div style="font-size:0.75rem; color:#64748b; margin-top:4px;">${prog.percent}% (${prog.correct}/${prog.totalTasks})</div>
          </td>
          <td style="color:#64748b; font-size:0.9rem;">${date}</td>
          <td>
              <button class="btn-home" style="padding:6px 12px; font-size:0.8rem; background:#f1f5f9; color:#334155;" 
                  onclick="toggleDetails('${userData.email}', '${prog.lessonId}', this)">
                  👁️ Деталі
              </button>
          </td>
      `;
      tbody.appendChild(row);

      const detailRow = document.createElement("tr");
      detailRow.innerHTML = `<td colspan="4" style="padding:0; border:none;"><div id="det-${prog.lessonId}" class="answers-detail">Завантаження...</div></td>`;
      tbody.appendChild(detailRow);
    });

    worksContainer.appendChild(table);
  } catch (e) {
    console.error(e);
    worksContainer.innerHTML = `<p style="color:red">Помилка: ${e.message}</p>`;
  }
}

// 🕵️‍♀️ ДЕТАЛЬНИЙ РОЗБІР ПОЛЬОТІВ (З MATHJAX 🔥)
window.toggleDetails = async function (email, lessonId, btn) {
  const container = document.getElementById(`det-${lessonId}`);

  if (container.style.display === "block") {
    container.style.display = "none";
    btn.innerText = "👁️ Деталі";
    btn.style.background = "#f1f5f9";
    btn.style.color = "#334155";
    return;
  }

  container.style.display = "block";
  btn.innerText = "❌ Закрити";
  btn.style.background = "#eef2ff";
  btn.style.color = "#4f46e5";

  if (container.getAttribute("data-loaded") === "true") return;

  try {
    const course = courses.find((c) => c.id === lessonId);
    let exercisesData = [];

    if (course) {
      const fetchPath = `data/${course.subject}/${course.grade}/${course.type}/${course.filename}.json`;
      const resp = await fetch(fetchPath);
      if (!resp.ok) throw new Error("Файл уроку не знайдено");
      const json = await resp.json();
      exercisesData = json.exercises;
    } else {
      container.innerHTML = "Урок видалено або переміщено.";
      return;
    }

    const solutionsRef = collection(db, "users", email, "solutions");
    const solSnap = await getDocs(solutionsRef);

    let userAnswers = {};
    solSnap.forEach((doc) => {
      const d = doc.data();
      if (d.taskId && d.taskId.startsWith(lessonId)) {
        userAnswers[d.taskId] = d;
      }
    });

    let html = "";

    exercisesData.forEach((ex) => {
      ex.tasks.forEach((task) => {
        const uniqueId = `${lessonId}_${ex.id}_${task.id}`;
        const userAns = userAnswers[uniqueId];

        if (!userAns) {
          html += `
            <div class="q-item" style="border-left: 3px solid #cbd5e1;">
                <div class="q-text">❓ Питання ${task.id}: ${task.q}</div>
                <div class="q-ans" style="color:#94a3b8;">(Немає відповіді)</div>
            </div>`;
          return;
        }

        const isCorrect = userAns.correct;
        const borderColor = isCorrect ? "#22c55e" : "#ef4444";
        const icon = isCorrect ? "✅" : "❌";

        const studentText = userAns.answer.toString().replace(/"/g, "");
        const correctText = task.a.toString().replace(/"/g, "");

        html += `
            <div class="q-item" style="border-left: 3px solid ${borderColor}; padding-left:12px;">
                <div class="q-text" style="font-size:0.9rem; margin-bottom:4px; color:#475569;">
                   ${task.id}) ${task.q}
                </div>
                <div class="q-ans" style="font-size:1rem;">
                    <span style="font-weight:700; color:${isCorrect ? "#15803d" : "#b91c1c"}">
                        ${studentText}
                    </span> ${icon}
                    
                    ${
                      !isCorrect
                        ? `<div class="ans-real" style="margin-top:4px; color:#64748b; font-size:0.85rem;">
                             💡 Правильно: <b>${correctText}</b>
                           </div>`
                        : ""
                    }
                </div>
            </div>
        `;
      });
    });

    if (html === "") html = "<p>Немає даних для відображення.</p>";
    container.innerHTML = html;
    container.setAttribute("data-loaded", "true");

    // 🔥 АКТИВАЦІЯ MATHJAX ДЛЯ ЦЬОГО БЛОКУ 🔥
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([container])
        .then(() => {
          console.log("Формули відмальовано!");
        })
        .catch((err) => console.log("MathJax помилка:", err));
    }
  } catch (e) {
    console.error(e);
    container.innerHTML = `<span style="color:red">Помилка: ${e.message}</span>`;
  }
};

function calculate12Scale(percent) {
  let mark = 1;
  if (percent >= 95) mark = 12;
  else if (percent >= 90) mark = 11;
  else if (percent >= 85) mark = 10;
  else if (percent >= 75) mark = 9;
  else if (percent >= 65) mark = 8;
  else if (percent >= 55) mark = 7;
  else if (percent >= 45) mark = 6;
  else if (percent >= 35) mark = 5;
  else if (percent >= 25) mark = 4;
  else if (percent >= 15) mark = 3;
  else if (percent >= 5) mark = 2;
  else mark = 1;

  let color = "#ef4444";
  if (mark >= 4) color = "#f97316";
  if (mark >= 7) color = "#eab308";
  if (mark >= 10) color = "#16a34a";

  return `<span class="res-badge" style="background:${color}20; color:${color}; border:1px solid ${color}">${mark}</span>`;
}

window.loadStudentDetails = loadStudentDetails;
window.toggleDetails = toggleDetails;
