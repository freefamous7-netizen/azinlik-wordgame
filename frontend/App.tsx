import React, { useMemo, useState } from "react";

type LetterStatus = "correct" | "present" | "absent" | "empty";

const WORDS = [
  "HEVAL",
  "WELAT",
  "ROJIN",
  "AZADÎ",
  "KURDÎ",
  "ROJÊK",
  "GUNDÎ",
  "ÊRÎŞ",
  "JINAN",
  "DÎLAN",
];

// Kurmancî klavye (5 harf hedefli oyunda da işe yarar)
const KEY_ROWS = [
  ["Q","W","E","R","T","Y","U","I","O","P","Ê","Î","Û"],
  ["A","S","D","F","G","H","J","K","L","Ç","Ş"],
  ["ENTER","Z","X","C","V","B","N","M","DELETE"],
];

function pickRandomWord() {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

function evaluateGuess(guess: string, solution: string): LetterStatus[] {
  // Wordle benzeri: önce correct, sonra present
  const res: LetterStatus[] = Array(5).fill("absent");
  const sol = solution.split("");
  const g = guess.split("");

  // correct
  for (let i = 0; i < 5; i++) {
    if (g[i] === sol[i]) {
      res[i] = "correct";
      sol[i] = "#"; // tüket
      g[i] = "*";
    }
  }

  // present
  for (let i = 0; i < 5; i++) {
    if (g[i] === "*") continue;
    const idx = sol.indexOf(g[i]);
    if (idx !== -1) {
      res[i] = "present";
      sol[idx] = "#";
    } else {
      res[i] = "absent";
    }
  }
  return res;
}

function statusColor(s: LetterStatus) {
  if (s === "correct") return "#16a34a"; // yeşil
  if (s === "present") return "#eab308"; // sarı
  if (s === "absent") return "#334155"; // koyu
  return "#1f2937"; // boş
}

export default function App() {
  const [solution, setSolution] = useState(() => pickRandomWord());
  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [gameOver, setGameOver] = useState(false);

  const maxAttempts = 6;

  const rows = useMemo(() => {
    const filled = [...guesses];
    while (filled.length < maxAttempts) filled.push("");
    return filled.map((w, idx) => {
      if (idx === guesses.length && !gameOver) return current;
      return w;
    });
  }, [guesses, current, gameOver]);

  const evaluations = useMemo(() => {
    return rows.map((w, idx) => {
      if (idx < guesses.length && w.length === 5) return evaluateGuess(w, solution);
      return Array(5).fill("empty") as LetterStatus[];
    });
  }, [rows, guesses.length, solution]);

  const keyStatus = useMemo(() => {
    // klavye harf renkleri: correct > present > absent
    const map = new Map<string, LetterStatus>();
    for (let i = 0; i < guesses.length; i++) {
      const g = guesses[i];
      const ev = evaluateGuess(g, solution);
      for (let j = 0; j < 5; j++) {
        const ch = g[j];
        const st = ev[j];
        const prev = map.get(ch);
        if (prev === "correct") continue;
        if (prev === "present" && st === "absent") continue;
        if (prev === "absent" && (st === "present" || st === "correct")) map.set(ch, st);
        else if (!prev) map.set(ch, st);
        else map.set(ch, st);
      }
    }
    return map;
  }, [guesses, solution]);

  function hardAlert(msg: string) {
    // senin ekranda gördüğün popup bu
    alert(msg);
  }

  function submit() {
    if (gameOver) return;

    if (current.length !== 5) {
      hardAlert("Word must be 5 letters");
      return;
    }

    const up = current.toUpperCase();
    if (!WORDS.includes(up)) {
      hardAlert("Ev peyv ne di nav de ye");
      return;
    }

    const nextGuesses = [...guesses, up];
    setGuesses(nextGuesses);
    setCurrent("");

    if (up === solution) {
      setGameOver(true);
      hardAlert("🎉 Congratulations! You won! Score: 150");
      return;
    }

    if (nextGuesses.length >= maxAttempts) {
      setGameOver(true);
      hardAlert("❌ Game over! Word was: " + solution);
      return;
    }
  }

  function pressKey(k: string) {
    if (gameOver) return;

    if (k === "ENTER") return submit();
    if (k === "DELETE") {
      setCurrent((c) => c.slice(0, -1));
      return;
    }
    if (k.length === 1) {
      setCurrent((c) => (c.length < 5 ? (c + k).toUpperCase() : c));
    }
  }

  // fiziksel klavye desteği (PC’de rahat)
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (gameOver) return;

      if (e.key === "Enter") {
        e.preventDefault();
        submit();
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        setCurrent((c) => c.slice(0, -1));
        return;
      }

      const k = e.key.toUpperCase();

      // Türkçe/Kürtçe özel karakterleri de kabul et
      const allowed = "ABCDEFGHIJKLMNOPQRSTUVWXYZÇŞÊÎÛ";
      if (k.length === 1 && allowed.includes(k)) {
        e.preventDefault();
        setCurrent((c) => (c.length < 5 ? (c + k).toUpperCase() : c));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [gameOver]); // eslint-disable-line

  function newGame() {
    setSolution(pickRandomWord());
    setGuesses([]);
    setCurrent("");
    setGameOver(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0b1020", color: "white", fontFamily: "system-ui, Arial" }}>
      <div style={{ maxWidth: 520, margin: "0 auto", padding: 24, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 28, letterSpacing: 0.5 }}>Minority</h1>
          <div style={{ color: "#eab308", fontWeight: 700 }}>
            Attempts: {guesses.length}/{maxAttempts}
          </div>
        </div>

        {/* GRID */}
        <div style={{ marginTop: 18, display: "grid", gap: 8, justifyContent: "center" }}>
          {rows.map((w, r) => {
            const letters = (w || "").padEnd(5, " ").slice(0, 5).split("");
            return (
              <div key={r} style={{ display: "grid", gridTemplateColumns: "repeat(5, 56px)", gap: 8, justifyContent: "center" }}>
                {letters.map((ch, c) => {
                  const st = evaluations[r][c];
                  const isActiveRow = r === guesses.length && !gameOver;
                  // aktif satırda harf varsa boş değil gibi görün
                  const tileStatus: LetterStatus = st !== "empty" ? st : (isActiveRow && ch.trim() ? "absent" : "empty");
                  return (
                    <div
                      key={c}
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 24,
                        fontWeight: 800,
                        background: statusColor(tileStatus),
                        border: "1px solid rgba(255,255,255,0.08)",
                        userSelect: "none",
                      }}
                    >
                      {ch.trim()}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* KLAVYE */}
        <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
          {KEY_ROWS.map((row, i) => (
            <div key={i} style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              {row.map((k) => {
                const st = keyStatus.get(k) || "empty";
                const bg =
                  k === "ENTER" || k === "DELETE"
                    ? "#1f2937"
                    : st === "correct"
                      ? "#16a34a"
                      : st === "present"
                        ? "#eab308"
                        : st === "absent"
                          ? "#334155"
                          : "#111827";

                const w = k === "ENTER" || k === "DELETE" ? 92 : 40;

                return (
                  <button
                    key={k}
                    onClick={() => pressKey(k)}
                    style={{
                      width: w,
                      height: 44,
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: bg,
                      color: "white",
                      fontWeight: 800,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    {k}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, display: "flex", justifyContent: "center", gap: 10 }}>
          <button
            onClick={submit}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "#0f766e",
              color: "white",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            ENTER
          </button>

          <button
            onClick={newGame}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "#111827",
              color: "white",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            New Game
          </button>
        </div>

        <div style={{ marginTop: 10, color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
          Kurmancî 5-harf sözlük ile demo. Sonra JSON’dan (data/ku_kurmanci.json) okuyacağız.
        </div>
      </div>
    </div>
  );
}
