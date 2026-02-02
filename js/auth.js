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
// Два модальні вікна:
const regModal = document.getElementById("reg-modal"); // Для введення імені
const welcomeModal = document.getElementById("welcome-modal"); // Для входу/гостя

let currentUserEmail = "";
let isGuestMode = false; // Прапорець, щоб не мучити гостя повторно

// 1. ВХІД (Викликається з кнопки Google)
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

// 2. ВХІД ЯК ГІСТЬ
window.enterAsGuest = function () {
  isGuestMode = true; // Запам'ятовуємо, що користувач свідомо вибрав гостя
  if (welcomeModal) welcomeModal.classList.remove("active");
};

// 3. ВИХІД
async function googleLogout() {
  try {
    await signOut(auth);
    window.location.reload();
  } catch (error) {
    console.error("Помилка виходу:", error);
  }
}

// 4. ЗБЕРЕЖЕННЯ ІМЕНІ (Реєстрація)
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
    await setDoc(
      doc(db, "users", currentUserEmail),
      {
        displayName: newName,
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

// 5. ОНОВЛЕННЯ ІНТЕРФЕЙСУ
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

// 6. ЗМІНА ІМЕНІ ВРУЧНУ
window.changeNickname = async function () {
  const user = auth.currentUser;
  if (!user) return;

  const currentName = userDisplay.innerText.replace(" ✏️", "");
  const newName = prompt("Як тебе підписати?", currentName);

  if (newName && newName.trim() !== "") {
    await setDoc(
      doc(db, "users", user.email),
      { displayName: newName.trim() },
      { merge: true },
    );
    userDisplay.innerText = `${newName.trim()} ✏️`;
  }
};

// 7. 🔥 ГОЛОВНИЙ МОЗОК (ЛОГІКА ВХОДУ)
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // === КОРИСТУВАЧ УВІЙШОВ ===
    currentUserEmail = user.email;

    // Закриваємо вітальне вікно, бо він вже увійшов
    if (welcomeModal) welcomeModal.classList.remove("active");

    if (loginBtn) loginBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "block";

    // Перевіряємо базу даних на наявність імені
    const userDocRef = doc(db, "users", user.email);
    const userSnapshot = await getDoc(userDocRef);

    if (userSnapshot.exists() && userSnapshot.data().displayName) {
      // Все ок, учень відомий
      updateUI(userSnapshot.data().displayName, user.photoURL);
    } else {
      // Новий учень -> Показуємо вікно реєстрації (Ім'я)
      const input = document.getElementById("reg-name-input");
      if (input && user.displayName) {
        input.value = user.displayName;
      }
      if (regModal) regModal.classList.add("active");
    }
  } else {
    // === КОРИСТУВАЧ НЕ УВІЙШОВ (ГІСТЬ) ===
    if (loginBtn) loginBtn.style.display = "block";
    if (logoutBtn) logoutBtn.style.display = "none";
    if (userDisplay) userDisplay.style.display = "none";
    if (userAvatar) userAvatar.style.display = "none";

    if (regModal) regModal.classList.remove("active");

    // 🔥 Показуємо ВІТАЛЬНЕ ВІКНО, якщо він ще не натиснув "Я гість"
    if (!isGuestMode && welcomeModal) {
      welcomeModal.classList.add("active");
    }
  }
});

window.googleLogin = googleLogin;
window.googleLogout = googleLogout;
