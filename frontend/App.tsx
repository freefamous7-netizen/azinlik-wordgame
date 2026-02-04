import React, { useEffect, useMemo, useState } from "react";
import kuData from "./data/ku_kurmanci.json";

type LetterState = "correct" | "present" | "absent" | "unused";

const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;

const KEYBOARD_ROWS = [
  ["q","w","e","r","t","y","u","i","o","p","ê","î","û"],
  ["a","s","d","f","g","h","j","k","l","ç","ş"],
  ["ENTER","z","x","c","v","b","n","m","DELETE"]
];

function extractWords(data: any): string[] {
  const candidates =
    data?.words ||
    data?.solutions ||
    data?.dictionary ||
    data?.validWords ||
    [];

  return candidates
    .map((w: string) => w.toUpperCase())
    .filter((w: string) => w.length === WORD_LENGTH);
}

export default function App() {
  const WORDS = useMemo(() => extractWords(kuData), []);
  const solution = useMemo(
    () => WORDS[Math.floor(Math.random() * WORDS.length)],
    [WORDS]
  );

  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [status, setStatus] = useState<"playing"|"won"|"lost">("playing");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (status !== "playing") return;

      if (e.key === "Enter") onEnter();
      else if (e.key === "Backspace") onDelete();
      else if (/^[a-zA-Zêîûçş]$/.test(e.key)) onChar(e.key);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  function onChar(c: string) {
    if (current.length < WORD_LENGTH) {
      setCurrent((p) => p + c.toUpperCase());
    }
  }

  function onDelete() {
    setCurrent((p) => p.slice(0, -1));
  }

  function onEnter() {
    if (current.length !== WORD_LENGTH) {
      alert("Word must be 5 letters");
      return;
    }
    if (!WORDS.includes(current)) {
      alert("Ev peyv ne di nav de ye");
      return;
    }

    const next = [...guesses, current];
    setGuesses(next);
    setCurrent("");

    if (current === solution) {
      setStatus("won");
      alert("🎉 Congratulations! You won!");
    } else if (next.length >= MAX_ATTEMPTS) {
      setStatus("lost");
      alert("❌ Game Over: " + solution);
    }
  }

  function getCellState(row: number, col: number): LetterState {
    const guess = guesses[row];
    if (!guess) return "unused";
    const letter = guess[col];
    if (solution[col] === letter) return "correct";
    if (solution.includes(letter)) return "present";
    return "absent";
  }

  return (
    <div style={{ textAlign: "center", color: "#fff", background: "#111", minHeight: "100vh", paddingTop: 40 }}>
      <h1>MINORITY</h1>
      <p>Attempts: {guesses.length}/{MAX_ATTEMPTS}</p>

      <div style={{ display: "inline-grid", gridTemplateRows: `repeat(${MAX_ATTEMPTS}, 1fr)` }}>
        {[...Array(MAX_ATTEMPTS)].map((_, r) => (
          <div key={r} style={{ display: "grid", gridTemplateColumns: `repeat(${WORD_LENGTH}, 1fr)` }}>
            {[...Array(WORD_LENGTH)].map((_, c) => {
              const state = getCellState(r, c);
              const letter =
                guesses[r]?.[c] ||
                (r === guesses.length ? current[c] : "") ||
                "";
              const bg =
                state === "correct" ? "green" :
                state === "present" ? "goldenrod" :
                state === "absent" ? "#333" : "#222";

              return (
                <div key={c} style={{
                  width: 50,
                  height: 50,
                  margin: 4,
                  background: bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  fontWeight: "bold"
                }}>
                  {letter}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 30 }}>
        {KEYBOARD_ROWS.map((row, i) => (
          <div key={i}>
            {row.map((k) => (
              <button
                key={k}
                onClick={() => k === "ENTER" ? onEnter() : k === "DELETE" ? onDelete() : onChar(k)}
                style={{ margin: 3, padding: "10px 12px" }}
              >
                {k}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
