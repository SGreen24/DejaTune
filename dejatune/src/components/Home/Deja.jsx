import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Check, X } from 'lucide-react';
import './Deja.css';
import { auth, db } from "../../config/firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";

const apiKey = import.meta.env.VITE_GEMINI_KEY;
const spotifyClientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const spotifyClientSecret = import.meta.env.VITE_SPOTIFY_SECRET_ID;

const Deja = () => {
  const aiRef = useRef(null);
  const [conversation, setConversation] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [options, setOptions] = useState([]);
  const [askedQuestions, setAskedQuestions] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [songResult, setSongResult] = useState(null);

  // initialize Gemini client
  useEffect(() => {
    aiRef.current = new GoogleGenerativeAI(apiKey);
  }, []);

  // get Spotify token
  const getSpotifyToken = async () => {
    const resp = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + btoa(`${spotifyClientId}:${spotifyClientSecret}`)
      },
      body: new URLSearchParams({ grant_type: 'client_credentials' })
    });
    return (await resp.json()).access_token;
  };

  // fetch track details
  const fetchSongDetails = async (title, artist) => {
    const token = await getSpotifyToken();
    const query = `track:${title} artist:${artist}`;
    const resp = await fetch(
      `https://api.spotify.com/v1/search?${new URLSearchParams({
        q: query,
        type: 'track',
        limit: '1'
      })}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const track = (await resp.json()).tracks.items[0];
    if (!track) throw new Error('Song not found');
    return {
      title: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      album: track.album.name,
      releaseDate: track.album.release_date,
      coverUrl: track.album.images[0]?.url,
      spotifyId: track.id
    };
  };

  // Gemini chat helper
  const askChat = async ({ systemInstruction, history, userMessage }) => {
    if (!aiRef.current) throw new Error('API not initialized');
    const model = aiRef.current.getGenerativeModel({ model: "gemini-2.0-flash" });
    const chat = model.startChat({
      systemInstruction: { role: 'system', parts: [{ text: systemInstruction }] },
      history: history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
      generationConfig: { temperature: 0.7 }
    });
    const res = await chat.sendMessage(userMessage);
    const text = (await res.response).text();
    if (!text) throw new Error('Empty response');
    return text.trim();
  };

  // kick off with first lyric fragment
  const generateInitialQuestion = async () => {
    if (!inputValue.trim() || loading) return;
    setLoading(true);
    setError('');
    try {
      const userText = inputValue.trim();
      setConversation([{ speaker: 'user', text: userText }]);

      const systemPrompt =
        'You are an Akinator-like music guessing AI. Given the lyric fragment, respond with exactly:\n' +
        'Is your song "<song title>" by "<artist>"?';

      const question = await askChat({
        systemInstruction: systemPrompt,
        history: [],
        userMessage: `Lyric fragment: "${userText}"`
      });

      if (!question.toLowerCase().startsWith('is your song')) {
        throw new Error('Bad format: ' + question);
      }

      setConversation(c => [...c, { speaker: 'bot', text: question }]);
      setCurrentQuestion(question);
      setOptions(['Yes','No','Unsure','Other']);
      setAskedQuestions(new Set([question]));
      setInputValue('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // follow-up
  const generateNextQuestion = async (answer) => {
    setLoading(true);
    setError('');
    try {
      const updated = [...conversation, { speaker: 'user', text: answer }];
      setConversation(updated);

      const systemPrompt = `
You are a music guessing AI. Ask one new yes/no question to identify the song.
Do not repeat. Previously asked:
${Array.from(askedQuestions).join('\n')}
      `.trim();

      const history = updated.map(m => ({
        role: m.speaker === 'user' ? 'user' : 'model',
        text: m.text
      }));

      const question = await askChat({ systemInstruction: systemPrompt, history, userMessage: '' });
      setConversation(c => [...c, { speaker: 'bot', text: question }]);
      setCurrentQuestion(question);
      setOptions(['Yes','No','Unsure','Other']);
      setAskedQuestions(s => new Set([...s, question]));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // user clicks an option
  const handleOption = async (opt) => {
    if (opt === 'Other') {
      setManualMode(true);
      return;
    }
    if (opt === 'Yes' && currentQuestion.startsWith('Is your song')) {
      const [, title, artist] = currentQuestion.match(/^Is your song "(.*)" by "(.*)"\?$/) || [];
      if (title && artist) {
        setLoading(true);
        try {
          const details = await fetchSongDetails(title, artist);
          setSongResult(details);
        } catch (e) {
          setError(e.message);
        } finally {
          setLoading(false);
        }
        return;
      }
    }
    generateNextQuestion(opt);
  };

  // manual override submit
  const handleManualSubmit = e => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    const ans = manualInput.trim();
    setManualInput('');
    setManualMode(false);
    generateNextQuestion(ans);
  };

  const acceptSong = async () => {
    if (!songResult) return;
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not logged in.");
  
      const savedRef = doc(db, "SavedSongs", user.uid);
      await updateDoc(savedRef, {
        songs: arrayUnion({
          song: songResult.title,
          artist: songResult.artist,
          albumName: songResult.album,
          releaseDate: songResult.releaseDate,
          spotifyId: songResult.spotifyId,
          albumImage: songResult.coverUrl,
          timestamp: new Date().toISOString()
        }),
      });
      resetAll();
    } catch (error) {
      console.error("Failed to save accepted song:", error.message);
    }
  };

  // reset all state
  const resetAll = () => {
    setConversation([]);
    setCurrentQuestion('');
    setOptions([]);
    setAskedQuestions(new Set());
    setSongResult(null);
    setError('');
    setManualMode(false);
    setManualInput('');
    setInputValue('');
  };

  return (
    <div className="chat-container">
      {songResult ? (
        <div className="song-result-card">
          <div className="song-header">
            <img src={songResult.coverUrl} alt="" className="cover-thumb" />
            <div className="song-meta">
              <h2 className="song-title">{songResult.title}</h2>
              <p className="song-artist">{songResult.artist}</p>
              <p className="song-album">
                {songResult.album} &middot; {songResult.releaseDate}
              </p>
            </div>
          </div>
          <iframe
            title="spotify-player"
            src={`https://open.spotify.com/embed/track/${songResult.spotifyId}`}
            width="100%" height="80" frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
          <div className="accept-reject">
          <button onClick={acceptSong}>
              <Check size={32}/>
            </button>
            <button onClick={resetAll}>
              <X size={32}/>
            </button>
          </div>
        </div>
      ) : (
        <>
          {conversation.length === 0 && !manualMode && (
            <div className="instructions">
              <p>Enter a lyric fragment, and I'll try to guess the song!</p>
            </div>
          )}

          {conversation.map((m, i) => (
            <div key={i} className={`chat-bubble ${m.speaker}`}>
              {m.text}
            </div>
          ))}

          {loading && <p className="loading">Thinking…</p>}
          {error   && <p className="error">{error}</p>}

          {manualMode ? (
            <form className="manual-input" onSubmit={handleManualSubmit}>
              <input
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                disabled={loading}
                placeholder="Type your answer…"
              />
              <button disabled={!manualInput.trim()}>Send</button>
            </form>
          ) : !currentQuestion ? (
            <form className="initial-input" onSubmit={e => { e.preventDefault(); generateInitialQuestion(); }}>
              <input
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                disabled={loading}
                placeholder="What lyric are you thinking of?"
              />
              <button disabled={!inputValue.trim()||loading}>Send</button>
            </form>
          ) : (
            <div className="options-row">
              {options.map(o => (
                <button
                  key={o}
                  className="option-btn"
                  onClick={() => handleOption(o)}
                  disabled={loading}
                >
                  {o}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Deja;
