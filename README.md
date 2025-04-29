# Déjà Tune 🎵

**Winner of the Entertainment Track Project at MorganHacks!**

Ever had to relive a stuck music melody stored in your mind like Dejavu? Welcome to our app DejaTune, your personal music finder. Just input the few lyrics you remember, and let Déjà handle the rest!

## Features

### Think! 🤔
- Input fragmented lyrics you remember from a song
- Add additional context like Genre, Year, Mood, or Vibe
- Get song suggestions powered by Gemini API
- Save confirmed songs to "Accepted Thoughts" with detailed overviews and fun facts

### Chat w/ Déjà 💬
- Interactive chatbot that helps find your song
- Follow-up questions based on your responses
- Similar to Akinator but for music!
- Quick yes/no/unsure responses to narrow down the search

### Generate Tunes 🎶
- Create personalized playlists based on your preferences
- Select by Genre, Era, Vibe, or Favorite Artists
- Customize the number of songs to generate

## Tech Stack
- Frontend: React + JavaScript with TailwindCSS
- APIs: Gemini API, Spotify API
- Database: Firebase Firestore
- Build Tool: Vite

## Deployment

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Vercel Deployment
```bash
# Install dependencies
npm install

# Build command
npm run build

# Output directory
dist/
```

## Project Story

### Inspiration
We were trying to remember a song from our childhood, but we only knew a few of the lyrics. We were gonna Shazam it, but we weren't near the song to record the audio. This made us think, what if we made an app that could find ANY song just from a few lyrics we remember?

### Challenges
- Implementing the "Accepted Thoughts" section with proper layout and design
- First-time integration with Spotify and Gemini APIs
- Creating an intuitive user interface for song discovery

### Accomplishments
- Successfully implemented the "Accepted Thoughts" section with a beautiful UI
- Integrated Spotify API for song details and previews
- Created an interactive chatbot for song discovery
- Built a responsive and user-friendly interface

### What's Next
- Optimize the song detection model
- Consider training a custom dataset for better lyric matching
- Explore pre-trained models on HuggingFace for improved accuracy
- Enhance the playlist generation capabilities

## License
MIT
