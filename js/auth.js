import {
  auth,
  provider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  db,
  doc,
  getDoc,
  setDoc,
} from "./firebase-config.js";

const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const userDisplay = document.getElementById("user-display");
const userAvatar = document.getElementById("user-avatar");
const regModal = document.getElementById("reg-modal");

let currentUserEmail = "";

// 1. ВХІД
async function googleLogin() {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Помилка входу:", error);
    if (error.code !== "auth/popup-closed-by-user") {
      alert("Не вдалося увійти");
    }
  }
}

// 2. ВИХІД
async function googleLogout() {
  try {
    await signOut(auth);
    window.location.reload();
  } catch (error) {
    console.error("Помилка виходу:", error);
  }
}

// 3. ФУНКЦІЯ: ЗБЕРЕГТИ ІМ'Я (Кнопка "Зберегти" у модалці)
window.submitRegistration = async function () {
  const input = document.getElementById("reg-name-input");
  const newName = input.value.trim();

  if (newName.length < 3) {
    alert("Будь ласка, введи повне ім'я");
    return;
  }

  const user = auth.currentUser;
  if (!user) return;

  try {
    // Зберігаємо ім'я в базу
    await setDoc(
      doc(db, "users", currentUserEmail),
      {
        nickname: newName,
        email: currentUserEmail,
        lastActive: new Date(),
        photoURL: user.photoURL,
      },
      { merge: true },
    );

    regModal.classList.remove("active");
    updateUI(newName, user.photoURL);
  } catch (e) {
    console.error("Помилка реєстрації:", e);
    alert("Помилка збереження. Спробуй ще раз.");
  }
};

// 4. ОНОВЛЕННЯ ІНТЕРФЕЙСУ
function updateUI(displayName, photoURL) {
  if (userAvatar && photoURL) {
    userAvatar.src = photoURL;
    userAvatar.style.display = "block";
  }

  if (userDisplay) {
    const shortName =
      displayName.length > 15
        ? displayName.substring(0, 12) + "..."
        : displayName;
    userDisplay.innerText = `${shortName} ✏️`;
    userDisplay.style.display = "inline-block";
    userDisplay.onclick = changeNickname;
  }
}

// 5. ЗМІНА ІМЕНІ ВРУЧНУ
window.changeNickname = async function () {
  const user = auth.currentUser;
  if (!user) return;

  const currentName = userDisplay.innerText.replace(" ✏️", "");
  const newName = prompt("Як тебе підписати?", currentName);

  if (newName && newName.trim() !== "") {
    await setDoc(
      doc(db, "users", user.email),
      { nickname: newName.trim() },
      { merge: true },
    );
    userDisplay.innerText = `${newName.trim()} ✏️`;
  }
};

// 6. 🔥 ГОЛОВНИЙ МОЗОК (ЛОГІКА ВХОДУ)
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUserEmail = user.email;

    // Ховаємо кнопку входу, показуємо вихід
    if (loginBtn) loginBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "block";

    // Перевіряємо базу даних
    const userDocRef = doc(db, "users", user.email);
    const userSnapshot = await getDoc(userDocRef);

    if (userSnapshot.exists() && userSnapshot.data().nickname) {
      // ✅ ВАРІАНТ А: Учень вже був тут -> Пускаємо
      updateUI(userSnapshot.data().nickname, user.photoURL);
    } else {
      // 🛑 ВАРІАНТ Б: Новий учень (або запису немає)
      // Ми НЕ зберігаємо автоматично. Ми показуємо вікно.

      const input = document.getElementById("reg-name-input");
      if (input && user.displayName) {
        // Для зручності вставляємо ім'я з Google, але даємо можливість виправити
        input.value = user.displayName;
      }

      // Відкриваємо модалку ПРИМУСОВО
      if (regModal) regModal.classList.add("active");
    }
  } else {
    // ГІСТЬ
    if (loginBtn) loginBtn.style.display = "block";
    if (logoutBtn) logoutBtn.style.display = "none";
    if (userDisplay) userDisplay.style.display = "none";
    if (userAvatar) userAvatar.style.display = "none";
    if (regModal) regModal.classList.remove("active");
  }
});

window.googleLogin = googleLogin;
window.googleLogout = googleLogout;
