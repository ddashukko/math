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
import { calculate12Scale } from "./utils.js";

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
