# 🔤 Word Guessing Game - Mobile App

A mobile-first Wordle-style word guessing game built with React Native & Expo.

## 📱 Features

- **Wordle-Style Gameplay**: 6 attempts to guess the word with color-coded feedback
- **Multi-Language Support**: English, Spanish, French, German, Italian, Portuguese, Swahili, Irish Gaelic
- **Daily Challenge**: New word every day for each language
- **Score Tracking**: Track your wins, games played, and win rate
- **Timer-Based**: Future updates will add time tracking
- **Offline Support**: Uses AsyncStorage for player data persistence

## 🎮 Game Mechanics

### Color Feedback:
- **🟩 Green**: Correct letter in correct position
- **🟨 Yellow**: Correct letter in wrong position
- **⬜ Gray**: Letter not in word

### Scoring:
- Base score: 100 points for winning
- Bonus: +10 points for each remaining attempt
- Example: Win on 3rd try = 100 + (3 × 10) = 130 points

## 🚀 Running the App

### Expo Server Status:
✅ **Server is running** on port 8081

### 📲 Testing with Expo Go:

1. **Install Expo Go** on your mobile device:
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Connect to the app**:
   
   **Option A - Tunnel URL (Recommended)**:
   The Expo server is running with ngrok tunnel. Check the logs:
   ```bash
   cat /tmp/expo_output.log
   ```
   Look for a line like: `exp://xxx-xxx.ngrok.io:80`
   
   **Option B - Local Network**:
   - Make sure your phone and computer are on the same WiFi
   - Find your computer's IP address
   - Update `/app/mobile/.env`:
     ```
     EXPO_PUBLIC_BACKEND_URL=http://YOUR_COMPUTER_IP:8001
     ```
   - In Expo Go, scan the QR code or enter: `exp://YOUR_COMPUTER_IP:8081`

3. **Important**: Update the backend URL in `/app/mobile/.env` to point to your actual backend:
   ```
   EXPO_PUBLIC_BACKEND_URL=http://YOUR_BACKEND_URL:8001
   ```

## 🗂️ Project Structure

```
/app/mobile/
├── App.js              # Main mobile app component
├── app.json            # Expo configuration
├── package.json        # Dependencies
└── .env                # Environment variables

/app/backend/
└── server.py           # FastAPI backend with word game endpoints

/app/scripts/
└── populate_words.py   # Script to populate word database
```

## 🔌 API Endpoints

### Game Management
- `POST /api/games` - Create new game session
- `POST /api/games/{game_id}/guess` - Submit a guess
- `GET /api/games/{game_id}` - Get game details
- `GET /api/scores/{player_id}` - Get player statistics

### Word Management
- `POST /api/words` - Add word to database (admin)
- `GET /api/words/{language}` - Get all words for language
- `GET /api/daily-word/{language}` - Get daily challenge word

## 📊 Database

Words are stored in MongoDB with the following structure:
```json
{
  "id": "unique_id",
  "word": "apple",
  "language": "en",
  "difficulty": "medium",
  "created_at": "2025-01-01T00:00:00"
}
```

### Current Word Count:
- 🇬🇧 English (EN): 32 words
- 🇪🇸 Spanish (ES): 22 words
- 🇫🇷 French (FR): 19 words
- 🇩🇪 German (DE): 18 words
- 🇮🇹 Italian (IT): 19 words
- 🇵🇹 Portuguese (PT): 18 words
- 🇹🇿 Swahili (SW): 13 words
- 🇮🇪 Irish Gaelic (GA): 7 words

## 🔧 Adding More Words

Run the populate script:
```bash
cd /app
python3 scripts/populate_words.py
```

Or add words via API:
```bash
curl -X POST http://localhost:8001/api/words \
  -H "Content-Type: application/json" \
  -d '{"word": "house", "language": "en", "difficulty": "easy"}'
```

## 🌐 Multi-Language Support

The game is designed to support any language, including minority languages. To add a new language:

1. Add words to the database with the language code
2. Update the language selector in `App.js` if needed
3. The game automatically handles different word lengths

## 🎯 Roadmap

- [x] Core Wordle gameplay
- [x] Multi-language support
- [x] Daily challenges
- [x] Score tracking
- [ ] Timer display during gameplay
- [ ] Multiplayer mode
- [ ] Leaderboards
- [ ] Word definitions
- [ ] Hint system
- [ ] Custom word packs

## 🛠️ Development Commands

```bash
# Start Expo server
cd /app/mobile
npx expo start --tunnel

# Restart backend
sudo supervisorctl restart backend

# Check backend logs
tail -f /var/log/supervisor/backend.out.log

# Check Expo logs
cat /tmp/expo_output.log
```

## 📱 App Screenshots

The app features:
- Dark mode interface (matches Wordle aesthetic)
- Clean, intuitive on-screen keyboard
- Game board with 6 rows for guesses
- Language selector with flag emojis
- Stats display showing win rate and scores
- Daily challenge mode

## 🎨 Customization

Edit `App.js` to customize:
- Colors and styling
- Number of attempts (default: 6)
- Word length (automatic based on word)
- Keyboard layout
- Scoring system

## 📄 License

Built for educational and entertainment purposes.

---

**Enjoy playing! 🎮✨**
