// js/dashboard.js
import {
  auth,
  db,
  collection,
  getDocs,
  onAuthStateChanged,
} from "./firebase-config.js";
import { courses } from "./courses-data.js";

// 1. Коли сторінка завантажилась — малюємо картки
document.addEventListener("DOMContentLoaded", () => {
  renderCourseCards();
});

// 2. Коли користувач увійшов — завантажуємо його оцінки
onAuthStateChanged(auth, (user) => {
  if (user) {
    updateUserProgress(user.email);
  }
});

// --- МАЛЮВАННЯ КАРТОК ---
function renderCourseCards() {
  const grid = document.getElementById("courses-root");
  if (!grid) return;

  grid.innerHTML = ""; // Чистимо контейнер перед малюванням

  courses.forEach((course) => {
    // Визначаємо колір бейджика
    let badgeStyle = "background:#e0e7ff; color:#4338ca"; // Синій (math)
    if (course.type === "homework")
      badgeStyle = "background:#fef3c7; color:#d97706"; // Оранжевий
    if (course.type === "test")
      badgeStyle = "background:#fee2e2; color:#b91c1c"; // Червоний

    const html = `
        <a href="lesson.html?id=${course.id}" class="lesson-card" data-id="${course.id}">
            <span class="badge" style="${badgeStyle}">${course.badgeText}</span>
            <h3 style="margin: 10px 0;">${course.title}</h3>
            
            <div class="progress-info" style="display:none; margin-top:15px;">
                <div class="progress-container">
                    <div class="progress-bar progress-correct" style="width: 0%"></div>
                    <div class="progress-bar progress-wrong" style="width: 0%"></div>
                </div>
                <div class="stats-text">
                    <span class="stat-correct">0 прав.</span>
                    <span class="stat-percent">0%</span>
                </div>
            </div>

            <p class="desc-text" style="color: #64748b; font-size: 0.9rem; margin-top:10px;">${course.desc}</p>
        </a>
        `;

    grid.innerHTML += html;
  });
}

// --- ОНОВЛЕННЯ ПРОГРЕСУ ---
async function updateUserProgress(email) {
  try {
    // Заходимо в базу даних до учня
    const querySnapshot = await getDocs(
      collection(db, "users", email, "progress"),
    );

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const lessonId = data.lessonId;

      // Шукаємо картку на екрані за ID
      const card = document.querySelector(
        `.lesson-card[data-id="${lessonId}"]`,
      );

      if (card) {
        const progressBlock = card.querySelector(".progress-info");
        const descText = card.querySelector(".desc-text");

        // Ховаємо текст опису, показуємо прогрес
        if (progressBlock) progressBlock.style.display = "block";
        if (descText) descText.style.display = "none";

        // Рахуємо відсотки
        const total = data.totalTasks || data.correct + data.wrong;
        if (total === 0) return;

        const correctPercent = (data.correct / total) * 100;
        const wrongPercent = (data.wrong / total) * 100;

        // Зафарбовуємо смужки
        card.querySelector(".progress-correct").style.width =
          `${correctPercent}%`;
        card.querySelector(".progress-wrong").style.width = `${wrongPercent}%`;

        // Пишемо текст
        card.querySelector(".stat-correct").innerText =
          `✅ ${data.correct} прав.`;
        card.querySelector(".stat-percent").innerText =
          `${Math.round(correctPercent)}%`;
      }
    });
  } catch (error) {
    console.error("Помилка завантаження прогресу:", error);
  }
}
