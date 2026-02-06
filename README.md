# Chromastack

A real-time ball sorting puzzle game with competitive leaderboards, built with Node.js, WebSockets, and vanilla JavaScript.

![Chromastack Game](https://github.com/user-attachments/assets/755782e3-75e6-4c65-bc7a-a6ed4879639c)

## Features

- 🎮 **Real-time WebSocket communication** - Instant game state updates
- 🏆 **Global Leaderboard** - Track top 5 high scores with player names
- 👤 **Player Profiles** - Enter your name for leaderboard recognition
- 🎨 **Dynamic level generation** - Scales from 4x4 to 10x10 grids
- 🌓 **Dark/Light theme toggle** - Persistent theme preference
- ⏱️ **Live statistics** - Track level, moves, time, and cumulative score
- 🔄 **Restart functionality** - Reset current level anytime
- 📱 **Responsive design** - Optimized for desktop and mobile devices
- 🎯 **Progressive difficulty** - Levels get larger and more challenging
- 🎉 **Victory celebrations** - Confetti animations and special messages
- 🎨 **Accessibility** - Emoji-based tokens for colorblind users
- 🖱️ **Multiple input methods** - Click, drag & drop, and touch support
- 🔁 **Endless gameplay** - Game resets after level 10 for continuous play
- 💾 **Session persistence** - Games save across browser sessions
- 📊 **High score tracking** - Personal bests preserved on leaderboard

## Game Rules

1. **Click Method**: Click a column to select it, then click another column to move the top token
2. **Drag & Drop**: Drag the top token from one column and drop it on another column (desktop & mobile)
3. **Movement Rules**: You can only move a token to an empty column or a column with available space
4. **Goal**: Sort all tokens so each column contains only one type of emoji
5. **Level Progression**: Complete levels to unlock larger grids (4×4 → 5×5 → 6×6 → etc.)
6. **Game Reset**: After completing level 10, the game resets to level 1 with fresh scoring
7. **Scoring**: Points accumulate across levels until game reset

## Installation

```bash
# Clone the repository
git clone https://github.com/CyberSecDef/Chromastack.git
cd Chromastack

# Install dependencies
npm install

# Start the server
npm start
```

The game will be available at `http://localhost:8016`

## Project Structure

```
Chromastack/
├── server.js           # WebSocket server with leaderboard and session management
├── client.js           # Client-side game logic, UI, and WebSocket handling
├── shared.js           # Shared game state, rules, and level generation
├── index.html          # Game HTML structure with modals and leaderboard
├── styles.css          # Responsive styling with dark/light theme support
├── package.json        # Node.js dependencies and scripts
└── assets/             # Game assets directory
```

## Technologies Used

- **Backend**: Node.js, Express, WebSocket (ws)
- **Frontend**: Vanilla JavaScript, HTML5, CSS3, HTML5 Drag & Drop API
- **Communication**: WebSocket for real-time bidirectional communication with message queuing
- **Styling**: CSS custom properties for theming, responsive design with flexbox
- **Storage**: localStorage for client-side persistence, in-memory server storage
- **Security**: Input validation, rate limiting, session management

## Game Mechanics

### Level Progression & Reset
- **Levels 1-10**: Progressive difficulty with cumulative scoring
- **Level 1-2**: 4x4 grid (3 colors, 1 empty column)
- **Level 3-4**: 5x5 grid (4 colors, 1 empty column)
- **Level 5-6**: 6x6 grid (5 colors, 1 empty column)
- **Level 7-8**: 7x7 grid (6 colors, 1 empty column)
- **Level 9-10**: 8x8 grid (7 colors, 1 empty column)
- **Game Reset**: After level 10 completion, game resets to level 1 with 0 points
- **Endless Play**: Continue playing indefinitely with fresh scoring each cycle

### Scoring System
- **Level Score**: Calculated as `(totalTokens × 10000) ÷ (moves × 0.25 × max(time, 1))`
- **Cumulative Score**: Points accumulate across levels until game reset
- **High Scores**: Personal bests are tracked and displayed on leaderboard
- **Reset Timing**: Scores reset to 0 after level 10 completion

### Leaderboard System
- **Top 5 Display**: Shows highest scores across all players
- **Personal Bests**: Only updates when player achieves new high score
- **Player Names**: Customizable player names for recognition
- **Persistent**: High scores survive server restarts and game resets

### Available Token Types
🍎 🍇 🫐 🥦 ⭐ 🍊 🍒 💎 🍈 ❤️

### Input Methods
- **Desktop**: Click-to-select or drag & drop
- **Mobile**: Touch gestures with drag support
- **Accessibility**: Emoji-based tokens work for colorblind users

## Development

### Running in Development Mode
```bash
npm run dev
# or
npm start
```

### Environment Variables
- `PORT` - Server port (default: 8016)

### Architecture Notes
- **Real-time Communication**: WebSocket with automatic reconnection and message queuing
- **Session Management**: Persistent game state across browser sessions
- **Responsive UI**: Mobile-first design with touch optimization
- **Performance**: Efficient DOM updates and CSS animations

## Screenshots

### Game Interface
![Game Interface](https://github.com/user-attachments/assets/755782e3-75e6-4c65-bc7a-a6ed4879639c)

**Key UI Elements:**
- **Status Bar**: Level, moves, time, total score, and player name input
- **Game Board**: Dynamic grid that grows with level progression
- **Leaderboard**: Top 5 high scores with player names
- **Control Buttons**: Restart, theme toggle, and help

### Dark Theme
![Dark Theme](https://github.com/user-attachments/assets/755782e3-75e6-4c65-bc7a-a6ed4879639c)

### Light Theme
![Light Theme](https://github.com/user-attachments/assets/1d990112-da5a-4892-9411-319acfc8aaf6)

### Gameplay Features
- **Column Selection**: Click or drag to select and move tokens
- **Victory Modal**: Shows level score with confetti celebration
- **Game Reset**: Special "Game Complete!" modal after level 10
- **Mobile Support**: Touch-optimized interface for phones and tablets

### Leaderboard & Competition
- **High Score Tracking**: Personal bests preserved across sessions
- **Player Recognition**: Custom names on leaderboard
- **Real-time Updates**: Leaderboard updates when new high scores achieved

## API Reference

### WebSocket Messages

#### Client → Server
- `join`: `{ sessionId, name }` - Join game with session and player name
- `move`: `{ fromColumn, toColumn }` - Move token between columns
- `nextLevel`: `{}` - Progress to next level
- `restart`: `{}` - Reset current level
- `updateName`: `{ name }` - Update player name
- `getState`: `{}` - Request current game state

#### Server → Client
- `gameState`: `{ ...gameData }` - Full game state update
- `levelComplete`: `{ level, moves, time, levelScore, totalScore, gameReset }` - Level completion notification
- `leaderboard`: `[ { name, score, level }, ... ]` - Top 5 leaderboard update

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly (WebSocket functionality, mobile responsiveness, scoring)
5. Submit a pull request

## License

MIT License - see LICENSE file for details
