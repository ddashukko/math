export const courses = [
  // --- АЛГЕБРА 7 КЛАС ---
  {
    id: "alg-7-topic1-lesson",
    title: "Інтенсив: Урок",
    desc: "Теорія і практика",
    type: "lesson", // Папка
    subject: "algebra", // Папка
    grade: 7, // Папка
    filename: "math-intensive", // Файл .json
    badgeText: "Урок",
  },
  {
    id: "alg-7-topic1-hw",
    title: "Інтенсив: Домашка",
    desc: "Закріплення",
    type: "homework",
    subject: "algebra",
    grade: 7,
    filename: "math-intensive", // Той самий файл, але в папці homework
    badgeText: "ДЗ",
  },
  {
    id: "alg-7-topic1-test",
    title: "Інтенсив: Тест",
    desc: "Контроль знань",
    type: "test",
    subject: "algebra",
    grade: 7,
    filename: "math-intensive",
    badgeText: "Тест",
  },

  // --- ПРИКЛАД: ГЕОМЕТРІЯ 8 КЛАС ---
  /*
    {
        id: "geom-8-q1",
        title: "Чотирикутники",
        desc: "Базові поняття",
        type: "lesson",
        subject: "geometria",
        grade: 8,
        filename: "quadrilaterals",
        badgeText: "Геометрія"
    }
    */
];
