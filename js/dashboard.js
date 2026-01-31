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
  setupCustomSelects(); // 🔥 Ініціалізація нових списків
});

onAuthStateChanged(auth, async (user) => {
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const greetingEl = document.getElementById("user-greeting");
  const greetingName = document.getElementById("greeting-name");
  const teacherBtn = document.getElementById("teacher-btn");
  const userAvatar = document.getElementById("user-avatar");

  if (user) {
    // Вхід
    if (loginBtn) loginBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "block";

    if (userAvatar) {
      userAvatar.src =
        user.photoURL ||
        `https://ui-avatars.com/api/?name=${user.displayName}&background=random`;
      userAvatar.style.display = "block";
    }

    if (greetingEl) {
      greetingEl.style.display = "block";
      if (greetingName)
        greetingName.innerText = (user.displayName || "Учень").split(" ")[0];
    }

    if (["dasha.kerroll@gmail.com"].includes(user.email)) {
      if (teacherBtn) teacherBtn.style.display = "flex";
    }

    if (!user.displayName || user.displayName === user.email) {
      const regModal =
        document.getElementById("reg-modal") ||
        document.getElementById("name-modal");
      if (regModal) regModal.classList.add("active");
    }

    await loadUserProgress(user.email);
    applyFilters();
  } else {
    // Гість
    if (loginBtn) loginBtn.style.display = "block";
    if (logoutBtn) logoutBtn.style.display = "none";
    if (userAvatar) userAvatar.style.display = "none";
    if (greetingEl) greetingEl.style.display = "none";
    if (teacherBtn) teacherBtn.style.display = "none";

    applyFilters();
  }
});

window.saveUserName = async function () {
  const input =
    document.getElementById("new-user-name") ||
    document.getElementById("reg-name-input");
  const name = input ? input.value.trim() : "";
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
      const modal =
        document.getElementById("name-modal") ||
        document.getElementById("reg-modal");
      if (modal) modal.classList.remove("active");
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
  } catch (error) {
    console.error("Помилка завантаження прогресу:", error);
  }
}

// 🔥 ЛОГІКА ДЛЯ КРАСИВИХ СЕЛЕКТІВ
function setupCustomSelects() {
  const selects = document.getElementsByClassName("filter-select");

  for (let i = 0; i < selects.length; i++) {
    const selEl = selects[i];
    // Обгортаємо селект в контейнер
    const wrapper = document.createElement("div");
    wrapper.className = "custom-select-container";
    selEl.parentNode.insertBefore(wrapper, selEl);
    wrapper.appendChild(selEl);

    // Створюємо кнопку (відображення)
    const selectedDiv = document.createElement("div");
    selectedDiv.className = "select-selected";
    selectedDiv.innerHTML = selEl.options[selEl.selectedIndex].innerHTML;
    wrapper.appendChild(selectedDiv);

    // Створюємо список (вікно)
    const optionsDiv = document.createElement("div");
    optionsDiv.className = "select-items select-hide";

    for (let j = 0; j < selEl.length; j++) {
      const optionDiv = document.createElement("div");
      optionDiv.innerHTML = selEl.options[j].innerHTML;

      if (j === selEl.selectedIndex) optionDiv.className = "same-as-selected";

      optionDiv.addEventListener("click", function (e) {
        // При кліку:
        // 1. Оновлюємо оригінальний select
        selEl.selectedIndex = j;
        // 2. Оновлюємо кнопку
        selectedDiv.innerHTML = this.innerHTML;
        // 3. Оновлюємо стилі
        const sameAsSelected =
          this.parentNode.getElementsByClassName("same-as-selected");
        for (let k = 0; k < sameAsSelected.length; k++) {
          sameAsSelected[k].removeAttribute("class");
        }
        this.className = "same-as-selected";
        // 4. Закриваємо
        selectedDiv.click();
        // 5. 🔥 Викликаємо applyFilters
        applyFilters();
      });
      optionsDiv.appendChild(optionDiv);
    }
    wrapper.appendChild(optionsDiv);

    // Клік по кнопці - відкрити/закрити
    selectedDiv.addEventListener("click", function (e) {
      e.stopPropagation();
      closeAllSelects(this);
      this.nextSibling.classList.toggle("select-hide");
      this.classList.toggle("select-arrow-active");

      // Показати список (display: block замість none, через клас .select-items без .select-hide)
      if (!this.nextSibling.classList.contains("select-hide")) {
        this.nextSibling.style.display = "block";
      } else {
        this.nextSibling.style.display = "none";
      }
    });
  }

  function closeAllSelects(elmnt) {
    const items = document.getElementsByClassName("select-items");
    const selected = document.getElementsByClassName("select-selected");
    const arrNo = [];

    for (let i = 0; i < selected.length; i++) {
      if (elmnt == selected[i]) {
        arrNo.push(i);
      } else {
        selected[i].classList.remove("select-arrow-active");
      }
    }
    for (let i = 0; i < items.length; i++) {
      if (arrNo.indexOf(i)) {
        items[i].classList.add("select-hide");
        items[i].style.display = "none";
      }
    }
  }

  document.addEventListener("click", closeAllSelects);
}

window.applyFilters = function () {
  const subjectEl = document.getElementById("filter-subject");
  const gradeEl = document.getElementById("filter-grade");
  const searchInput = document.getElementById("search-input");

  const subject = subjectEl ? subjectEl.value : "all";
  const grade = gradeEl ? gradeEl.value : "all";
  const searchText = searchInput ? searchInput.value.toLowerCase().trim() : "";

  const filtered = courses.filter((course) => {
    const matchSubject = subject === "all" || course.subject === subject;
    const matchGrade =
      grade === "all" || String(course.grade) === String(grade);
    let matchSearch = true;
    if (searchText) {
      matchSearch =
        course.title.toLowerCase().includes(searchText) ||
        (course.desc && course.desc.toLowerCase().includes(searchText)) ||
        (course.badgeText &&
          course.badgeText.toLowerCase().includes(searchText)) ||
        String(course.grade).includes(searchText);
    }
    return matchSubject && matchGrade && matchSearch;
  });
  renderCourseCards(filtered);
};

// 🔥 ГОЛОВНА ФУНКЦІЯ РЕНДЕРИНГУ
function renderCourseCards(coursesList) {
  const grid = document.querySelector(".lesson-grid");
  if (!grid) return;
  grid.innerHTML = "";

  if (coursesList.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 60px; color: #94a3b8;">
      <div style="font-size: 3rem; margin-bottom: 10px;">🔍</div>
      Нічого не знайдено...
    </div>`;
    return;
  }

  // 1. ГРУПУВАННЯ
  const groupedCourses = {};
  coursesList.forEach((course) => {
    const key = course.filename;
    if (!groupedCourses[key]) {
      groupedCourses[key] = { items: [], mainInfo: null };
    }
    groupedCourses[key].items.push(course);
    if (course.type === "lesson") groupedCourses[key].mainInfo = course;
  });

  // 2. РЕНДЕРИНГ
  Object.values(groupedCourses).forEach((group) => {
    const baseCourse = group.mainInfo || group.items[0];

    // Сортуємо
    const order = { lesson: 1, homework: 2, test: 3 };
    group.items.sort((a, b) => (order[a.type] || 99) - (order[b.type] || 99));

    // --- ГЕНЕРАЦІЯ СПИСКУ ---
    let listHTML = "";
    let totalCorrect = 0;
    let totalTasks = 0;

    group.items.forEach((item) => {
      let badgeClass = "badge-lesson";
      let label = "Урок";

      if (item.type === "homework") {
        label = "Домашня";
        badgeClass = "badge-homework";
      }
      if (item.type === "test") {
        label = "Тест";
        badgeClass = "badge-test";
      }

      // 🔥 ЛОГІКА ПРОГРЕСУ ТУТ
      const p = userProgressCache[item.id];

      let percentCorrect = 0;
      let percentWrong = 0;
      let statText = "";
      let statClass = "";

      if (p && p.totalTasks > 0) {
        // 1. Беремо кількість з бази
        const correct = p.correct || 0;
        const wrong = p.wrong || 0;
        const total = p.totalTasks;

        // 2. Рахуємо відсотки для ширини
        percentCorrect = (correct / total) * 100;
        percentWrong = (wrong / total) * 100;

        // 3. Додаємо до загальної статистики блоку
        totalCorrect += correct;
        totalTasks += total;

        // 4. Текст статистики (наприклад "8/10")
        statText = `${correct}/${total}`;

        // 5. Колір тексту статистики
        if (percentCorrect < 50) statClass = "bad";
        else if (percentCorrect >= 80) statClass = "good";
      }

      // 🔥 HTML З ДВОМА СМУЖКАМИ
      listHTML += `
            <a href="lesson.html?id=${item.id}" class="detail-row">
                <div class="detail-left">
                    <span class="detail-badge ${badgeClass}">${label}</span>
                </div>
                
                <div class="detail-right">
                    ${p ? `<span class="stat-text ${statClass}">${statText}</span>` : ""}
                    <div class="mini-track">
                        <div class="mini-fill green" style="width: ${percentCorrect}%"></div>
                        
                        <div class="mini-fill red" style="width: ${percentWrong}%"></div>
                        
                        </div>
                </div>
            </a>
        `;
    });

    // Загальний відсоток
    let cardPercent = 0;
    if (totalTasks > 0)
      cardPercent = Math.round((totalCorrect / totalTasks) * 100);

    const subjectNames = {
      algebra: "Алгебра",
      geometry: "Геометрія",
      history: "Історія",
      math: "Математика",
    };
    const label = subjectNames[baseCourse.subject] || baseCourse.subject;
    const badgeClass = `badge-subject-${baseCourse.subject}`;
    const accordionId = `acc-${baseCourse.filename}`;

    const html = `
        <div class="lesson-card">
            <div class="card-main-content">
                <div class="card-header">
                    <span class="lesson-grade">${baseCourse.grade} клас</span>
                    <span class="lesson-subject ${badgeClass}">${label}</span>
                </div>
                
                <h3 class="lesson-title">${baseCourse.title}</h3>
                
                <div class="global-progress">
                    <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:4px; color:#64748b; font-weight:600;">
                        <span>Прогрес теми</span>
                        <span>${cardPercent}%</span>
                    </div>
                    <div class="global-progress-bar">
                        <div class="global-progress-fill" style="width: ${cardPercent}%"></div>
                    </div>
                </div>
            </div>

            <button class="btn-toggle-accordion" onclick="toggleAccordion('${accordionId}', this)">
                <span>Матеріали</span>
                <svg class="arrow-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M6 9l6 6 6-6"/>
                </svg>
            </button>

            <div id="${accordionId}" class="materials-accordion">
                ${listHTML}
            </div>
        </div>`;

    grid.innerHTML += html;
  });
}

window.toggleAccordion = function (id, btn) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.toggle("open");
    btn.classList.toggle("active");

    const span = btn.querySelector("span");
    if (span) {
      if (el.classList.contains("open")) span.innerText = "Згорнути";
      else span.innerText = "Матеріали";
    }
  }
};
