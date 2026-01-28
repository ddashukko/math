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
    // Далі спрацює onAuthStateChanged
  } catch (error) {
    console.error("Помилка входу:", error);
    alert("Не вдалося увійти");
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

// 3. ФУНКЦІЯ: ЗБЕРЕГТИ ІМ'Я ПРИ РЕЄСТРАЦІЇ
window.submitRegistration = async function () {
  const input = document.getElementById("reg-name-input");
  const newName = input.value.trim();

  if (newName.length < 3) {
    alert("Будь ласка, введи повне ім'я");
    return;
  }

  try {
    // Зберігаємо в базу
    await setDoc(
      doc(db, "users", currentUserEmail),
      {
        nickname: newName,
        email: currentUserEmail, // про всяк випадок дублюємо
        lastActive: new Date(),
      },
      { merge: true },
    );

    // Ховаємо вікно
    regModal.classList.remove("active");

    // Оновлюємо інтерфейс
    updateUI(newName);
  } catch (e) {
    console.error("Помилка реєстрації:", e);
    alert("Помилка збереження. Спробуй ще раз.");
  }
};

// 4. ФУНКЦІЯ: ОНОВЛЕННЯ ІНТЕРФЕЙСУ
function updateUI(displayName, photoURL) {
  if (loginBtn) loginBtn.style.display = "none";
  if (logoutBtn) logoutBtn.style.display = "block";

  if (userAvatar && photoURL) {
    userAvatar.src = photoURL;
    userAvatar.style.display = "block";
  }

  if (userDisplay) {
    userDisplay.innerText = `${displayName} ✏️`;
    userDisplay.style.display = "inline-block";
    userDisplay.onclick = changeNickname; // Залишаємо можливість змінити потім
  }
}

// 5. МОЖЛИВІСТЬ ЗМІНИТИ ІМ'Я ПОТІМ (через олівчик)
window.changeNickname = async function () {
  const user = auth.currentUser;
  if (!user) return;
  const currentName = userDisplay.innerText.replace(" ✏️", "");
  const newName = prompt("Змінити ім'я на:", currentName);
  if (newName && newName.trim() !== "") {
    await setDoc(
      doc(db, "users", user.email),
      { nickname: newName.trim() },
      { merge: true },
    );
    userDisplay.innerText = `${newName.trim()} ✏️`;
  }
};

// 6. ГОЛОВНИЙ СПОСТЕРІГАЧ
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUserEmail = user.email;

    // Перевіряємо, чи є ім'я в базі
    const userDocRef = doc(db, "users", user.email);
    const userSnapshot = await getDoc(userDocRef);

    if (userSnapshot.exists() && userSnapshot.data().nickname) {
      // ВЖЕ ЗАРЕЄСТРОВАНИЙ -> Просто показуємо
      updateUI(userSnapshot.data().nickname, user.photoURL);
    } else {
      // НОВАЧОК -> Показуємо вікно реєстрації
      // Але спочатку сховаємо кнопку входу, щоб не тикали
      if (loginBtn) loginBtn.style.display = "none";
      regModal.classList.add("active");
    }
  } else {
    // ГІСТЬ
    if (loginBtn) loginBtn.style.display = "block";
    if (logoutBtn) logoutBtn.style.display = "none";
    if (userDisplay) userDisplay.style.display = "none";
    if (userAvatar) userAvatar.style.display = "none";
    regModal.classList.remove("active");
  }
});

window.googleLogin = googleLogin;
window.googleLogout = googleLogout;
