// 🛠️ ЗАГАЛЬНІ ФУНКЦІЇ (UTILS)

// Переведення відсотків у 12-бальну шкалу
export function calculate12Scale(percent) {
  let mark = 1;
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

  let color = "#ef4444"; // 1-3
  if (mark >= 4) color = "#f97316"; // 4-6
  if (mark >= 7) color = "#eab308"; // 7-9
  if (mark >= 10) color = "#16a34a"; // 10-12

  return `<span class="res-badge" style="background:${color}20; color:${color}; border:1px solid ${color}; padding: 2px 8px; border-radius: 12px; font-weight: 700;">${mark}</span>`;
}
