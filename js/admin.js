import {
  db,
  collection,
  getDocs,
  auth,
  onAuthStateChanged,
} from "./firebase-config.js";
import { courses } from "./courses-data.js";

// 🛑 ТВОЯ ПОШТА ТУТ (Заміни на свою!)
const TEACHER_EMAILS = ["dasha.kerroll@gmail.com"];

onAuthStateChanged(auth, (user) => {
  if (user) {
    if (!TEACHER_EMAILS.includes(user.email)) {
      alert("Немає доступу до журналу!");
      window.location.href = "index.html";
      return;
    }
    document.getElementById("admin-user").innerText = user.email;
    loadAdminData();
  } else {
    window.location.href = "index.html";
  }
});

async function loadAdminData() {
  const tableBody = document.getElementById("table-body");
  tableBody.innerHTML =
    "<tr><td colspan='5' style='text-align:center; padding:20px;'>🔄 Завантаження...</td></tr>";

  try {
    const usersSnapshot = await getDocs(collection(db, "users"));
    if (usersSnapshot.empty) {
      tableBody.innerHTML =
        "<tr><td colspan='5' style='text-align:center'>Список порожній</td></tr>";
      return;
    }

    tableBody.innerHTML = "";

    for (const userDoc of usersSnapshot.docs) {
      const userEmail = userDoc.id;
      const userData = userDoc.data();
      const studentName =
        userData.nickname || userData.displayName || "Без імені";

      const nameHTML = `
                <div style="font-weight: 700; color: #1e293b; font-size: 1rem;">${studentName}</div>
                <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 2px;">${userEmail}</div>
            `;
      const pureName = studentName;
      const lastActive = userData.lastActive
        ? userData.lastActive.toDate().toLocaleString("uk-UA")
        : "—";

      const progressRef = collection(db, "users", userEmail, "progress");
      const progressSnapshot = await getDocs(progressRef);

      if (progressSnapshot.empty) {
        renderRow(
          tableBody,
          userEmail,
          nameHTML,
          "—",
          "—",
          lastActive,
          "—",
          null,
        );
        continue;
      }

      progressSnapshot.forEach((progDoc) => {
        const prog = progDoc.data();
        const courseInfo = courses.find((c) => c.id === prog.lessonId);
        const lessonTitle = courseInfo ? courseInfo.title : prog.lessonId;
        renderRow(
          tableBody,
          userEmail,
          nameHTML,
          lessonTitle,
          `${prog.percent}%`,
          lastActive,
          `${prog.correct}/${prog.totalTasks}`,
          prog.lessonId,
          pureName,
        );
      });
    }
  } catch (error) {
    console.error("Помилка:", error);
    tableBody.innerHTML = `<tr><td colspan='5' style="color:red; text-align:center;">Помилка: ${error.message}</td></tr>`;
  }
}

function renderRow(
  container,
  email,
  nameHTML,
  lesson,
  percent,
  time,
  score,
  lessonId,
  pureName,
) {
  const row = document.createElement("tr");
  let percentColor = "#94a3b8";
  if (percent !== "—") {
    const pVal = parseInt(percent);
    percentColor = "#ef4444";
    if (pVal >= 50) percentColor = "#eab308";
    if (pVal >= 80) percentColor = "#22c55e";
  }

  row.style.cursor = lessonId ? "pointer" : "default";
  row.innerHTML = `
        <td style="padding: 12px 16px;">${nameHTML}</td>
        <td style="font-weight: 500; color: #475569;">${lesson}</td>
        <td>${percent !== "—" ? `<span class="score-badge" style="background:${percentColor}20; color:${percentColor}">${percent}</span>` : "—"}</td>
        <td style="font-size:0.9rem;">${score}</td>
        <td style="color:#64748b; font-size:0.85rem;">${time}</td>
    `;

  if (lessonId) {
    row.onclick = () => openStudentDetails(email, lessonId, lesson, pureName);
  }
  container.appendChild(row);
}

window.openStudentDetails = async function (
  email,
  lessonId,
  lessonTitle,
  studentName,
) {
  const modal = document.getElementById("detail-modal");
  const title = document.getElementById("modal-title");
  const body = document.getElementById("modal-body");

  modal.classList.add("active");
  title.innerText = `${studentName} — ${lessonTitle}`;
  body.innerHTML =
    "<div style='text-align:center; padding:30px; color:#64748b;'>🔍 Завантажуємо...</div>";

  try {
    // 🔥 ВИЗНАЧЕННЯ ШЛЯХУ (НОВА ЛОГІКА)
    const course = courses.find((c) => c.id === lessonId);
    let fetchPath = "";
    if (course) {
      fetchPath = `data/${course.subject}/${course.grade}/${course.type}/${course.filename}.json`;
    } else {
      fetchPath = `data/${lessonId}.json`;
    }

    const lessonResponse = await fetch(fetchPath);
    if (!lessonResponse.ok) throw new Error("Файл не знайдено");
    const lessonData = await lessonResponse.json();

    const solutionsRef = collection(db, "users", email, "solutions");
    const snapshot = await getDocs(solutionsRef);

    let solutions = [];
    snapshot.forEach((doc) => {
      if (doc.data().taskId.startsWith(lessonId)) {
        solutions.push(doc.data());
      }
    });

    if (solutions.length === 0) {
      body.innerHTML =
        "<p style='text-align:center'>Немає детальних відповідей.</p>";
      return;
    }

    solutions.sort((a, b) => a.taskId.localeCompare(b.taskId));

    let html = `<div style="margin-bottom:15px; font-weight:bold; color:#4f46e5; border-bottom:1px solid #e2e8f0; padding-bottom:10px;">Детальний звіт</div>`;

    solutions.forEach((sol) => {
      const parts = sol.taskId.split("_");
      let niceName = "Завдання";
      let questionText = "Умова не знайдена.";

      if (parts.length >= 3) {
        const exNum = parts[1].replace(/\D/g, "");
        const taskNum = parts[2].replace(/\D/g, "");
        niceName = `Вправа ${exNum}, Завдання ${taskNum}`;
        const exercise = lessonData.exercises.find((e) => e.id === parts[1]);
        if (exercise) {
          const task = exercise.tasks.find((t) => t.id === parts[2]);
          if (task) questionText = task.q;
        }
      } else {
        niceName = parts[parts.length - 1];
      }

      const isCorrect = sol.correct;
      const statusColor = isCorrect ? "#16a34a" : "#dc2626";
      const statusIcon = isCorrect ? "✅ Правильно" : "❌ Помилка";
      const bgSummary = isCorrect ? "#f0fdf4" : "#fef2f2";
      const borderSummary = isCorrect ? "#bbf7d0" : "#fecaca";

      html += `
            <div class="log-item">
                <div class="log-summary" style="background: ${bgSummary}; border-bottom: 1px solid ${borderSummary};" onclick="toggleDetails(this)">
                    <div style="font-weight: 700; color: #334155;">${niceName}</div>
                    <div style="font-weight: 600; color: ${statusColor}; font-size: 0.9rem;">${statusIcon}</div>
                </div>
                <div class="log-details-hidden">
                    <div style="margin-bottom: 10px;">
                        <strong style="color:#4f46e5; font-size:0.85rem;">УМОВА:</strong>
                        <div style="margin-top:4px; font-family:serif; font-size:1.1rem; padding-left:10px; border-left:3px solid #e2e8f0;">${questionText}</div>
                    </div>
                    <div>
                        <strong style="color:#4f46e5; font-size:0.85rem;">ВІДПОВІДЬ:</strong>
                        <div style="margin-top:4px; font-weight:bold; font-size:1rem; padding:6px 10px; background:#f8fafc; border-radius:6px; display:inline-block; border:1px solid #cbd5e1;">${sol.answer}</div>
                    </div>
                </div>
            </div>`;
    });

    body.innerHTML = html;
    if (window.MathJax && window.MathJax.typesetPromise) {
      await MathJax.typesetPromise([body]);
    }
  } catch (e) {
    console.error(e);
    body.innerHTML = `<p style="color:red">Помилка: ${e.message}</p>`;
  }
};

window.toggleDetails = function (element) {
  const details = element.nextElementSibling;
  details.classList.toggle("open");
};
