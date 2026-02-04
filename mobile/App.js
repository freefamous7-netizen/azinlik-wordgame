import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Backend URL - update this with your actual backend URL
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';
const API = `${BACKEND_URL}/api`;

export default function App() {
  const [gameId, setGameId] = useState(null);
  const [currentGuess, setCurrentGuess] = useState('');
  const [guesses, setGuesses] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [gameState, setGameState] = useState('menu'); // menu, playing, won, lost
  const [score, setScore] = useState(0);
  const [wordLength, setWordLength] = useState(5);
  const [language, setLanguage] = useState('en');
  const [playerId, setPlayerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    initializePlayer();
    loadStats();
  }, []);

  const initializePlayer = async () => {
    let id = await AsyncStorage.getItem('playerId');
    if (!id) {
      id = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem('playerId', id);
    }
    setPlayerId(id);
  };

  const loadStats = async () => {
    const id = await AsyncStorage.getItem('playerId');
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
    } catch (error) {
      Alert.alert('Error', 'Failed to start game. Make sure words are added to the database.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const submitGuess = async () => {
    if (currentGuess.length !== wordLength) {
      Alert.alert('Invalid Guess', `Word must be ${wordLength} letters`);
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
          Alert.alert('🎉 Congratulations!', `You won! Score: ${response.data.score}`);
          loadStats();
        }, 500);
      } else if (response.data.game_state === 'lost') {
        setTimeout(() => {
          Alert.alert('😔 Game Over', 'Better luck next time!');
          loadStats();
        }, 500);
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to submit guess');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (key) => {
    if (key === 'ENTER') {
      submitGuess();
    } else if (key === 'DELETE') {
      setCurrentGuess(currentGuess.slice(0, -1));
    } else if (currentGuess.length < wordLength) {
      setCurrentGuess(currentGuess + key);
    }
  };

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
          <View key={j} style={[styles.tile, { backgroundColor }]}>
            <Text style={styles.tileText}>{letter.toUpperCase()}</Text>
          </View>
        );
      }
      
      rows.push(
        <View key={i} style={styles.row}>
          {tiles}
        </View>
      );
    }
    return rows;
  };

  const renderKeyboard = () => {
    // Kurdish keyboard layout with special characters
    const kurdishRows = [
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
      ['Ê', 'Î', 'Û', 'Ç', 'Ş', 'Z', 'X', 'C', 'V', 'B'],
      ['ENTER', 'N', 'M', 'DELETE'],
    ];
    
    // Standard keyboard for other languages
    const standardRows = [
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
      ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DELETE'],
    ];

    const rows = language === 'ku' ? kurdishRows : standardRows;

    return rows.map((row, rowIndex) => (
      <View key={rowIndex} style={styles.keyboardRow}>
        {row.map((key) => {
          const isSpecialChar = ['Ç', 'Ş', 'Ê', 'Î', 'Û'].includes(key);
          const isWideKey = key === 'ENTER' || key === 'DELETE';
          
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.key,
                isWideKey && styles.wideKey,
                isSpecialChar && styles.specialKey,
              ]}
              onPress={() => handleKeyPress(key)}
              disabled={loading || gameState !== 'playing'}
            >
              <Text style={[styles.keyText, isSpecialChar && styles.specialKeyText]}>
                {key}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    ));
  };

  const renderMenu = () => (
    <View style={styles.menuContainer}>
      <Text style={styles.title}>🔤 Word Guessing Game</Text>
      <Text style={styles.subtitle}>Wordle-style Challenge</Text>
      
      {stats && (
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>Your Stats</Text>
          <Text style={styles.statsText}>Games Played: {stats.total_games}</Text>
          <Text style={styles.statsText}>Games Won: {stats.won_games}</Text>
          <Text style={styles.statsText}>Win Rate: {stats.win_rate.toFixed(1)}%</Text>
          <Text style={styles.statsText}>Total Score: {stats.total_score}</Text>
        </View>
      )}

      <View style={styles.languageContainer}>
        <Text style={styles.languageLabel}>Language:</Text>
        <View style={styles.languageButtons}>
          <TouchableOpacity
            style={[styles.languageButton, language === 'en' && styles.languageButtonActive]}
            onPress={() => setLanguage('en')}
          >
            <Text style={styles.languageButtonText}>🇬🇧 EN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.languageButton, language === 'es' && styles.languageButtonActive]}
            onPress={() => setLanguage('es')}
          >
            <Text style={styles.languageButtonText}>🇪🇸 ES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.languageButton, language === 'fr' && styles.languageButtonActive]}
            onPress={() => setLanguage('fr')}
          >
            <Text style={styles.languageButtonText}>🇫🇷 FR</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.languageButton, language === 'ku' && styles.languageButtonActive]}
            onPress={() => setLanguage('ku')}
          >
            <Text style={styles.languageButtonText}>☀️ KU</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => startNewGame(true)}
        disabled={loading}
      >
        <Text style={styles.menuButtonText}>
          {loading ? 'Loading...' : '🌟 Daily Challenge'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.menuButton, styles.secondaryButton]}
        onPress={() => startNewGame(false)}
        disabled={loading}
      >
        <Text style={styles.menuButtonText}>
          {loading ? 'Loading...' : '🎮 Random Game'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.instructions}>
        Guess the word in 6 tries.{'\n'}
        Green = Correct letter & position{'\n'}
        Yellow = Correct letter, wrong position{'\n'}
        Gray = Letter not in word
      </Text>
    </View>
  );

  const renderGame = () => (
    <View style={styles.gameContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Word Game</Text>
        <Text style={styles.headerScore}>Score: {score}</Text>
      </View>
      
      <View style={styles.board}>
        {renderGameBoard()}
      </View>

      {gameState !== 'playing' && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setGameState('menu')}
        >
          <Text style={styles.backButtonText}>Back to Menu</Text>
        </TouchableOpacity>
      )}

      {gameState === 'playing' && (
        <View style={styles.keyboard}>
          {renderKeyboard()}
        </View>
      )}
    </View>
  );

  if (loading && gameState === 'menu') {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#538d4e" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {gameState === 'menu' ? renderMenu() : renderGame()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121213',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  menuContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#b59f3b',
    marginBottom: 30,
  },
  statsContainer: {
    backgroundColor: '#1e1e1e',
    padding: 20,
    borderRadius: 10,
    marginBottom: 30,
    width: '100%',
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
    textAlign: 'center',
  },
  statsText: {
    fontSize: 16,
    color: '#d7dadc',
    marginBottom: 5,
  },
  languageContainer: {
    marginBottom: 20,
    width: '100%',
  },
  languageLabel: {
    fontSize: 16,
    color: '#d7dadc',
    marginBottom: 10,
    textAlign: 'center',
  },
  languageButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  languageButton: {
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  languageButtonActive: {
    backgroundColor: '#538d4e',
  },
  languageButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  menuButton: {
    backgroundColor: '#538d4e',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 15,
    width: '100%',
  },
  secondaryButton: {
    backgroundColor: '#b59f3b',
  },
  menuButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  instructions: {
    fontSize: 14,
    color: '#818384',
    textAlign: 'center',
    marginTop: 30,
    lineHeight: 22,
  },
  gameContainer: {
    flex: 1,
    padding: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerScore: {
    fontSize: 18,
    color: '#b59f3b',
    fontWeight: 'bold',
  },
  board: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  tile: {
    width: 50,
    height: 50,
    borderWidth: 2,
    borderColor: '#3a3a3c',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    borderRadius: 5,
  },
  tileText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  keyboard: {
    marginTop: 'auto',
    paddingBottom: 10,
  },
  keyboardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 5,
  },
  key: {
    backgroundColor: '#818384',
    paddingHorizontal: 8,
    paddingVertical: 15,
    marginHorizontal: 2,
    borderRadius: 5,
    minWidth: 30,
    alignItems: 'center',
  },
  wideKey: {
    paddingHorizontal: 12,
  },
  keyText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#818384',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 10,
    alignSelf: 'center',
    marginTop: 20,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
