# 🇮🇳 WikIndia Trivia

A chronological sorting game where you place historical, cultural, scientific, cinematic, and sporting events of India on an interactive timeline, with multiplayer support(beta).

---

## How to Play

1. **Draw a Card**: A card appears with an event title and picture, but without the year.
2. **Place on Timeline**: Drag and drop (or click) to place the card in the correct chronological order relative to the existing cards.
3. **Score & Lives**:
   - **Correct**: The year is revealed, and your score goes up!
   - **Incorrect**: You lose a life (out of 3), and the card automatically slides to its correct position.
4. Play as long as you have lives remaining and try to get the highest score!

- Now supports multiplayer(beta)

---

## How to Setup & Run

### Prerequisites
Make sure you have **[Bun](https://bun.sh)** installed on your machine.

### 1. Install Dependencies
Run this command in the project folder:
```bash
bun install
```

### 2. Run the App
Start the development server:
```bash
bun dev
```
Open your browser at `http://localhost:3000` (or the address shown in your terminal).

### 3. Build for Production (Optional)
To create a production build:
```bash
bun run build
```
