import {
  auth,
  db,
  collection,
  getDocs,
  onAuthStateChanged,
  doc,
  getDoc,
} from "./firebase-config.js";
import { courses } from "./courses-data.js";

onAuthStateChanged(auth, async (user) => {
  if (user) {
    let name = user.displayName || user.email;
    try {
      const userDoc = await getDoc(doc(db, "users", user.email));
      if (userDoc.exists() && userDoc.data().nickname) {
        name = userDoc.data().nickname;
      }
    } catch (e) {
      console.error(e);
    }

    const nameEl = document.getElementById("student-name");
    if (nameEl) nameEl.innerText = name;

    loadDiary(user.email);
  } else {
    window.location.href = "index.html";
  }
});

async function loadDiary(email) {
  const tbody = document.getElementById("diary-body");
  if (!tbody) return;

  try {
    const progressRef = collection(db, "users", email, "progress");
    const progressSnapshot = await getDocs(progressRef);

    if (progressSnapshot.empty) {
      tbody.innerHTML =
        "<tr><td colspan='4' style='text-align:center; color:#94a3b8; padding:20px;'>Щоденник поки пустий. 🚀</td></tr>";
      return;
    }

    tbody.innerHTML = "";

    let records = [];
    progressSnapshot.forEach((doc) => records.push(doc.data()));

    // Сортуємо за датою (нові зверху)
    records.sort((a, b) => {
      const timeA =
        a.lastUpdate && a.lastUpdate.seconds ? a.lastUpdate.seconds : 0;
      const timeB =
        b.lastUpdate && b.lastUpdate.seconds ? b.lastUpdate.seconds : 0;
      return timeB - timeA;
    });

    records.forEach((data) => {
      const course = courses.find((c) => c.id === data.lessonId);
      const title = course ? course.title : data.lessonId || "Архів";
      const badgeText = course ? course.badgeText : "Урок";

      let date = "—";
      if (data.lastUpdate && data.lastUpdate.seconds) {
        date = new Date(data.lastUpdate.seconds * 1000).toLocaleDateString(
          "uk-UA",
        );
      }

      // 🔥 ТУТ ТЕПЕР ЗАВЖДИ 12 БАЛІВ
      const gradeHTML = calculate12Scale(data.percent || 0);

      const row = document.createElement("tr");
      row.innerHTML = `
                <td style="font-weight:600; color:#334155;">${title}</td>
                <td><span style="font-size:0.85rem; background:#f1f5f9; padding:4px 8px; border-radius:6px; color:#64748b;">${badgeText}</span></td>
                <td style="color:#64748b;">${date}</td>
                <td>${gradeHTML}</td>
            `;
      tbody.appendChild(row);
    });
  } catch (e) {
    console.error(e);
    tbody.innerHTML = `<tr><td colspan='4' style="color:red; text-align:center;">Помилка: ${e.message}</td></tr>`;
  }
}

// 🎯 ФУНКЦІЯ ПЕРЕВЕДЕННЯ В 12 БАЛІВ (ДЛЯ ВСЬОГО)
function calculate12Scale(percent) {
  let mark = 1; // Мінімальна оцінка

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

  // Визначаємо колір
  let color = "#ef4444"; // Червоний (1-3)
  if (mark >= 4) color = "#f97316"; // Оранжевий (4-6)
  if (mark >= 7) color = "#eab308"; // Жовтий (7-9)
  if (mark >= 10) color = "#16a34a"; // Зелений (10-12)

  // Повертаємо кружечок з оцінкою
  return `<span class="mark-badge" style="background:${color}20; color:${color}; border:1px solid ${color}">${mark}</span>`;
}
