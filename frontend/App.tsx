import React, { useEffect, useState } from "react";
import { LANGUAGES, DEFAULT_LANG } from "./data/languages";

const lang = LANGUAGES[DEFAULT_LANG];

const WORD_LENGTH = lang.meta.wordlength;
const MAX_ATTEMPTS = 6;

// 🔐 Daily word selector (deterministic)
function getDailyWord(words: string[]) {
  const today = new Date();
  const seed =
    today.getFullYear() * 10000 +
    (today.getMonth() + 1) * 100 +
    today.getDate();
  return words[seed % words.length].toUpperCase();
}

export default function App() {
  const solution = getDailyWord(lang.words.solutions);

  const [currentGuess, setCurrentGuess] = useState("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (gameOver) return;

      if (e.key === "Enter") submitGuess();
      else if (e.key === "Backspace") {
        setCurrentGuess((g) => g.slice(0, -1));
      } else if (
        lang.meta.letters.includes(e.key.toLowerCase()) &&
        currentGuess.length < WORD_LENGTH
      ) {
        setCurrentGuess((g) => g + e.key.toUpperCase());
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentGuess, gameOver]);

  function submitGuess() {
    if (currentGuess.length !== WORD_LENGTH) {
      setMessage(lang.ui.messages.notEnoughLetters);
      return;
    }

    if (!lang.words.allowed.includes(currentGuess.toLowerCase())) {
      setMessage(lang.ui.messages.notInDictionary);
      return;
    }

    const next = [...guesses, currentGuess];
    setGuesses(next);
    setCurrentGuess("");
    setMessage("");

    if (currentGuess === solution) {
      setMessage("🎉 Kazandın!");
      setGameOver(true);
    } else if (next.length >= MAX_ATTEMPTS) {
      setMessage(`❌ Kelime: ${solution}`);
      setGameOver(true);
    }
  }

  function tileColor(letter: string, index: number) {
    if (!solution.includes(letter)) return "#3a3a3c";
    if (solution[index] === letter) return "#538d4e";
    return "#b59f3b";
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#121213",
        color: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 40,
        fontFamily: "Arial",
      }}
    >
      <h1>{lang.ui.title}</h1>

      {message && <p>{message}</p>}

      <div>
        {[...Array(MAX_ATTEMPTS)].map((_, row) => {
          const word = guesses[row] || (row === guesses.length ? currentGuess : "");
          return (
            <div key={row} style={{ display: "flex" }}>
              {[...Array(WORD_LENGTH)].map((_, i) => {
                const char = word[i] || "";
                const bg =
                  row < guesses.length
                    ? tileColor(char, i)
                    : "#121213";
                return (
                  <div
                    key={i}
                    style={{
                      width: 50,
                      height: 50,
                      margin: 4,
                      border: "2px solid #3a3a3c",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 24,
                      background: bg,
                    }}
                  >
                    {char}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <button
        onClick={() => window.location.reload()}
        style={{
          marginTop: 20,
          padding: "10px 20px",
          cursor: "pointer",
        }}
      >
        Yeni Gün
      </button>
    </div>
  );
}
