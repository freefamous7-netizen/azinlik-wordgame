/* ================================
   MINORITY – 5 Letter Word Game
   Daily Word Logic (Single File)
   ================================ */

/* ---- AYARLAR ---- */
const GAME_NAME = "MINORITY";
const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;

/* ---- KURMANÇÎ 5 HARF KELİMELER ---- */
/* (İstediğin kadar ekleyebilirsin) */
const WORDS = [
  "HEVAL", // arkadaş
  "WELAT", // ülke
  "ROJIN", // gün
  "ZIMAN", // dil
  "AZADI", // özgürlük
  "GELAN", // halklar
  "JINAN", // kadınlar
  "BIRIN", // yaralar
  "DILAN", // kalpler
  "ROJAN"  // günler
];

/* ---- DAILY WORD HESAPLAMA ---- */
function getDailyWord(words) {
  const startDate = new Date("2024-01-01");
  const today = new Date();

  startDate.setHours(0,0,0,0);
  today.setHours(0,0,0,0);

  const diffDays = Math.floor(
    (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const index = diffDays % words.length;
  return words[index];
}

/* ---- OYUN STATE ---- */
const SECRET_WORD = getDailyWord(WORDS);
let attempts = 0;
let gameOver = false;

/* ---- KONTROL ---- */
function submitGuess(guess) {
  if (gameOver) {
    alert("Game over");
    return;
  }

  if (guess.length !== WORD_LENGTH) {
    alert("Word must be 5 letters");
    return;
  }

  guess = guess.toUpperCase();

  if (!WORDS.includes(guess)) {
    alert("Ev peyv ne di nav de ye");
    return;
  }

  attempts++;

  if (guess === SECRET_WORD) {
    gameOver = true;
    alert(`🎉 Congratulations! You won!\nScore: ${150 - (attempts - 1) * 10}`);
    return;
  }

  if (attempts >= MAX_ATTEMPTS) {
    gameOver = true;
    alert(`❌ Game Over\nWord was: ${SECRET_WORD}`);
  }
}

/* ---- BİLGİ ---- */
console.log(`🎮 ${GAME_NAME}`);
console.log(`Language: Kurmanji Kurdish`);
console.log(`Daily Word: ${SECRET_WORD}`);
console.log(`Every language matters.`);
