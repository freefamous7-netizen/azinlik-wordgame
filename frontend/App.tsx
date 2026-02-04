import React, { useEffect, useMemo, useState } from "react";

// Eğer mevcut projende data import'u farklıysa sorun değil.
// Bu import hata verirse, alttaki satırı yorum satırı yap (//) ve WORDS fallback çalışır.
// @ts-ignore
import kuData from "./data/ku_kurmanci.json";

type LetterState = "correct" | "present" | "absent" | "unused";

const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;

// --- Kurmancî harf seti (şimdilik QWERTY + özel harfler) ---
const KEYBOARD_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "ê", "î", "û"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l", "ç", "ş"],
  ["ENTER", "z", "x", "c", "v", "b", "n", "m", "DELETE"],
];

// --- JSON'dan kelime havuzunu güvenli çek (format bilinmiyor, o yüzden çoklu fallback) ---
function extractWords(data: any): string[] {
  const candidates =
    data?.words ??
    data?.solutions ??
    data?.dictionary ??
    data?.validWords ??
    data?.wordList ??
    data?.data ??
    [];

  if (Array.isArray(candidates)) {
    return candidates
      .map((w) => String(w).trim())
      .filter(Boolean)
      .map((w) => w.toLowerCase())
      .filter((w) => w.length === WORD_LENGTH);
  }

  // bazı json’larda sözlük obje olarak gelebilir: { "abcde": true, ... }
  if (candidates && typeof candidates === "object") {
    return Object.keys(candidates)
      .map((w) => String(w).trim().toLowerCase())
      .filter((w) => w.length === WORD_LENGTH);
  }

  return [];
}

// En kötü ihtimalde oyun çalışsın diye mini fallback set
const FALLBACK_WORDS = [
  "heval",
  "welat",
  "berit",
  "rojên",
  "rojên".slice(0, 5), // güvenlik
  "dîyar".normalize("NFC").slice(0, 5),
].map((w) => w.toLowerCase()).filter((w) => w.length === 5);

// --- Wordle değerlendirme (harf başına correct/present/absent) ---
function scoreGuess(guess: string, answer: string): LetterState[] {
  const res: LetterState[] = Array(WORD_LENGTH).fill("absent");
  const a = answer.split("");
  const g = guess.split("");

  // 1) doğru yerde olanlar
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (g[i] === a[i]) {
      res[i] = "correct";
      a[i] = ""; // tüket
      g[i] = ""; // tüket
    }
  }

  // 2) doğru harf yanlış yer
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (!g[i]) continue;
    const idx = a.indexOf(g[i]);
    if (idx !== -1) {
      res[i] = "present";
      a[idx] = ""; // tüket
    } else {
      res[i] = "absent";
    }
  }

  return res;
}

function mergeKeyState(prev: LetterState, next: LetterState): LetterState {
  // öncelik: correct > present > absent > unused
  const rank: Record<LetterState, number> = {
    correct: 3,
    present: 2,
    absent: 1,
    unused: 0,
  };
  return rank[next] > rank[prev] ? next : prev;
}

function normalizeKey(k: string) {
  return k.toLowerCase();
}

export default function App() {
  const uiTitle =
    kuData?.ui?.title ??
    kuData?.meta?.language ??
    "Minority";
  const uiSubtitle =
    kuData?.ui?.subtitle ??
    "Daily Word";

  const wordsFromJson = useMemo(() => extractWords(kuData), []);
  const WORDS = useMemo(() => {
    const pool = wordsFromJson.length ? wordsFromJson : FALLBACK_WORDS;
    // dupe temizle
    return Array.from(new Set(pool));
  }, [wordsFromJson]);

  const [answer, setAnswer] = useState<string>(() => {
    // her refresh’te aynı kelimeyi görmek için basit “daily” seed:
    // YYYY-MM-DD => index
    const d = new Date();
    const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const seed = Array.from(dayKey).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const idx = WORDS.length ? seed % WORDS.length : 0;
    return (WORDS[idx] ?? "heval").toLowerCase();
  });

  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState<string>("");
  const [done, setDone] = useState<boolean>(false);

  // klavye renkleri
  const keyStates = useMemo(() => {
    const map: Record<string, LetterState> = {};

    for (const row of KEYBOARD_ROWS) {
      for (const k of row) {
        const nk = normalizeKey(k);
        if (nk !== "enter" && nk !== "delete") map[nk] = "unused";
      }
    }

    for (const g of guesses) {
      const states = scoreGuess(g, answer);
      for (let i = 0; i < WORD_LENGTH; i++) {
        const ch = g[i];
        const prev = map[ch] ?? "unused";
        map[ch] = mergeKeyState(prev, states[i]);
      }
    }

    return map;
  }, [guesses, answer]);

  function showMsg(key: "notEnoughLetters" | "notInDictionary" | "gameOver" | "welcome" | "correct") {
    const msg =
      kuData?.messages?.[key] ??
      kuData?.ui?.messages?.[key] ??
      (key === "notEnoughLetters"
        ? "Word must be 5 letters"
        : key === "notInDictionary"
          ? "Not in dictionary"
          : key === "correct"
            ? "You won!"
            : key === "gameOver"
              ? `Answer: ${answer.toUpperCase()}`
              : "Welcome!");
    alert(msg);
  }

  function commitGuess(guess: string) {
    if (done) return;

    if (guess.length !== WORD_LENGTH) {
      showMsg("notEnoughLetters");
      return;
    }

    // Sözlük kontrolü: WORDS içindeyse kabul. (Daha sonra allowedWords ayrı yaparız)
    if (WORDS.length && !WORDS.includes(guess)) {
      showMsg("notInDictionary");
      return;
    }

    const nextGuesses = [...guesses, guess];
    setGuesses(nextGuesses);
    setCurrent("");

    if (guess === answer) {
      setDone(true);
      showMsg("correct");
      return;
    }

    if (nextGuesses.length >= MAX_ATTEMPTS) {
      setDone(true);
      showMsg("gameOver");
    }
  }

  function onKey(k: string) {
    if (done) return;

    if (k === "ENTER") {
      commitGuess(current);
      return;
    }
    if (k === "DELETE") {
      setCurrent((s) => s.slice(0, -1));
      return;
    }

    const ch = normalizeKey(k);
    if (ch.length !== 1) return;

    setCurrent((s) => {
      if (s.length >= WORD_LENGTH) return s;
      return (s + ch).toLowerCase();
    });
  }

  // fiziksel klavye desteği
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = e.key;

      if (key === "Enter") return onKey("ENTER");
      if (key === "Backspace") return onKey("DELETE");

      const lower = key.toLowerCase();

      // Türkçe/Kurmancî özel harfler
      const allowed = new Set([
        ..."abcdefghijklmnopqrstuvwxyz".split(""),
        "ê", "î", "û", "ç", "ş",
      ]);

      if (allowed.has(lower)) {
        onKey(lower);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, done, guesses, answer]);

  // satırları render ederken: önce yapılan tahminler, sonra current, sonra boş
  const rows = useMemo(() => {
    const arr: string[] = [];
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      if (i < guesses.length) arr.push(guesses[i]);
      else if (i === guesses.length) arr.push(current);
      else arr.push("");
    }
    return arr;
  }, [guesses, current]);

  function tileStyle(state: LetterState | "empty") {
    if (state === "correct") return { background: "#2ecc71", borderColor: "#2ecc71", color: "#0b1a12" };
    if (state === "present") return { background: "#f1c40f", borderColor: "#f1c40f", color: "#1a1400" };
    if (state === "absent") return { background: "#3b3b3b", borderColor: "#3b3b3b", color: "#eaeaea" };
    if (state === "empty") return { background: "#1f2730", borderColor: "#2b3642", color: "#eaeaea" };
    return { background: "#1f2730", borderColor: "#2b3642", color: "#eaeaea" };
  }

  function keyStyle(state: LetterState) {
    if (state === "correct") return { background: "#2ecc71", color: "#0b1a12" };
    if (state === "present") return { background: "#f1c40f", color: "#1a1400" };
    if (state === "absent") return { background: "#3b3b3b", color: "#eaeaea" };
    return { background: "#2b3642", color: "#eaeaea" };
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f141a",
        color: "#eaeaea",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 24,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      }}
    >
      {/* Header: Score/Attempts KALKTI */}
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: 1 }}>
          {String(uiTitle).toUpperCase()}
        </div>
        <div style={{ opacity: 0.8, marginTop: 6 }}>
          {uiSubtitle} · Kurmancî · {WORD_LENGTH} letters
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateRows: `repeat(${MAX_ATTEMPTS}, 1fr)`, gap: 10 }}>
        {rows.map((r, rowIdx) => {
          const guess = r.toLowerCase();
          const isCommitted = rowIdx < guesses.length;
          const states = isCommitted ? scoreGuess(guess, answer) : Array(WORD_LENGTH).fill("empty");

          return (
            <div key={rowIdx} style={{ display: "grid", gridTemplateColumns: `repeat(${WORD_LENGTH}, 58px)`, gap: 10 }}>
              {Array.from({ length: WORD_LENGTH }).map((_, i) => {
                const ch = guess[i] ? guess[i].toUpperCase() : "";
                const st = (isCommitted ? states[i] : "empty") as any;

                return (
                  <div
                    key={i}
                    style={{
                      width: 58,
                      height: 58,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 10,
                      border: "2px solid",
                      fontSize: 24,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      ...tileStyle(st),
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

      {/* Keyboard */}
      <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
        {KEYBOARD_ROWS.map((row, idx) => (
          <div key={idx} style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            {row.map((k) => {
              const nk = normalizeKey(k);
              const isSpecial = k === "ENTER" || k === "DELETE";
              const st = isSpecial ? "unused" : (keyStates[nk] ?? "unused");

              return (
                <button
                  key={k}
                  onClick={() => onKey(k)}
                  style={{
                    padding: isSpecial ? "14px 16px" : "14px 14px",
                    borderRadius: 10,
                    border: "0px",
                    fontWeight: 800,
                    cursor: "pointer",
                    minWidth: isSpecial ? 92 : 44,
                    ...keyStyle(st as LetterState),
                  }}
                >
                  {k}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Mini footer */}
      <div style={{ marginTop: 18, opacity: 0.7, fontSize: 12 }}>
        {done ? "Game finished." : "Tip: Enter = submit, Backspace = delete."}
      </div>
    </div>
  );
}
