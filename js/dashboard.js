import {
  auth,
  db,
  collection,
  getDocs,
  onAuthStateChanged,
  doc,
  setDoc,
} from "./firebase-config.js";
import { courses } from "./courses-data.js";

let userProgressCache = {};

document.addEventListener("DOMContentLoaded", () => {
  renderCourseCards(courses);
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    if (["dasha.kerroll@gmail.com"].includes(user.email)) {
      const btn = document.getElementById("teacher-btn");
      if (btn) btn.style.display = "flex";
    }
    if (!user.displayName || user.displayName === user.email) {
      document.getElementById("name-modal").classList.add("active");
    }
    await loadUserProgress(user.email);
    applyFilters();
  }
});

window.saveUserName = async function () {
  const input = document.getElementById("new-user-name");
  const name = input.value.trim();
  if (name.length < 3) {
    alert("Будь ласка, введи повне ім'я.");
    return;
  }
  const user = auth.currentUser;
  if (user) {
    try {
      await setDoc(
        doc(db, "users", user.email),
        {
          email: user.email,
          displayName: name,
          lastActive: new Date(),
        },
        { merge: true },
      );
      document.getElementById("name-modal").classList.remove("active");
      location.reload();
    } catch (e) {
      console.error("Error saving name:", e);
      alert("Помилка збереження.");
    }
  }
};

async function loadUserProgress(email) {
  try {
    const querySnapshot = await getDocs(
      collection(db, "users", email, "progress"),
    );
    userProgressCache = {};
    querySnapshot.forEach((doc) => {
      userProgressCache[doc.data().lessonId] = doc.data();
    });
    console.log("Прогрес:", userProgressCache);
  } catch (error) {
    console.error("Помилка завантаження:", error);
  }
}

window.applyFilters = function () {
  const subjectEl = document.getElementById("filter-subject");
  const gradeEl = document.getElementById("filter-grade");
  const typeEl = document.getElementById("filter-type");
  const searchInput = document.getElementById("search-input");

  const subject = subjectEl ? subjectEl.value : "all";
  const grade = gradeEl ? gradeEl.value : "all";
  const type = typeEl ? typeEl.value : "all";
  const searchText = searchInput ? searchInput.value.toLowerCase().trim() : "";

  const filtered = courses.filter((course) => {
    const matchSubject = subject === "all" || course.subject === subject;
    const matchGrade =
      grade === "all" || String(course.grade) === String(grade);
    const matchType = type === "all" || course.type === type;

    let matchSearch = true;
    if (searchText) {
      matchSearch =
        course.title.toLowerCase().includes(searchText) ||
        (course.desc && course.desc.toLowerCase().includes(searchText)) ||
        (course.badgeText &&
          course.badgeText.toLowerCase().includes(searchText)) ||
        String(course.grade).includes(searchText);
    }
    return matchSubject && matchGrade && matchType && matchSearch;
  });
  renderCourseCards(filtered);
};

function renderCourseCards(coursesList) {
  const grid = document.querySelector(".lesson-grid");
  if (!grid) return;
  grid.innerHTML = "";

  if (coursesList.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #94a3b8;">
      🤷‍♂️ Нічого не знайдено...
    </div>`;
    return;
  }

  coursesList.forEach((course) => {
    const progress = userProgressCache[course.id];
    let progressHTML = "";
    let descStyle = "display: block;";

    if (progress) {
      // 1. Беремо загальну кількість питань (важливо!)
      // Якщо totalTasks немає в базі, fallback на суму, але краще totalTasks
      const total =
        progress.totalTasks || progress.correct + progress.wrong || 1;

      // 2. Рахуємо ширину смужок (відносно всього уроку)
      const correctPct = Math.round((progress.correct / total) * 100);
      const wrongPct = Math.round((progress.wrong / total) * 100);

      // Решта (сіре) утвориться само собою, бо ширина зеленого + червоного < 100%

      descStyle = "display: none;";

      progressHTML = `
        <div class="progress-info" style="display: block;">
            <div class="progress-stats">
                <span class="stat-correct">${progress.correct} прав.</span>
                <span class="stat-percent">${progress.percent}%</span>
            </div>
            <div class="progress-container">
                <div class="progress-bar progress-correct" style="width: ${correctPct}%"></div>
                ${wrongPct > 0 ? `<div class="progress-bar progress-wrong" style="width: ${wrongPct}%"></div>` : ""}
            </div>
        </div>
      `;
    } else {
      progressHTML = `
        <div class="progress-info" style="display: none;">
            <div class="progress-stats">
                <span class="stat-correct">0 прав.</span>
                <span class="stat-percent">0%</span>
            </div>
            <div class="progress-container">
                <div class="progress-bar progress-correct" style="width: 0%"></div>
            </div>
        </div>
      `;
    }

    let badgeClass = "badge-lesson";
    if (course.type === "homework") badgeClass = "badge-homework";
    if (course.type === "test") badgeClass = "badge-test";

    const html = `
        <a href="lesson.html?id=${course.id}" class="lesson-card" data-id="${course.id}">
            <div class="card-header">
                <span class="lesson-grade">${course.grade} клас</span>
                <span class="lesson-type ${badgeClass}">${course.badgeText || "Урок"}</span>
            </div>
            <h3 class="lesson-title">${course.title}</h3>
            
            ${progressHTML}
            
            <p class="desc-text" style="color: #64748b; font-size: 0.9rem; margin-top:10px; ${descStyle}">${course.desc}</p>
        </a>`;
    grid.innerHTML += html;
  });
}
