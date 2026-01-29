import {
  auth,
  db,
  collection,
  getDocs,
  onAuthStateChanged,
} from "./firebase-config.js";
import { courses } from "./courses-data.js";

// 💾 КЕШ ПРОГРЕСУ (Щоб не дьоргалось при пошуку)
let userProgressCache = {};

document.addEventListener("DOMContentLoaded", () => {
  renderCourseCards(courses); // Спочатку малюємо пусті
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

// 🔥 ФУНКЦІЯ ЗБЕРЕЖЕННЯ ІМЕНІ (Викликається кнопкою з модалки)
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
      // 1. Оновлюємо профіль Auth
      // Примітка: updateProfile треба імпортувати з firebase-config, але для спрощення зробимо запис в БД

      // 2. Пишемо в базу даних (Головне джерело для Адмінки)
      await setDoc(
        doc(db, "users", user.email),
        {
          email: user.email,
          displayName: name, // 🔥 Ось це ми будемо показувати в журналі
          lastActive: new Date(),
        },
        { merge: true },
      );

      // Ховаємо модалку
      document.getElementById("name-modal").classList.remove("active");
      location.reload(); // Перезавантажуємо, щоб ім'я підтягнулось всюди
    } catch (e) {
      console.error("Error saving name:", e);
      alert("Помилка збереження. Спробуй ще раз.");
    }
  }
};

// 🔥 ФУНКЦІЯ ЗАВАНТАЖЕННЯ ДАНИХ (Один раз при вході)
async function loadUserProgress(email) {
  try {
    const querySnapshot = await getDocs(
      collection(db, "users", email, "progress"),
    );
    userProgressCache = {}; // Очищаємо кеш

    querySnapshot.forEach((doc) => {
      userProgressCache[doc.data().lessonId] = doc.data();
    });
    console.log("Прогрес завантажено:", userProgressCache);
  } catch (error) {
    console.error("Помилка завантаження прогресу:", error);
  }
}

// 🔥 ФУНКЦІЯ ФІЛЬТРАЦІЇ (Працює з кешем)
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

// 🔥 РЕНДЕР КАРТОК (Бере дані з userProgressCache)
function renderCourseCards(coursesList) {
  const grid = document.querySelector(".lesson-grid");
  if (!grid) return;

  grid.innerHTML = ""; // Очищаємо

  if (coursesList.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #94a3b8;">
      🤷‍♂️ Нічого не знайдено...
    </div>`;
    return;
  }

  coursesList.forEach((course) => {
    // Отримуємо дані з кешу (якщо є)
    const progress = userProgressCache[course.id];

    let progressHTML = "";
    let descStyle = "display: block;";

    // ЛОГІКА СМУЖКИ ПРОГРЕСУ
    if (progress) {
      const total =
        progress.totalTasks || progress.correct + progress.wrong || 1;
      const correctPct = (progress.correct / total) * 100;
      const wrongPct = (progress.wrong / total) * 100;
      // Решта (сіре) заповниться автоматично, бо контейнер має сірий фон

      descStyle = "display: none;"; // Ховаємо опис, якщо є прогрес

      progressHTML = `
        <div class="progress-info" style="display: block;">
            <div class="progress-stats">
                <span class="stat-correct">${progress.correct} прав.</span>
                <span class="stat-percent">${progress.percent}%</span>
            </div>
            <div class="progress-container">
                <div class="progress-bar progress-correct" style="width: ${correctPct}%"></div>
                <div class="progress-bar progress-wrong" style="width: ${wrongPct}%"></div>
            </div>
        </div>
      `;
    } else {
      // Якщо прогресу немає - пуста заглушка (прихована)
      progressHTML = `
        <div class="progress-info" style="display: none;">
            <div class="progress-stats">
                <span class="stat-correct">0 прав.</span>
                <span class="stat-percent">0%</span>
            </div>
            <div class="progress-container">
                <div class="progress-bar progress-correct" style="width: 0%"></div>
                <div class="progress-bar progress-wrong" style="width: 0%"></div>
            </div>
        </div>
      `;
    }

    // Вставляємо бейджик
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
