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
    // Не показуємо alert, якщо користувач просто закрив вікно
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

// 3. ФУНКЦІЯ: ЗБЕРЕГТИ ІМ'Я (Якщо все ж таки вилізла модалка)
window.submitRegistration = async function () {
  const input = document.getElementById("reg-name-input");
  const newName = input.value.trim();

  if (newName.length < 3) {
    alert("Будь ласка, введи повне ім'я");
    return;
  }

  try {
    await setDoc(
      doc(db, "users", currentUserEmail),
      {
        nickname: newName,
        email: currentUserEmail,
        lastActive: new Date(),
      },
      { merge: true },
    );

    regModal.classList.remove("active");
    updateUI(newName);
  } catch (e) {
    console.error("Помилка реєстрації:", e);
    alert("Помилка збереження. Спробуй ще раз.");
  }
};

// 4. ОНОВЛЕННЯ ІНТЕРФЕЙСУ (Аватар + Ім'я)
function updateUI(displayName, photoURL) {
  if (userAvatar && photoURL) {
    userAvatar.src = photoURL;
    userAvatar.style.display = "block";
  }

  if (userDisplay) {
    // Якщо ім'я занадто довге, обрізаємо для краси
    const shortName =
      displayName.length > 15
        ? displayName.substring(0, 12) + "..."
        : displayName;
    userDisplay.innerText = `${shortName} ✏️`;
    userDisplay.style.display = "inline-block";
    userDisplay.onclick = changeNickname;
  }
}

// 5. ЗМІНА ІМЕНІ ВРУЧНУ (Олівчик)
window.changeNickname = async function () {
  const user = auth.currentUser;
  if (!user) return;

  // Беремо чисте ім'я без олівця
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

// 6. 🔥 ГОЛОВНИЙ МОЗОК (ВИПРАВЛЕНО)
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUserEmail = user.email;

    // ✅ 1. МИТТЄВО перемикаємо кнопки (не чекаємо бази)
    if (loginBtn) loginBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "block";

    // ✅ 2. Перевіряємо, чи є користувач в базі
    const userDocRef = doc(db, "users", user.email);
    const userSnapshot = await getDoc(userDocRef);

    if (userSnapshot.exists() && userSnapshot.data().nickname) {
      // ВАРІАНТ А: Користувач вже є в базі -> беремо ім'я з бази
      updateUI(userSnapshot.data().nickname, user.photoURL);
    } else {
      // ВАРІАНТ Б: В базі немає. Дивимось, що дає Google.
      const googleName = user.displayName;

      if (googleName) {
        // 🔥 АВТО-РЕЄСТРАЦІЯ: Якщо Google дав ім'я, використовуємо його!
        // Жодної модалки, просто зберігаємо і працюємо далі.
        await setDoc(
          doc(db, "users", user.email),
          {
            nickname: googleName,
            email: user.email,
            lastActive: new Date(),
            photoURL: user.photoURL, // Збережемо і фото на майбутнє
          },
          { merge: true },
        );

        updateUI(googleName, user.photoURL);
      } else {
        // ВАРІАНТ В: Google не дав імені (рідкісний випадок) -> Тільки тоді модалка
        regModal.classList.add("active");
      }
    }
  } else {
    // 🚪 ГІСТЬ (ВИХІД)
    if (loginBtn) loginBtn.style.display = "block";
    if (logoutBtn) logoutBtn.style.display = "none";
    if (userDisplay) userDisplay.style.display = "none";
    if (userAvatar) userAvatar.style.display = "none";

    // Ховаємо модалку, якщо вона раптом висіла
    if (regModal) regModal.classList.remove("active");
  }
});

window.googleLogin = googleLogin;
window.googleLogout = googleLogout;
