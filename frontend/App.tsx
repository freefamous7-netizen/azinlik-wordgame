import React, { useState } from "react";

const WORDS = [
  "HEVAL",
  "WELAT",
  "ROJIN",
  "AZADÎ",
  "KURDÎ",
];

const getRandomWord = () =>
  WORDS[Math.floor(Math.random() * WORDS.length)];

export default function App() {
  const [solution] = useState(getRandomWord());
  const [guess, setGuess] = useState("");
  const [message, setMessage] = useState("");
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 6;

  const submitGuess = () => {
    if (guess.length !== 5) {
      alert("Word must be 5 letters");
      return;
    }

    if (!WORDS.includes(guess.toUpperCase())) {
      alert("Ev peyv ne di nav de ye");
      return;
    }

    setAttempts(a => a + 1);

    if (guess.toUpperCase() === solution) {
      alert("🎉 Congratulations! You won!");
      return;
    }

    if (attempts + 1 >= maxAttempts) {
      alert("❌ Game over! Word was: " + solution);
      return;
    }

    setGuess("");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "sans-serif",
      }}
    >
      <h1>Minority</h1>
      <p>Attempts: {attempts}/{maxAttempts}</p>

      <input
        value={guess}
        onChange={(e) => setGuess(e.target.value.toUpperCase())}
        maxLength={5}
        style={{
          padding: "10px",
          fontSize: "20px",
          textAlign: "center",
          textTransform: "uppercase",
        }}
      />

      <button
        onClick={submitGuess}
        style={{
          marginTop: "10px",
          padding: "10px 20px",
          fontSize: "16px",
          cursor: "pointer",
        }}
      >
        Enter
      </button>

      <p style={{ marginTop: "10px" }}>{message}</p>
    </div>
  );
}
