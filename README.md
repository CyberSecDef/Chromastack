# Chromastack

A real-time ball sorting puzzle game built with Node.js, WebSockets, and vanilla JavaScript.

![Chromastack Game](https://github.com/user-attachments/assets/755782e3-75e6-4c65-bc7a-a6ed4879639c)

## Features

- 🎮 **Real-time WebSocket communication** - Instant game state updates
- 🎨 **Dynamic level generation** - Scales from 4x4 to 10x10 grids
- 🌓 **Dark/Light theme toggle** - Persistent theme preference
- ⏱️ **Live statistics** - Track level, moves, and time
- 🔄 **Restart functionality** - Reset current level anytime
- 📱 **Responsive design** - Works on desktop and mobile devices
- 🎯 **Progressive difficulty** - Levels get larger and more challenging

## Game Rules

1. Click a column to select it (must contain tokens)
2. Click another column to move the top ball from the selected column
3. Tokens can only be moved to:
   - Empty columns
   - Columns where the top ball is the same color
4. Goal: Sort all tokens so each column contains only one color
5. Complete the level to advance to the next challenge!

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

The game will be available at `http://localhost:3000`

## Project Structure

```
Chromastack/
├── server.js       # WebSocket server and Express static file server
├── client.js       # Client-side game logic, UI, and WebSocket handling
├── shared.js       # Shared game state, rules, and level generation
├── index.html      # Game HTML structure
├── styles.css      # Styling with dark/light theme support
├── package.json    # Node.js dependencies and scripts
└── assets/         # Game assets directory
```

## Technologies Used

- **Backend**: Node.js, Express, WebSocket (ws)
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Communication**: WebSocket for real-time bidirectional communication
- **Styling**: CSS custom properties for theming

## Game Mechanics

### Level Progression
- **Level 1-2**: 4x4 grid (3 colors, 1 empty column)
- **Level 3-4**: 5x5 grid (4 colors, 1 empty column)
- **Level 5-6**: 6x6 grid (5 colors, 1 empty column)
- **Level 7-8**: 7x7 grid (6 colors, 1 empty column)
- **Level 9-10**: 8x8 grid (7 colors, 1 empty column)
- **Level 11-12**: 9x9 grid (8 colors, 1 empty column)
- **Level 13+**: 10x10 grid (9 colors, 1 empty column) - Maximum difficulty

### Available Colors
Red, Blue, Green, Yellow, Purple, Orange, Pink, Cyan, Lime, Magenta

## Development

### Running in Development Mode
```bash
npm run dev
```

### Environment Variables
- `PORT` - Server port (default: 3000)

## Screenshots

### Dark Theme
![Dark Theme](https://github.com/user-attachments/assets/755782e3-75e6-4c65-bc7a-a6ed4879639c)

### Light Theme
![Light Theme](https://github.com/user-attachments/assets/1d990112-da5a-4892-9411-319acfc8aaf6)

### Gameplay
![Column Selected](https://github.com/user-attachments/assets/d9ca9e14-329d-4b97-bbfa-7307952961ac)
![After Move](https://github.com/user-attachments/assets/f4e023e9-bad0-46d1-a0c8-84ebdafdf43b)

## License

MIT
