import React, { useEffect, useMemo, useState } from "react";

// JSON'u buradan çekiyoruz (senin repoda bu yol var)
import kuData from "./data/ku_kurmanci.json";

type LetterState = "correct" | "present" | "absent" | "unused";

const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;

// 1) JSON'dan kelime listesini güvenli çek
function extractWords(data: any): string[] {
  const candidates =
    data?.words ??
    data?.solutions ??
    data?.dictionary ??
    data?.validWords ??
    data?.validwords ??
    data?.wordlist ??
    [];

  if (Array.isArray(candidates)) {
    return candidates
      .map((w) => String(w).trim().toLowerCase())
      .filter((w) => w.length === WORD_LENGTH);
  }

  // bazı JSON'larda { "WORDS": [...] } gibi olabiliyor
  if (typeof candidates === "object" && candidates) {
    const maybe = Object.values(candidates).flat();
    if (Array.isArray(maybe)) {
      return maybe
        .map((w) => String(w).trim().toLowerCase())
        .filter((w) => w.length === WORD_LENGTH);
    }
  }

  return [];
}

// 2) Günlük index (her gün herkes aynı kelime)
function dailyIndex(listLength: number): number {
  if (listLength <= 0) return 0;

  // Sabit bir başlangıç tarihi (UTC) seçiyoruz: 2024-01-01
  const startUTC = Date.UTC(2024, 0, 1);
  const now = Date.now();
  const daysSince = Math.floor((now - startUTC) / 86400000);

  // negatif olma ihtimaline karşı:
  const safe = ((daysSince % listLength) + listLength) % listLength;
  return safe;
}

// 3) Harf puanlama (wordle benzeri)
function scoreGuess(guess: string, solution: string): LetterState[] {
  const result: LetterState[] = Array(WORD_LENGTH).fill("absent");
  const solArr = solution.split("");
  const guessArr = guess.split("");

  // önce doğru yerleri işaretle
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessArr[i] === solArr[i]) {
      result[i] = "correct";
      solArr[i] = "_"; // kullanıldı
      guessArr[i] = "#"; // işaret
    }
  }

  // sonra "present" olanları bul
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessArr[i] === "#" || result[i] === "correct") continue;
    const idx = solArr.indexOf(guessArr[i]);
    if (idx !== -1) {
      result[i] = "present";
      solArr[idx] = "_";
    }
  }

  return result;
}

function formatLangTitle(data: any) {
  const name = data?.meta?.language ?? "Minority";
  const code = data?.meta?.code ?? "";
  return code ? `${name} (${code})` : name;
}

export default function App() {
  const words = useMemo(() => extractWords(kuData), []);
  const solution = useMemo(() => {
    if (!words.length) return "heval"; // fallback
    return words[dailyIndex(words.length)];
  }, [words]);

  // UI text (JSON içinden varsa onu kullan)
  const ui = kuData?.ui ?? {};
  const messages = kuData?.messages ?? {};

  const TITLE = ui?.title ?? "MINORITY";
  const SUBTITLE = ui?.subtitle ?? "Guess the word. Save the language.";
  const NOT_IN_DICT = messages?.notInDictionary ?? "Word not in dictionary";
  const NOT_ENOUGH = messages?.notEnoughLetters ?? `Word must be ${WORD_LENGTH} letters`;
  const TRY_AGAIN = messages?.tryAgain ?? "Try again";
  const WIN_MSG = messages?.win ?? "🎉 Congratulations! You won!";
  const LOSE_MSG = messages?.lose ?? `Game over!`;
  const LANG_LABEL = formatLangTitle(kuData);

  const [guesses, setGuesses] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<LetterState[][]>([]);
  const [current, setCurrent] = useState("");
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);

  // klavye harf seti: JSON meta.letters varsa onu kullan
  const LETTERS: string[] = useMemo(() => {
    const fromJson = kuData?.meta?.letters;
    if (Array.isArray(fromJson) && fromJson.length) {
      return fromJson.map((x: any) => String(x));
    }
    // fallback: Kurmancî için pratik set
    return [
      "q","w","e","r","t","y","u","i","o","p","ê","î","û",
      "a","s","d","f","g","h","j","k","l","ç","ş",
      "z","x","c","v","b","n","m"
    ];
  }, []);

  const KEYBOARD_ROWS = useMemo(() => {
    // istersen bu dizilimi değiştirirsin
    const row1 = ["q","w","e","r","t","y","u","i","o","p","ê","î","û"];
    const row2 = ["a","s","d","f","g","h","j","k","l","ç","ş"];
    const row3 = ["ENTER","z","x","c","v","b","n","m","DELETE"];
    return [row1, row2, row3];
  }, []);

  // klavye durumları (en güçlü renk geçerli olsun)
  const keyStates = useMemo(() => {
    const map = new Map<string, LetterState>();
    const priority: Record<LetterState, number> = {
      unused: 0,
      absent: 1,
      present: 2,
      correct: 3,
    };

    for (let r = 0; r < guesses.length; r++) {
      const g = guesses[r];
      const st = statuses[r];
      for (let i = 0; i < g.length; i++) {
        const ch = g[i];
        const s = st?.[i] ?? "unused";
        const prev = map.get(ch) ?? "unused";
        if (priority[s] > priority[prev]) map.set(ch, s);
      }
    }
    return map;
  }, [guesses, statuses]);

  function alertMsg(msg: string) {
    // senin ekranda görünen pop-up burada geliyor
    window.alert(msg);
  }

  function onAddChar(ch: string) {
    if (locked) return;
    if (current.length >= WORD_LENGTH) return;
    setCurrent((p) => (p + ch).toLowerCase());
  }

  function onDelete() {
    if (locked) return;
    setCurrent((p) => p.slice(0, -1));
  }

  function onEnter() {
    if (locked) return;

    const guess = current.trim().toLowerCase();

    if (guess.length !== WORD_LENGTH) {
      alertMsg(NOT_ENOUGH);
      return;
    }

    // sözlük kontrolü
    if (words.length && !words.includes(guess)) {
      alertMsg(NOT_IN_DICT);
      return;
    }

    const st = scoreGuess(guess, solution);

    setGuesses((prev) => [...prev, guess]);
    setStatuses((prev) => [...prev, st]);
    setAttempts((a) => a + 1);
    setCurrent("");

    const isWin = guess === solution;
    const isLast = attempts + 1 >= MAX_ATTEMPTS;

    if (isWin) {
      // basit skor: kalan denemeye göre
      const gained = 100 + (MAX_ATTEMPTS - (attempts + 1)) * 10;
      setScore((s) => s + gained);
      setLocked(true);
      setTimeout(() => alertMsg(`${WIN_MSG} Score: ${gained}`), 80);
      return;
    }

    if (isLast) {
      setLocked(true);
      setTimeout(() => alertMsg(`${LOSE_MSG} (${solution.toUpperCase()})`), 80);
      return;
    }

    // devam mesajı istemiyorsan kapat
    // alertMsg(TRY_AGAIN);
  }

  // fiziksel klavye desteği
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (locked) return;

      const key = e.key;

      if (key === "Enter") {
        e.preventDefault();
        onEnter();
        return;
      }

      if (key === "Backspace") {
        e.preventDefault();
        onDelete();
        return;
      }

      // Türkçe/Kurmancî karakterleri de kabul
      const lower = key.toLowerCase();

      // tek harf ise ve allowed ise ekle
      if (lower.length === 1) {
        const allowed = new Set(LETTERS);
        if (allowed.has(lower)) {
          onAddChar(lower);
        }
      }
    }

    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [locked, current, LETTERS, attempts, solution]);

  function cellColor(state: LetterState): string {
    // Wordle tarzı ama basit
    if (state === "correct") return "#2e7d32"; // green
    if (state === "present") return "#c9a227"; // yellow
    if (state === "absent") return "#424242";  // gray
    return "#2b2f3a"; // unused
  }

  function keyBg(state: LetterState): string {
    if (state === "correct") return "#2e7d32";
    if (state === "present") return "#c9a227";
    if (state === "absent") return "#424242";
    return "#2b2f3a";
  }

  // grid satırları: geçmiş tahminler + current + boşlar
  const rows = useMemo(() => {
    const all: { word: string; states: LetterState[] }[] = [];

    for (let i = 0; i < guesses.length; i++) {
      all.push({ word: guesses[i], states: statuses[i] ?? Array(WORD_LENGTH).fill("unused") });
    }

    if (all.length < MAX_ATTEMPTS) {
      const padded = (current + " ".repeat(WORD_LENGTH)).slice(0, WORD_LENGTH);
      all.push({ word: padded, states: Array(WORD_LENGTH).fill("unused") });
    }

    while (all.length < MAX_ATTEMPTS) {
      all.push({ word: " ".repeat(WORD_LENGTH), states: Array(WORD_LENGTH).fill("unused") });
    }

    return all;
  }, [guesses, statuses, current]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #10131a 0%, #0b0d12 100%)",
        color: "#e8ecf1",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div style={{ width: "min(520px, 96vw)" }}>
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: 0.5 }}>{TITLE}</div>
          <div style={{ opacity: 0.85, marginTop: 4 }}>{SUBTITLE}</div>
          <div style={{ opacity: 0.7, marginTop: 6, fontSize: 13 }}>
            Language: <b>{LANG_LABEL}</b> • Daily word
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", margin: "12px 0 10px" }}>
          <div style={{ opacity: 0.9 }}>Score: <b>{score}</b></div>
          <div style={{ opacity: 0.9 }}>
            Attempts: <b>{attempts}/{MAX_ATTEMPTS}</b>
          </div>
        </div>

        {/* GRID */}
        <div style={{ display: "grid", gap: 8, justifyContent: "center", marginTop: 8 }}>
          {rows.map((row, rIdx) => (
            <div key={rIdx} style={{ display: "grid", gridTemplateColumns: `repeat(${WORD_LENGTH}, 58px)`, gap: 8 }}>
              {row.word.split("").slice(0, WORD_LENGTH).map((ch, cIdx) => {
                const st = row.states[cIdx] ?? "unused";
                // geçmiş tahminlerin rengi
                const bg =
                  rIdx < guesses.length ? cellColor(st) : "#1b1f2a";
                return (
                  <div
                    key={cIdx}
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: 10,
                      background: bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {ch.trim() ? ch : ""}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* KEYBOARD */}
        <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
          {KEYBOARD_ROWS.map((row, i) => (
            <div key={i} style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              {row.map((key) => {
                const isEnter = key === "ENTER";
                const isDel = key === "DELETE";
                const lower = key.toLowerCase();

                const st = keyStates.get(lower) ?? "unused";
                const bg = isEnter || isDel ? "#243045" : keyBg(st);

                return (
                  <button
                    key={key}
                    onClick={() => {
                      if (isEnter) return onEnter();
                      if (isDel) return onDelete();
                      onAddChar(lower);
                    }}
                    style={{
                      background: bg,
                      color: "#e8ecf1",
                      border: "1px solid rgba(255,255,255,0.10)",
                      borderRadius: 10,
                      padding: isEnter || isDel ? "12px 14px" : "12px 12px",
                      minWidth: isEnter || isDel ? 92 : 44,
                      fontWeight: 800,
                      cursor: "pointer",
                      userSelect: "none",
                      textTransform: isEnter || isDel ? "none" : "uppercase",
                      opacity: locked ? 0.7 : 1,
                    }}
                    disabled={locked}
                    aria-label={key}
                  >
                    {isEnter ? "ENTER" : isDel ? "DELETE" : key.toUpperCase()}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 16, opacity: 0.65, fontSize: 12 }}>
          Daily word changes every day (UTC). Same word for everyone.
        </div>
      </div>
    </div>
  );
}
