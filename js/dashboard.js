import {
  auth,
  db,
  collection,
  getDocs,
  onAuthStateChanged,
} from "./firebase-config.js";
import { courses } from "./courses-data.js";

document.addEventListener("DOMContentLoaded", () => {
  window.applyFilters = applyFilters;
  renderCourseCards(courses);
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    if (ADMIN_EMAILS.includes(user.email)) {
      const btn = document.getElementById("teacher-btn");
      if (btn) btn.style.display = "flex"; // ПОКАЗУЄМО КНОПКУ
    }
    updateUserProgress(user.email);
  }
});

function applyFilters() {
  const subject = document.getElementById("filter-subject").value;
  const grade = document.getElementById("filter-grade").value;
  const type = document.getElementById("filter-type").value;

  const filtered = courses.filter((course) => {
    const matchSubject = subject === "all" || course.subject === subject;
    const matchGrade =
      grade === "all" || String(course.grade) === String(grade);
    const matchType = type === "all" || course.type === type;
    return matchSubject && matchGrade && matchType;
  });

  renderCourseCards(filtered);
  if (auth.currentUser) {
    updateUserProgress(auth.currentUser.email);
  }
}

function renderCourseCards(dataList) {
  const grid = document.getElementById("courses-root");
  if (!grid) return;
  grid.innerHTML = "";

  if (dataList.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; color:#94a3b8; padding:40px;">Нічого не знайдено 🍃</div>`;
    return;
  }

  dataList.forEach((course) => {
    let badgeStyle = "background:#e0e7ff; color:#4338ca";
    if (course.type === "homework")
      badgeStyle = "background:#fef3c7; color:#d97706";
    if (course.type === "test")
      badgeStyle = "background:#fee2e2; color:#b91c1c";

    const html = `
        <a href="lesson.html?id=${course.id}" class="lesson-card" data-id="${course.id}">
            <div style="display:flex; justify-content:space-between; align-items:start;">
                <span class="badge" style="${badgeStyle}">${course.badgeText}</span>
                <span style="font-size:0.75rem; color:#94a3b8; font-weight:600; border:1px solid #e2e8f0; padding:2px 6px; border-radius:4px;">${course.grade} клас</span>
            </div>
            <h3 style="margin: 10px 0;">${course.title}</h3>
            <div class="progress-info" style="display:none; margin-top:15px;">
                <div class="progress-container">
                    <div class="progress-bar progress-correct" style="width: 0%"></div>
                    <div class="progress-bar progress-wrong" style="width: 0%"></div>
                </div>
                <div class="stats-text"><span class="stat-correct">0 прав.</span><span class="stat-percent">0%</span></div>
            </div>
            <p class="desc-text" style="color: #64748b; font-size: 0.9rem; margin-top:10px;">${course.desc}</p>
        </a>`;
    grid.innerHTML += html;
  });
}

async function updateUserProgress(email) {
  try {
    const querySnapshot = await getDocs(
      collection(db, "users", email, "progress"),
    );
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const card = document.querySelector(
        `.lesson-card[data-id="${data.lessonId}"]`,
      );
      if (card) {
        const progressBlock = card.querySelector(".progress-info");
        const descText = card.querySelector(".desc-text");
        if (progressBlock) progressBlock.style.display = "block";
        if (descText) descText.style.display = "none";
        const total = data.totalTasks || data.correct + data.wrong;
        if (total === 0) return;
        const correctPercent = (data.correct / total) * 100;
        const wrongPercent = (data.wrong / total) * 100;
        card.querySelector(".progress-correct").style.width =
          `${correctPercent}%`;
        card.querySelector(".progress-wrong").style.width = `${wrongPercent}%`;
        card.querySelector(".stat-correct").innerText =
          `✅ ${data.correct} прав.`;
        card.querySelector(".stat-percent").innerText =
          `${Math.round(correctPercent)}%`;
      }
    });
  } catch (error) {
    console.error("Помилка:", error);
  }
}
