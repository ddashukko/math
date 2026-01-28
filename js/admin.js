import {
  db,
  collection,
  getDocs,
  auth,
  onAuthStateChanged,
} from "./firebase-config.js";
import { courses } from "./courses-data.js"; // Підтягуємо назви уроків

// Перевірка входу вчителя
onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById("admin-user").innerText = user.email;
    loadAdminData();
  } else {
    window.location.href = "index.html";
  }
});

async function loadAdminData() {
  const tableBody = document.getElementById("table-body");
  tableBody.innerHTML =
    "<tr><td colspan='5' style='text-align:center'>Завантаження...</td></tr>";

  try {
    // 1. Беремо список всіх учнів
    const usersSnapshot = await getDocs(collection(db, "users"));

    if (usersSnapshot.empty) {
      tableBody.innerHTML = "<tr><td colspan='5'>Немає учнів</td></tr>";
      return;
    }

    tableBody.innerHTML = ""; // Очищаємо перед малюванням

    // 2. Проходимо по кожному учню
    for (const userDoc of usersSnapshot.docs) {
      const userEmail = userDoc.id;
      const userData = userDoc.data();
      const lastActive = userData.lastActive
        ? userData.lastActive.toDate().toLocaleString("uk-UA")
        : "Н/Д";

      // 3. Заходимо в папку 'progress' цього учня
      const progressRef = collection(db, "users", userEmail, "progress");
      const progressSnapshot = await getDocs(progressRef);

      if (progressSnapshot.empty) {
        // Учень є, але ще нічого не вирішував
        renderRow(tableBody, userEmail, "—", "0%", lastActive, "Новий");
        continue;
      }

      // 4. Малюємо рядок для КОЖНОГО пройденого уроку
      progressSnapshot.forEach((progDoc) => {
        const prog = progDoc.data();

        // Шукаємо красиву назву уроку по ID
        const courseInfo = courses.find((c) => c.id === prog.lessonId);
        const lessonTitle = courseInfo ? courseInfo.title : prog.lessonId;

        renderRow(
          tableBody,
          userEmail,
          lessonTitle,
          `${prog.percent}%`,
          lastActive,
          prog.correct + "/" + prog.totalTasks,
        );
      });
    }
  } catch (error) {
    console.error("Помилка адмінки:", error);
    tableBody.innerHTML = `<tr><td colspan='5' style="color:red">Помилка: ${error.message}</td></tr>`;
  }
}

function renderRow(container, email, lesson, percent, time, score) {
  const row = document.createElement("tr");

  // Фарбуємо відсотки: зелений якщо > 80%, жовтий > 50%
  let percentColor = "#ef4444"; // Червоний
  const pVal = parseInt(percent);
  if (pVal >= 50) percentColor = "#eab308"; // Жовтий
  if (pVal >= 80) percentColor = "#22c55e"; // Зелений

  row.innerHTML = `
        <td style="font-weight:600; color:#334155;">${email}</td>
        <td>${lesson}</td>
        <td><span class="score-badge" style="background:${percentColor}20; color:${percentColor}">${percent}</span></td>
        <td style="font-size:0.9rem;">${score} прав.</td>
        <td style="color:#64748b; font-size:0.85rem;">${time}</td>
    `;
  container.appendChild(row);
}
