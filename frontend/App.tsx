import React, { useEffect, useMemo, useState } from "react";
import data from "./data/ku_kurmanci.json";

type LetterStatus = "correct" | "present" | "absent" | "empty";

const WORD_LENGTH = data.meta.wordlength;
const MAX_ATTEMPTS = 6;

function pickRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function evaluateGuess(guess: string, solution: string): LetterStatus[] {
  const res: LetterStatus[] = Array(WORD_LENGTH).fill("absent");
  const sol = solution.split("");
  const g = guess.split("");

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (g[i] === sol[i]) {
      res[i] = "correct";
      sol[i] = "#";
      g[i] = "*";
    }
  }

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (g[i] === "*") continue;
    const idx = sol.indexOf(g[i]);
    if (idx !== -1) {
      res[i] = "present";
      sol[idx] = "#";
    }
  }

  return res;
}

function tileColor(s: LetterStatus) {
  if (s === "correct") return "#16a34a";
  if (s === "present") return "#eab308";
  if (s === "absent") return "#334155";
  return "#111827";
}

export default function App() {
  const dictionary = data.dictionary.validGuesses.map((w: string) => w.toUpperCase());
  const solutions = data.dictionary.solutions.map((w: string) => w.toUpperCase());

  const [solution, setSolution] = useState(() => pickRandom(solutions));
  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [gameOver, setGameOver] = useState(false);

  const rows = useMemo(() => {
    const r = [...guesses];
    while (r.length < MAX_ATTEMPTS) r.push("");
    return r.map((w, i) => (i === guesses.length && !gameOver ? current : w));
  }, [guesses, current, gameOver]);

  function submit() {
    if (gameOver) return;

    if (current.length !== WORD_LENGTH) {
      alert(data.ui.messages.notEnoughLetters);
      return;
    }

    const word = current.toUpperCase();
    if (!dictionary.includes(word)) {
      alert(data.ui.messages.notInDictionary);
      return;
    }

    const next = [...guesses, word];
    setGuesses(next);
    setCurrent("");

    if (word === solution) {
      setGameOver(true);
      alert("🎉 Congratulations!");
      return;
    }

    if (next.length >= MAX_ATTEMPTS) {
      setGameOver(true);
      alert("❌ " + solution);
    }
  }

  function press(k: string) {
    if (gameOver) return;
    if (k === "ENTER") return submit();
    if (k === "DELETE") return setCurrent(c => c.slice(0, -1));
    if (current.length < WORD_LENGTH) setCurrent(c => c + k);
  }

  function newGame() {
    setSolution(pickRandom(solutions));
    setGuesses([]);
    setCurrent("");
    setGameOver(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0b1020", color: "white", padding: 24 }}>
      <h1 style={{ textAlign: "center" }}>{data.ui.title}</h1>

      <div style={{ display: "grid", gap: 8, justifyContent: "center" }}>
        {rows.map((w, r) => {
          const letters = w.padEnd(WORD_LENGTH).split("");
          const evals =
            r < guesses.length ? evaluateGuess(w, solution) : Array(WORD_LENGTH).fill("empty");

          return (
            <div key={r} style={{ display: "grid", gridTemplateColumns: `repeat(${WORD_LENGTH}, 56px)`, gap: 8 }}>
              {letters.map((ch, i) => (
                <div
                  key={i}
                  style={{
                    width: 56,
                    height: 56,
                    background: tileColor(evals[i]),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 24,
                    borderRadius: 10,
                  }}
                >
                  {ch.trim()}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 20, display: "flex", justifyContent: "center", gap: 10 }}>
        <button onClick={submit}>ENTER</button>
        <button onClick={newGame}>NEW GAME</button>
      </div>
    </div>
  );
}
