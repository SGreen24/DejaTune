// src/pages/Home.jsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Check, X } from "lucide-react";
import { auth, db } from "../../config/firebase";
import Profile from "./Profile";

import { doc, onSnapshot, updateDoc, arrayUnion } from "firebase/firestore";

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [recentSongs, setRecentSongs] = useState([]);
  const [savedSongs, setSavedSongs] = useState([]);

  // UI state
  const [phrases, setPhrases] = useState([""]);
  const [genre, setGenre] = useState("");
  const [year, setYear] = useState("");
  const [tone, setTone] = useState("");
  const [vibe, setVibe] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [conversation, setConversation] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [options, setOptions] = useState([]);
  const [isFinalConfirm, setIsFinalConfirm] = useState(false);
  const [pendingGuess, setPendingGuess] = useState({ song: "", artist: "" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bgColor, setBgColor] = useState("var(--bg-color)");
  const [quoteTextColor, setQuoteTextColor] = useState("#000");

  // Gemini + Spotify setup
  const apiKey = "AIzaSyCh75P7FsxwekKc8XoXvnVm62hrBKyplQQ"; // this is our Gemini API info for now, gonna learn how to dotenv this to keep it concealed!
  const [spotifyClientId] = useState("ffbb278d0ef74b07887f0643f073a745");
  const [spotifyClientSecret] = useState("64f2d31922fb401eab8325c800637ab7");
  const ai = new GoogleGenerativeAI(apiKey);
  const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });

  // Listen for auth state
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (!u)
        navigate("/"); // not logged in → back to login
      else setUser(u);
    });
    return unsub;
  }, [navigate]);

  // Firestore: RecentSongs & SavedSongs
  useEffect(() => {
    if (!user) return;
    const recentRef = doc(db, "RecentSongs", user.uid);
    const savedRef = doc(db, "SavedSongs", user.uid);

    const unsubRecent = onSnapshot(recentRef, (snap) => {
      setRecentSongs(snap.exists() ? snap.data().songs || [] : []);
    });
    const unsubSaved = onSnapshot(savedRef, (snap) => {
      setSavedSongs(snap.exists() ? snap.data().songs || [] : []);
    });

    return () => {
      unsubRecent();
      unsubSaved();
    };
  }, [user]);

  // ─── FORM FEATURE ───
  const buildFormPrompt = () =>
    `
You're a powerful music memory assistant.

TASK:
1. Use the clues below to guess the most likely song and artist.
2. Lookup the full lyrics to that song.
3. Check if ANY of the lyric fragments are actually in the real lyrics.
4. If yes, output exactly:
   Song: <name>
   Artist: <name>
   Verse: "<matching line or stanza>".

USER CLUES:
${phrases.map((p, i) => `${i + 1}. "${p}"`).join("\n")}
${genre ? `Genre: ${genre}` : ""}
${year ? `Year: ${year}` : ""}
${tone ? `Mood: ${tone}` : ""}
${vibe ? `Vibe: ${vibe}` : ""}
`.trim();

  const identifySong = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let found = null;
      for (let i = 0; i < 10 && !found; i++) {
        const raw = await (
          await model.generateContent(buildFormPrompt())
        ).response.text();
        const songM = /Song:\s*(.+)/i.exec(raw);
        const artM = /Artist:\s*(.+)/i.exec(raw);
        const vM = /Verse:\s*"(.+?)"/is.exec(raw);
        if (!songM || !artM || !vM) continue;

        const song = songM[1].trim();
        const art = artM[1].trim();
        const verse = vM[1].trim();

        if (
          phrases.some((p) => verse.toLowerCase().includes(p.toLowerCase()))
        ) {
          // bold user fragments
          const bolded = phrases.reduce(
            (acc, ph) =>
              ph ? acc.replace(new RegExp(`(${ph})`, "gi"), "**$1**") : acc,
            verse,
          );
          const details = await fetchSpotifyDetails(song, art);
          found = { song, artist: art, verse: bolded, ...details };
        }
      }
      if (!found) throw new Error("Couldn't match any lyrics after 10 tries.");

      // 💾 Save to RecentSongs
      if (user) {
        const recentRef = doc(db, "RecentSongs", user.uid);
        await updateDoc(recentRef, {
          songs: arrayUnion({
            song: found.song,
            artist: found.artist,
            timestamp: new Date().toISOString(),
          }),
        });
      }

      setResult(found);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── CHAT FEATURE ───
  const askClarifyingQuestion = async () => {
    setLoading(true);
    setError(null);
    try {
      const history = conversation
        .map((m) => `${m.speaker === "user" ? "User" : "Déjà"}: ${m.text}`)
        .join("\n");

      const prompt = `
You are DéjáTune, an Akinator-style music assistant.
Ask at least 3 yes/no/unsure questions before guessing.
Respond with one JSON object only:

If more info:
{"type":"QUESTION","question":"...","options":["Yes","No","Unsure"],"ready":false}
When ready:
{"type":"QUESTION","question":"Is the song '<song>' by <artist>?","options":["Yes","No"],"ready":true,"song":"<song>","artist":"<artist>"}

Conversation so far:
${history}
      `.trim();

      let raw = await (await model.generateContent(prompt)).response.text();
      raw = raw.replace(/```json|```/g, "").trim();
      const obj = JSON.parse(raw);

      if (obj.type === "QUESTION" && !obj.ready) {
        setConversation((c) => [...c, { speaker: "bot", text: obj.question }]);
        setCurrentQuestion(obj.question);
        setOptions(obj.options);
      } else if (obj.type === "QUESTION" && obj.ready) {
        setIsFinalConfirm(true);
        setPendingGuess({ song: obj.song, artist: obj.artist });
        setConversation((c) => [...c, { speaker: "bot", text: obj.question }]);
        setCurrentQuestion(obj.question);
        setOptions(obj.options);
      } else {
        throw new Error("Unexpected JSON from Gemini");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOption = async (opt) => {
    setConversation((c) => [...c, { speaker: "user", text: opt }]);
    setCurrentQuestion("");
    setOptions([]);

    if (isFinalConfirm) {
      if (opt === "Yes") {
        const { song, artist } = pendingGuess;
        const details = await fetchSpotifyDetails(song, artist);
        setResult({ song, artist, ...details });
      } else {
        setIsFinalConfirm(false);
        askClarifyingQuestion();
      }
    } else {
      askClarifyingQuestion();
    }
  };

  const handleSendInitial = () => {
    if (!inputValue.trim()) return;
    setConversation((c) => [
      ...c,
      { speaker: "user", text: inputValue.trim() },
    ]);
    setInputValue("");
    askClarifyingQuestion();
  };

  // ─── SPOTIFY HELPERS ───
  const fetchSpotifyToken = async () => {
    const creds = btoa(`${spotifyClientId}:${spotifyClientSecret}`);
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${creds}`,
      },
      body: "grant_type=client_credentials",
    });
    const data = await res.json();
    if (!data.access_token) throw new Error("Spotify auth failed");
    return data.access_token;
  };

  const fetchSpotifyDetails = async (song, artist) => {
    const token = await fetchSpotifyToken();
    const q = encodeURIComponent(`track:${song} artist:${artist}`);
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const { tracks } = await res.json();
    const track = tracks?.items?.[0];
    if (!track) return {};
    let genres = "";
    const artistId = track.artists[0]?.id;
    if (artistId) {
      const artRes = await fetch(
        `https://api.spotify.com/v1/artists/${artistId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      genres = (await artRes.json()).genres?.join(", ") || "";
    }
    return {
      albumImage: track.album.images[0]?.url || "",
      albumName: track.album.name,
      releaseDate: track.album.release_date,
      spotifyId: track.id,
      genreList: genres,
    };
  };

  // ─── DYNAMIC BG & TEXT COLOR ───
  useEffect(() => {
    if (!result?.albumImage) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = result.albumImage;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, img.width, img.height);
      let r = 0,
        g = 0,
        b = 0,
        cnt = 0;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        cnt++;
      }
      r = Math.round(r / cnt);
      g = Math.round(g / cnt);
      b = Math.round(b / cnt);
      setBgColor(`rgb(${r},${g},${b})`);
      const lum = (r * 299 + g * 587 + b * 114) / 1000;
      setQuoteTextColor(lum < 128 ? "#FFF" : "#000");
    };
  }, [result?.albumImage]);

  // ─── ACCEPT / REJECT ───
  const onAccept = async () => {
    if (user && result) {
      const savedRef = doc(db, "SavedSongs", user.uid);
      await updateDoc(savedRef, {
        songs: arrayUnion({
          song: result.song,
          artist: result.artist,
          timestamp: new Date().toISOString(),
          albumName: result.albumName,
          spotifyId: result.spotifyId,
        }),
      });
    }
    clearAll();
  };

  const onReject = () => {
    result ? clearAll() : handleOption("No");
  };

  const clearAll = () => {
    setShowForm(false);
    setShowChat(false);
    setPhrases([""]);
    setGenre("");
    setYear("");
    setTone("");
    setVibe("");
    setConversation([]);
    setCurrentQuestion("");
    setOptions([]);
    setResult(null);
    setError(null);
    setIsFinalConfirm(false);
    setPendingGuess({ song: "", artist: "" });
    setBgColor("var(--bg-color)");
    setQuoteTextColor("#000");
  };

  // ─── SIGN OUT ───
  const handleSignOut = async () => {
    await auth.signOut();
    navigate("/");
  };

  return (
    <div className="app-container">
      {/* ← Left Sidebar */}
      <aside className="left-sidebar">
        {savedSongs.length > 0 && (
          <>
            <h2>Accepted Thoughts</h2>
            <div className="recent-list">
              {savedSongs.map((t, i) => (
                <div key={i} className="recent-item">
                  {t.song} – {t.artist}
                </div>
              ))}
            </div>
            <hr style={{ margin: "1rem 0", borderColor: "var(--border)" }} />
          </>
        )}
        <h2>Recent Searches</h2>
        <div className="recent-list">
          {recentSongs.map((t, i) => (
            <div key={i} className="recent-item">
              {t.song} – {t.artist}
            </div>
          ))}
        </div>
      </aside>

      {/* ↓ Center Panel */}
      <main className="main-content" style={{ backgroundColor: bgColor }}>
        {/* SPLASH */}
        {!showForm && !showChat && !result && (
          <div className="think-view">
            <button className="think-btn" onClick={() => setShowForm(true)}>
              Think!
            </button>
            <h2 className="dejatune-title">DéjáTune</h2>
          </div>
        )}

        {/* FORM FEATURE */}
        {showForm && !showChat && !result && (
          <div className="form-view">
            <section>
              <h3>Lyric Fragments</h3>
              {phrases.map((p, i) => (
                <input
                  key={i}
                  type="text"
                  value={p}
                  onChange={(e) =>
                    setPhrases((u) => {
                      u[i] = e.target.value;
                      return [...u];
                    })
                  }
                  placeholder={`Fragment ${i + 1}`}
                />
              ))}
              <button onClick={() => setPhrases((u) => [...u, ""])}>
                + Add Fragment
              </button>
            </section>
            <section>
              <h3>Filters</h3>
              <div className="filters-grid">
                <input
                  placeholder="Genre"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                />
                <input
                  placeholder="Year"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                />
                <input
                  placeholder="Mood"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                />
                <input
                  placeholder="Vibe"
                  value={vibe}
                  onChange={(e) => setVibe(e.target.value)}
                />
              </div>
            </section>
            <button
              className="identify-btn"
              onClick={identifySong}
              disabled={loading}
            >
              {loading ? "Identifying…" : "Identify Song"}
            </button>
            {error && <p className="error">{error}</p>}
          </div>
        )}

        {/* CHAT FEATURE */}
        {showChat && !result && (
          <div className="chat-container">
            {conversation.map((m, i) => (
              <div
                key={i}
                className={`chat-bubble ${m.speaker === "user" ? "user" : "bot"}`}
              >
                {m.text}
              </div>
            ))}
            {currentQuestion && options.length > 0 && (
              <div className="options-row">
                {options.map((o) => (
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
            {!currentQuestion && conversation.length === 0 && (
              <div className="initial-input">
                <input
                  type="text"
                  placeholder="What song are you thinking of?"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendInitial()}
                />
                <button
                  onClick={handleSendInitial}
                  disabled={!inputValue.trim() || loading}
                >
                  Send
                </button>
              </div>
            )}
            {error && <p className="error">{error}</p>}
          </div>
        )}

        {/* RESULT VIEW */}
        {result && (
          <div className="result-view">
            <img
              src={result.albumImage}
              alt="Album cover"
              className="cover-thumb"
            />
            <div className="quote-panel">
              <h1 className="result-song">{result.song}</h1>
              <h2 className="result-artist">{result.artist}</h2>
              <div className="result-meta">
                <span>{result.albumName}</span>
                <span>{result.releaseDate}</span>
              </div>

              {result.verse && (
                <div
                  className="lyrics-container"
                  style={{
                    margin: "1rem 0",
                    padding: "1rem",
                    backgroundColor: "rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: quoteTextColor,
                    fontStyle: "italic",
                    position: "relative",
                    lineHeight: "1.6",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: "0.5rem",
                      top: "-0.5rem",
                      fontSize: "2rem",
                      color: quoteTextColor,
                      opacity: "0.7",
                    }}
                  >
                    "
                  </div>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: result.verse.replace(
                        /\*\*(.*?)\*\*/g,
                        "<b><i>$1</i></b>",
                      ),
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      right: "0.5rem",
                      bottom: "-1rem",
                      fontSize: "2rem",
                      color: quoteTextColor,
                      opacity: "0.7",
                    }}
                  >
                    "
                  </div>
                </div>
              )}

              {result.spotifyId && (
                <iframe
                  title="Spotify preview"
                  src={`https://open.spotify.com/embed/track/${result.spotifyId}`}
                  width="100%"
                  height="80"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                />
              )}

              <div className="accept-reject">
                <button onClick={onAccept}>
                  <Check size={32} />
                </button>
                <button onClick={onReject}>
                  <X size={32} />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <aside className="right-sidebar flex flex-col items-end space-y-4 p-4">
        <div className="mb-4">
          <Profile /> 
        </div>

        {!showChat ? (
          <button
            className="chat-deja"
            onClick={() => {
              clearAll();
              setShowChat(true);
            }}
          >
            Chat w/ Déjà
          </button>
        ) : (
          <button
            className="chat-deja"
            onClick={() => {
              clearAll();
              setShowForm(true);
            }}
          >
            Think w/ Form
          </button>
        )}
      </aside>
    </div>
  );
};

export default Home;
