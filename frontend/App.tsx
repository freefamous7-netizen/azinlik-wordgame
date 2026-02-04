import React, { useEffect, useMemo, useState } from "react";

// Eğer mevcut projende data import'u farklıysa sorun değil.
// Bu import hata verirse, alttaki satırı yorum satırı yap (//) ve wordsArray'i kendi kelime listenle doldur.
// @ts-ignore
import kuData from "./data/ku_kurmanci.json";

type LetterState = "correct" | "present" | "absent" | "unused";

const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;

// Kurmanci harf seti (QWERTY + özel harfler)
const KEYBOARD_ROWS: string[][] = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "ê", "î", "û"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l", "ç", "ş"],
  ["ENTER", "z", "x", "c", "v", "b", "n", "m", "DELETE"],
];

// JSON’dan kelime havuzunu güvenli çek
function extractWords(data: any): string[] {
  const candidates =
    data?.words ??
    data?.solutions ??
    data?.dictionary ??
    data?.validWords ??
    data?.valid_words ??
    data?.kelimeler ??
    data?.liste ??
    [];

  if (Array.isArray(candidates)) {
    return candidates
      .map((w) => String(w).trim().toLowerCase())
      .filter((w) => w.length === WORD_LENGTH);
  }

  // Eğer JSON farklı formatta ise elle uyarlarsın.
  return [];
}

function pickRandomWord(words: string[]): string {
  if (!words.length) return "heval"; // fallback
  return words[Math.floor(Math.random() * words.length)];
}

function scoreFromAttempts(attemptIndex: number): number {
  // attemptIndex: 0 ilk deneme, 5 son deneme
  // 1. denemede 50, 6. denemede 0
  const remaining = MAX_ATTEMPTS - attemptIndex;
  return Math.max(0, remaining * 10);
}

function buildLetterStates(answer: string, guess: string): LetterState[] {
  // Wordle benzeri değerlendirme: correct > present > absent
  const result: LetterState[] = Array(WORD_LENGTH).fill("absent");
  const answerChars = answer.split("");
  const guessChars = guess.split("");

  // 1) correct
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessChars[i] === answerChars[i]) {
      result[i] = "correct";
      answerChars[i] = "_"; // tüket
      guessChars[i] = "-"; // tüket
    }
  }

  // 2) present
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessChars[i] === "-" || result[i] === "correct") continue;
    const idx = answerChars.indexOf(guessChars[i]);
    if (idx !== -1) {
      result[i] = "present";
      answerChars[idx] = "_"; // tüket
    }
  }

  return result;
}

function mergeKeyState(prev: LetterState, next: LetterState): LetterState {
  // Öncelik: correct > present > absent > unused
  const rank: Record<LetterState, number> = {
    unused: 0,
    absent: 1,
    present: 2,
    correct: 3,
  };
  return rank[next] > rank[prev] ? next : prev;
}

export default function App() {
  // Browser tab title
  useEffect(() => {
    document.title = "MINORITY";
  }, []);

  const wordsArray = useMemo(() => extractWords(kuData), []);

  const [answer, setAnswer] = useState<string>(() => pickRandomWord(wordsArray));
  const [currentGuess, setCurrentGuess] = useState<string>("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<LetterState[][]>([]);
  const [keyStates, setKeyStates] = useState<Record<string, LetterState>>({});
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [won, setWon] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);

  // Eğer wordsArray sonradan doluyorsa, answer'ı güncelle
  useEffect(() => {
    if (wordsArray.length) {
      setAnswer((prev) => (prev ? prev : pickRandomWord(wordsArray)));
    }
  }, [wordsArray]);

  function showMessage(msg: string) {
    // Şimdilik alert; sonra modal/toast yaparız.
    alert(msg);
  }

  function isValidWord(word: string): boolean {
    if (word.length !== WORD_LENGTH) return false;
    // Eğer JSON liste doluysa, doğrulama yap
    if (wordsArray.length) return wordsArray.includes(word);
    // Liste yoksa en azından 5 harf kontrolü
    return true;
  }

  function resetGame() {
    const newAnswer = pickRandomWord(wordsArray);
    setAnswer(newAnswer);
    setCurrentGuess("");
    setGuesses([]);
    setStatuses([]);
    setKeyStates({});
    setGameOver(false);
    setWon(false);
    setScore(0);
  }

  function onEnter() {
    if (gameOver) return;

    if (currentGuess.length !== WORD_LENGTH) {
      showMessage("Word must be 5 letters");
      return;
    }

    const guess = currentGuess.toLowerCase();

    if (!isValidWord(guess)) {
      // Kürtçe msg istersen burayı değiştiririz
      showMessage("Ev peyv ne di nav de ye");
      return;
    }

    const st = buildLetterStates(answer, guess);

    // Key states güncelle
    const nextKeyStates = { ...keyStates };
    for (let i = 0; i < WORD_LENGTH; i++) {
      const ch = guess[i];
      const prev = nextKeyStates[ch] ?? "unused";
      nextKeyStates[ch] = mergeKeyState(prev, st[i]);
    }

    const nextGuesses = [...guesses, guess];
    const nextStatuses = [...statuses, st];

    setGuesses(nextGuesses);
    setStatuses(nextStatuses);
    setKeyStates(nextKeyStates);
    setCurrentGuess("");

    const attemptIndex = nextGuesses.length - 1;

    if (guess === answer) {
      const gained = scoreFromAttempts(attemptIndex);
      setScore(gained);
      setWon(true);
      setGameOver(true);
      showMessage(`🎉 Congratulations! You won! Score: ${gained}`);
      return;
    }

    if (nextGuesses.length >= MAX_ATTEMPTS) {
      setScore(0);
      setWon(false);
      setGameOver(true);
      showMessage(`😵 Game over! Answer: ${answer.toUpperCase()}`);
      return;
    }
  }

  function onDelete() {
    if (gameOver) return;
    setCurrentGuess((g) => g.slice(0, -1));
  }

  function onChar(ch: string) {
    if (gameOver) return;
    if (currentGuess.length >= WORD_LENGTH) return;
    setCurrentGuess((g) => g + ch.toLowerCase());
  }

  // Klavye desteği (PC)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter") return onEnter();
      if (e.key === "Backspace") return onDelete();

      const key = e.key.toLowerCase();

      // Sadece tek harf kabul (Türkçe özel harfleri de)
      if (key.length === 1) {
        // izin verilen harfler: latin + ê î û ç ş
        const allowed = "abcdefghijklmnopqrstuvwxyzêîûçş";
        if (allowed.includes(key)) onChar(key);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGuess, gameOver, keyStates, guesses, statuses, answer]);

  const attemptsUsed = guesses.length;
  const attemptsText = `${attemptsUsed}/${MAX_ATTEMPTS}`;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#111",
        color: "#eee",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 40,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      }}
    >
      <div style={{ width: "min(520px, 92vw)" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 18,
          }}
        >
          <h1 style={{ margin: 0, letterSpacing: 1 }}>MINORITY</h1>
          <div style={{ display: "flex", gap: 18, color: "#c9b458" }}>
            <div>Score: {score}</div>
            <div>Attempts: {attemptsText}</div>
          </div>
        </div>

        {/* GRID */}
        <div
          style={{
            display: "grid",
            gridTemplateRows: `repeat(${MAX_ATTEMPTS}, 56px)`,
            gap: 10,
            justifyContent: "center",
            marginBottom: 18,
          }}
        >
          {Array.from({ length: MAX_ATTEMPTS }).map((_, rowIdx) => {
            const guess =
              rowIdx < guesses.length
                ? guesses[rowIdx]
                : rowIdx === guesses.length
                ? currentGuess
                : "";

            const rowStatuses = statuses[rowIdx] ?? [];

            return (
              <div
                key={rowIdx}
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${WORD_LENGTH}, 56px)`,
                  gap: 10,
                }}
              >
                {Array.from({ length: WORD_LENGTH }).map((__, colIdx) => {
                  const ch = guess[colIdx] ?? "";
                  const st =
                    rowIdx < statuses.length ? rowStatuses[colIdx] : "unused";

                  const bg =
                    st === "correct"
                      ? "#6aaa64"
                      : st === "present"
                      ? "#c9b458"
                      : st === "absent"
                      ? "#3a3a3c"
                      : "#1f1f1f";

                  return (
                    <div
                      key={colIdx}
                      style={{
                        width: 56,
                        height: 56,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 10,
                        background: bg,
                        fontSize: 22,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        boxShadow: "0 0 0 1px rgba(255,255,255,0.08) inset",
                      }}
                    >
                      {ch}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* BUTTONS */}
        <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
          <button
            onClick={resetGame}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.06)",
              color: "#eee",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            ↻ New Game
          </button>

          <button
            onClick={() => (window.location.href = "/")}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.06)",
              color: "#eee",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            ← Back to Menu
          </button>
        </div>

        {/* KEYBOARD */}
        <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
          {KEYBOARD_ROWS.map((row, i) => (
            <div key={i} style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              {row.map((k) => {
                const state = keyStates[k.toLowerCase()] ?? "unused";
                const bg =
                  k === "ENTER" || k === "DELETE"
                    ? "rgba(255,255,255,0.10)"
                    : state === "correct"
                    ? "#6aaa64"
                    : state === "present"
                    ? "#c9b458"
                    : state === "absent"
                    ? "#3a3a3c"
                    : "rgba(255,255,255,0.06)";

                const width = k === "ENTER" || k === "DELETE" ? 96 : 44;

                return (
                  <button
                    key={k}
                    onClick={() => {
                      if (k === "ENTER") return onEnter();
                      if (k === "DELETE") return onDelete();
                      onChar(k);
                    }}
                    style={{
                      width,
                      height: 44,
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: bg,
                      color: "#eee",
                      cursor: "pointer",
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  >
                    {k}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* FOOTER */}
        <div style={{ marginTop: 14, textAlign: "center", opacity: 0.7, fontSize: 12 }}>
          {gameOver ? (won ? "You won 🎉" : "Try again 😈") : "Guess the word."}
        </div>
      </div>
    </div>
  );
}
