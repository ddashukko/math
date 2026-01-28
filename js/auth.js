// js/auth.js
import {
  auth,
  provider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "./firebase-config.js";

// Елементи HTML (які ми скоро створимо)
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const userDisplay = document.getElementById("user-display");
const userAvatar = document.getElementById("user-avatar");

// 1. ФУНКЦІЯ ВХОДУ
async function googleLogin() {
  try {
    await signInWithPopup(auth, provider);
    // Сторінка сама зрозуміє, що вхід виконано, через onAuthStateChanged
  } catch (error) {
    console.error("Помилка входу:", error);
    alert("Не вдалося увійти: " + error.message);
  }
}

// 2. ФУНКЦІЯ ВИХОДУ
async function googleLogout() {
  try {
    await signOut(auth);
    window.location.reload(); // Перезавантажуємо сторінку
  } catch (error) {
    console.error("Помилка виходу:", error);
  }
}

// 3. СЛІДКУЄМО ЗА СТАНОМ (Чи увійшов користувач?)
onAuthStateChanged(auth, (user) => {
  if (user) {
    // --- КОРИСТУВАЧ УВІЙШОВ ---
    console.log("Увійшов:", user.displayName);

    if (loginBtn) loginBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "block";

    if (userDisplay) {
      userDisplay.innerText = user.displayName; // Показуємо ім'я
      userDisplay.style.display = "block";
    }
    if (userAvatar) {
      userAvatar.src = user.photoURL; // Показуємо фото
      userAvatar.style.display = "block";
    }
  } else {
    // --- ГІСТЬ ---
    console.log("Гість");
    if (loginBtn) loginBtn.style.display = "block";
    if (logoutBtn) logoutBtn.style.display = "none";
    if (userDisplay) userDisplay.style.display = "none";
    if (userAvatar) userAvatar.style.display = "none";
  }
});

// Робимо функції доступними для кнопок в HTML
window.googleLogin = googleLogin;
window.googleLogout = googleLogout;
