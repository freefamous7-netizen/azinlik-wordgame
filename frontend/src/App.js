import React, { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WordGame = () => {
  const [gameId, setGameId] = useState(null);
  const [currentGuess, setCurrentGuess] = useState('');
  const [guesses, setGuesses] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [gameState, setGameState] = useState('menu');
  const [score, setScore] = useState(0);
  const [wordLength, setWordLength] = useState(5);
  const [language, setLanguage] = useState('en');
  const [playerId, setPlayerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [backendError, setBackendError] = useState(false);

  useEffect(() => {
    initializePlayer();
    loadStats();
    checkBackend();
  }, []);

  const checkBackend = async () => {
    try {
      await axios.get(`${API}/`);
      setBackendError(false);
    } catch (error) {
      console.error('Backend not accessible:', error);
      setBackendError(true);
    }
  };

  const initializePlayer = () => {
    let id = localStorage.getItem('playerId');
    if (!id) {
      id = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('playerId', id);
    }
    setPlayerId(id);
  };

  const loadStats = async () => {
    const id = localStorage.getItem('playerId');
    if (id) {
      try {
        const response = await axios.get(`${API}/scores/${id}`);
        setStats(response.data);
      } catch (error) {
        console.log('Error loading stats:', error);
      }
    }
  };

  const startNewGame = async (isDailyChallenge = false) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/games`, {
        player_id: playerId,
        language: language,
        is_daily_challenge: isDailyChallenge,
      });
      
      setGameId(response.data.id);
      setGuesses([]);
      setFeedback([]);
      setCurrentGuess('');
      setGameState('playing');
      setScore(0);
      setWordLength(response.data.target_word.length);
      setBackendError(false);
    } catch (error) {
      alert('Failed to start game. Make sure the backend is running and words are in the database.');
      console.error(error);
      setBackendError(true);
    } finally {
      setLoading(false);
    }
  };

  const submitGuess = async () => {
    if (currentGuess.length !== wordLength) {
      alert(`Word must be ${wordLength} letters`);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/games/${gameId}/guess`, {
        guess: currentGuess,
      });

      setGuesses([...guesses, currentGuess]);
      setFeedback([...feedback, response.data.feedback]);
      setScore(response.data.score);
      setGameState(response.data.game_state);
      setCurrentGuess('');

      if (response.data.game_state === 'won') {
        setTimeout(() => {
          alert(`🎉 Congratulations! You won! Score: ${response.data.score}`);
          loadStats();
        }, 500);
      } else if (response.data.game_state === 'lost') {
        setTimeout(() => {
          alert('😔 Game Over! Better luck next time!');
          loadStats();
        }, 500);
      }
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to submit guess');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (key) => {
    if (gameState !== 'playing') return;
    
    if (key === 'ENTER') {
      submitGuess();
    } else if (key === 'DELETE') {
      setCurrentGuess(currentGuess.slice(0, -1));
    } else if (currentGuess.length < wordLength) {
      setCurrentGuess(currentGuess + key);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameState !== 'playing') return;
      
      if (e.key === 'Enter') {
        submitGuess();
      } else if (e.key === 'Backspace') {
        setCurrentGuess(currentGuess.slice(0, -1));
      } else if (e.key.length === 1 && e.key.match(/[a-z]/i)) {
        if (currentGuess.length < wordLength) {
          setCurrentGuess(currentGuess + e.key.toUpperCase());
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, currentGuess, wordLength]);

  const getTileColor = (guess, index) => {
    const guessIndex = guesses.indexOf(guess);
    if (guessIndex === -1) return '#3a3a3c';
    
    const feedbackType = feedback[guessIndex][index];
    switch (feedbackType) {
      case 'correct':
        return '#538d4e';
      case 'present':
        return '#b59f3b';
      case 'absent':
        return '#3a3a3c';
      default:
        return '#3a3a3c';
    }
  };

  const renderGameBoard = () => {
    const rows = [];
    for (let i = 0; i < 6; i++) {
      const guess = i < guesses.length ? guesses[i] : (i === guesses.length ? currentGuess : '');
      const tiles = [];
      
      for (let j = 0; j < wordLength; j++) {
        const letter = guess[j] || '';
        const backgroundColor = i < guesses.length ? getTileColor(guesses[i], j) : '#3a3a3c';
        
        tiles.push(
          <div 
            key={j} 
            className="tile"
            style={{ backgroundColor }}
            data-testid={`tile-${i}-${j}`}
          >
            {letter.toUpperCase()}
          </div>
        );
      }
      
      rows.push(
        <div key={i} className="row">
          {tiles}
        </div>
      );
    }
    return rows;
  };

  const renderKeyboard = () => {
    const rows = [
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
      ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DELETE'],
    ];

    return rows.map((row, rowIndex) => (
      <div key={rowIndex} className="keyboard-row">
        {row.map((key) => (
          <button
            key={key}
            className={`key ${(key === 'ENTER' || key === 'DELETE') ? 'wide-key' : ''}`}
            onClick={() => handleKeyPress(key)}
            disabled={loading || gameState !== 'playing'}
            data-testid={`key-${key.toLowerCase()}`}
          >
            {key}
          </button>
        ))}
      </div>
    ));
  };

  if (backendError) {
    return (
      <div className="app-container">
        <div className="error-container">
          <h1>⚠️ Backend Connection Error</h1>
          <p>Unable to connect to the backend server.</p>
          <p>Backend URL: {BACKEND_URL}</p>
          <button className="menu-button" onClick={checkBackend}>
            🔄 Retry Connection
          </button>
          <div className="info-box">
            <h3>📱 Try the Mobile App Instead!</h3>
            <p>The mobile version is available via Expo Go:</p>
            <ol>
              <li>Install Expo Go on your phone</li>
              <li>Visit http://localhost:8081 to get the QR code</li>
              <li>Scan and play on mobile!</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'menu') {
    return (
      <div className="app-container">
        <div className="menu-container">
          <h1 className="title">🔤 Word Guessing Game</h1>
          <p className="subtitle">Wordle-style Challenge</p>
          
          {stats && (
            <div className="stats-container">
              <h3>Your Stats</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-value">{stats.total_games}</div>
                  <div className="stat-label">Games Played</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{stats.won_games}</div>
                  <div className="stat-label">Games Won</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{stats.win_rate.toFixed(1)}%</div>
                  <div className="stat-label">Win Rate</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{stats.total_score}</div>
                  <div className="stat-label">Total Score</div>
                </div>
              </div>
            </div>
          )}

          <div className="language-container">
            <label className="language-label">Select Language:</label>
            <div className="language-buttons">
              <button
                className={`language-button ${language === 'en' ? 'active' : ''}`}
                onClick={() => setLanguage('en')}
                data-testid="language-en"
              >
                🇬🇧 EN
              </button>
              <button
                className={`language-button ${language === 'es' ? 'active' : ''}`}
                onClick={() => setLanguage('es')}
                data-testid="language-es"
              >
                🇪🇸 ES
              </button>
              <button
                className={`language-button ${language === 'fr' ? 'active' : ''}`}
                onClick={() => setLanguage('fr')}
                data-testid="language-fr"
              >
                🇫🇷 FR
              </button>
              <button
                className={`language-button ${language === 'de' ? 'active' : ''}`}
                onClick={() => setLanguage('de')}
                data-testid="language-de"
              >
                🇩🇪 DE
              </button>
            </div>
          </div>

          <button
            className="menu-button primary"
            onClick={() => startNewGame(true)}
            disabled={loading}
            data-testid="daily-challenge-button"
          >
            {loading ? 'Loading...' : '🌟 Daily Challenge'}
          </button>

          <button
            className="menu-button secondary"
            onClick={() => startNewGame(false)}
            disabled={loading}
            data-testid="random-game-button"
          >
            {loading ? 'Loading...' : '🎮 Random Game'}
          </button>

          <div className="instructions">
            <p><strong>How to Play:</strong></p>
            <p>Guess the word in 6 tries.</p>
            <p>🟩 Green = Correct letter & position</p>
            <p>🟨 Yellow = Correct letter, wrong position</p>
            <p>⬜ Gray = Letter not in word</p>
          </div>

          <div className="mobile-link">
            <p>📱 Want to play on mobile?</p>
            <p>Visit <strong>localhost:8081</strong> for Expo Go QR code</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="game-container">
        <div className="header">
          <h2 className="header-title">Word Game</h2>
          <div className="header-info">
            <span className="header-score">Score: {score}</span>
            <span className="header-attempts">Attempts: {guesses.length}/6</span>
          </div>
        </div>
        
        <div className="board">
          {renderGameBoard()}
        </div>

        {gameState !== 'playing' && (
          <button
            className="back-button"
            onClick={() => setGameState('menu')}
            data-testid="back-to-menu-button"
          >
            ← Back to Menu
          </button>
        )}

        {gameState === 'playing' && (
          <div className="keyboard">
            {renderKeyboard()}
          </div>
        )}
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<WordGame />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
