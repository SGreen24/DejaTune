import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Check, X, Play, Pause, Disc3 } from "lucide-react";
import { auth, db } from "../../config/firebase";
import Profile from "./Profile";
import Think from "./Think";
import Deja from "./Deja";
import GenerateTunes from "./GenerateTunes";
import "./Home.css"
import {
  doc,
  onSnapshot,
  updateDoc,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [recentSongs, setRecentSongs] = useState([]);
  const [savedSongs, setSavedSongs] = useState([]);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);

  // UI state
  const [phrases, setPhrases] = useState([""]);
  const [genre, setGenre] = useState("");
  const [year, setYear] = useState("");
  const [tone, setTone] = useState("");
  const [vibe, setVibe] = useState("");
  const [showSongDetailsDropdown, setShowSongDetailsDropdown] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [conversation, setConversation] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [options, setOptions] = useState([]);
  const [isFinalConfirm, setIsFinalConfirm] = useState(false);
  const [pendingGuess, setPendingGuess] = useState({ song: "", artist: "" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [overview, setOverview] = useState("");
  const [funFact, setFunFact] = useState("");
  const [bgColor, setBgColor] = useState("var(--bg-color)");
  const [quoteTextColor, setQuoteTextColor] = useState("#000");
  const [showOverviewDropdown, setShowOverviewDropdown] = useState(false);
const [showFunFactDropdown, setShowFunFactDropdown] = useState(false);


  // Gemini + Spotify setup
  const apiKey = import.meta.env.VITE_GEMINI_KEY;
  const spotifyClientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  const spotifyClientSecret = import.meta.env.VITE_SPOTIFY_SECRET_ID;

  const ai = new GoogleGenerativeAI(apiKey);
  const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });

  // NEW: fetch Overview & Fun Fact
  async function fetchSongExtras(song, artist) {
    const prompt = `
You are a music expert. For the song "${song}" by ${artist}, output ONLY valid JSON:
{
  "overview": "A brief summary of the song's background and style.",
  "funFact": "An interesting trivia tidbit about the song."
}`;
    const raw = await (await model.generateContent(prompt)).response.text();
    const json = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(json);
  }

  // NEW: when clicking a saved song
  async function handleSavedClick(item) {
    setLoading(true);
    setError(null);
    try {
      // fetch album + metadata
      const details = await fetchSpotifyDetails(item.song, item.artist);

      // fetch Gemini extras
      const extras = await fetchSongExtras(item.song, item.artist);

      setResult({
        song: item.song,
        artist: item.artist,
        ...details
      });
      setOverview(extras.overview);
      setFunFact(extras.funFact);
    } catch (e) {
      setError(e.message || "Failed to load song details.");
    } finally {
      setLoading(false);
    }
  }

  // Toggle play/pause for songs
  const togglePlay = (spotifyId) => {
    if (currentlyPlaying === spotifyId) {
      setCurrentlyPlaying(null);
    } else {
      setCurrentlyPlaying(spotifyId);
    }
  };

  // Listen for auth state
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (!u) navigate("/");
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


    // Dynamic background based on album cover
    useEffect(() => {
      if (!result?.albumImage) return;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = result.albumImage;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width; canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const { data } = ctx.getImageData(0, 0, img.width, img.height);
        let r=0,g=0,b=0,cnt=0;
        for(let i=0;i<data.length;i+=4){
          r+=data[i]; g+=data[i+1]; b+=data[i+2]; cnt++;
        }
        r=Math.round(r/cnt); g=Math.round(g/cnt); b=Math.round(b/cnt);
        setBgColor(`rgb(${r},${g},${b})`);
        const lum=(r*299+g*587+b*114)/1000;
        setQuoteTextColor(lum<128?"#FFF":"#000");
      };
    }, [result?.albumImage]);

  // delete handlers
  const deleteSavedSong = async (songObj) => {
    if (!user) return;
    const savedRef = doc(db, "SavedSongs", user.uid);
    await updateDoc(savedRef, { songs: arrayRemove(songObj) });
  };

  

  const deleteRecentSong = async (songObj) => {
    if (!user) return;
    const recentRef = doc(db, "RecentSongs", user.uid);
    await updateDoc(recentRef, { songs: arrayRemove(songObj) });
  }

  // Form prompt builder
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
        const artist = artM[1].trim();
        const verse = vM[1].trim();

        if (
          phrases.some((p) => verse.toLowerCase().includes(p.toLowerCase()))
        ) {
          const bolded = phrases.reduce(
            (acc, ph) =>
              ph
                ? acc.replace(new RegExp(`(${ph})`, "gi"), "**$1**")
                : acc,
            verse
          );
          const details = await fetchSpotifyDetails(song, artist);
          found = { song, artist, verse: bolded, ...details };
        }
      }
      if (!found) throw new Error("Couldn't match any lyrics after 10 tries.");

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

  // Chat feature
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

      if (obj.type === "QUESTION") {
        setConversation((c) => [...c, { speaker: "bot", text: obj.question }]);
        setCurrentQuestion(obj.question);
        setOptions(obj.options);
        if (obj.ready) {
          setIsFinalConfirm(true);
          setPendingGuess({ song: obj.song, artist: obj.artist });
        }
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

  // Spotify helpers
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
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const { tracks } = await res.json();
    const track = tracks?.items?.[0];
    if (!track) return {};
    let genres = "";
    const artistId = track.artists[0]?.id;
    if (artistId) {
      const artRes = await fetch(
        `https://api.spotify.com/v1/artists/${artistId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      genres = (await artRes.json()).genres.join(", ") || "";
    }
    return {
      albumImage: track.album.images[0]?.url || "",
      albumName: track.album.name,
      releaseDate: track.album.release_date,
      spotifyId: track.id,
      genreList: genres,
    };
  };

  // Dynamic background based on album cover
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
      let r = 0, g = 0, b = 0, cnt = 0;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i]; g += data[i+1]; b += data[i+2]; cnt++;
      }
      r = Math.round(r / cnt); g = Math.round(g / cnt); b = Math.round(b / cnt);
      setBgColor(`rgb(${r},${g},${b})`);
      const lum = (r*299 + g*587 + b*114)/1000;
      setQuoteTextColor(lum < 128 ? "#FFF" : "#000");
    };
  }, [result?.albumImage]);

  // Accept / Reject
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
          albumImage: result.albumImage,
        }),
      });
    }
    clearAll();
  };
  const onReject = async () => {
    if (user && result) {
      const recentRef = doc(db, "RecentSongs", user.uid);
      await updateDoc(recentRef, {
        songs: arrayRemove({
          song: result.song,
          artist: result.artist,
          timestamp: result.timestamp || new Date().toISOString(), // safeguard
        }),
      });
    }
    clearAll();
  };

  const clearAll = () => {
    setShowForm(false);
    setShowChat(false);
    setShowGenerate(false);
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

  // Sign out
  const handleSignOut = async () => {
    await auth.signOut();
    navigate("/");
  };

  return (
    <div className="app-container flex bg-black text-white">
      {/* Left Sidebar */}
      <aside className="left-sidebar p-4 bg-gradient-to-b from-gray-900 to-gray-800 border-r border-gray-700 w-64 overflow-y-auto">
        {savedSongs.length > 0 && (
          <>
            <h2 className="text-lg font-bold mb-2">Accepted Thoughts</h2>
            <div className="space-y-2">
              {savedSongs.map((t, i) => (
                <div
                key={i}
                className="group flex items-center space-x-3 hover:bg-blue-800 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200"
                onClick={() => handleSavedClick(t)}
              >
                {t.albumImage && (
                  <img
                    src={t.albumImage}
                    alt={`${t.song} cover`}
                    className="w-10 h-10 rounded object-cover"
                  />
                )}
                <div className="flex-1 truncate">
                  <p className="text-sm font-semibold truncate group-hover:text-white">{t.song}</p>
                  <p className="text-xs text-gray-400 truncate group-hover:text-gray-200">{t.artist}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSavedSong(t);
                  }}
                  className="opacity-0 group-hover:opacity-100 ml-2 text-gray-400 hover:text-red-500 transition"
                >
                  <X size={16} />
                </button>
              </div>
              ))}
            </div>
            <hr className="border-gray-300 my-4" />
          </>
        )}

        <h2 className="text-lg font-bold mb-2">Recent Searches</h2>
        <div className="space-y-2">
          {recentSongs.map((t, i) => (
            <div
              key={`recent-${i}`}
              className="group flex items-center space-x-3 hover:bg-blue-700 px-2 py-1 rounded cursor-pointer"
            >
              {t.albumImage && (
                <img
                  src={t.albumImage}
                  alt={`${t.song} cover`}
                  className="w-10 h-10 rounded-sm object-cover"
                />
              )}
              <div className="flex-1 truncate">
                <p className="text-sm font-medium truncate group-hover:text-white">
                  {t.song}
                </p>
                <p className="text-xs text-gray-600 truncate group-hover:text-white">
                  {t.artist}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteRecentSong(t);
                }}
                className="opacity-0 group-hover:opacity-100 ml-2"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      </aside>

      <main
  className="main-content flex-1 overflow-y-auto"
  style={{
    background: result ? bgColor : "linear-gradient(to bottom, #1f2937, #111827)"
  }}
>
  {/* Déjà Tune Logo */}
  {!showGenerate && !showForm && !showChat && !result && (
    <div className="flex justify-center mt-8">
      <h1 className="text-5xl font-extrabold text-white drop-shadow-lg">
      Déjà Tune
      </h1>
    </div>
  )}
  {showGenerate ? (
    <GenerateTunes onDone={() => setShowGenerate(false)} />
  ) : result ? (
    <div
  className="music-widget p-6"
  style={{
    background: result ? bgColor : "rgba(17, 24, 39, 0.8)"
  }}
>
      {/* Cover Art */}
      <img
        src={result.albumImage}
        alt={result.song}
        className="music-widget__cover"
      />

      {/* Details & Controls */}
      <div className="music-widget__details">
        {/* Title / Artist Header */}
        <div className="music-widget__header">
          <div>
            <h2 className="music-widget__title">{result.song}</h2>
            <p className="music-widget__artist">{result.artist}</p>
          </div>
          {/* (Optional) your little preview + “+” button here */}
        </div>

        {/* Lyrics Quote */}
        {result.verse && (
          <blockquote
            className="mt-6 p-4 italic rounded-lg"
            style={{ color: quoteTextColor, background: "rgba(255,255,255,0.1)" }}
            dangerouslySetInnerHTML={{
              __html: result.verse.replace(/\*\*(.*?)\*\*/g, "<b><i>$1</i></b>"),
            }}
          />
        )}

<div className="music-widget__info-buttons flex space-x-4 mt-4">
  {/* Overview Button */}
  <div className="relative">
    <button
      onClick={() => {
        setShowOverviewDropdown(!showOverviewDropdown);
        setShowFunFactDropdown(false);
        setShowSongDetailsDropdown(false);
      }}
      className="music-widget__button"
    >
      Overview
    </button>
    {showOverviewDropdown && (
      <div className="music-widget__dropdown">{overview}</div>
    )}
  </div>

  {/* Fun Fact Button */}
  <div className="relative">
    <button
      onClick={() => {
        setShowFunFactDropdown(!showFunFactDropdown);
        setShowOverviewDropdown(false);
        setShowSongDetailsDropdown(false);
      }}
      className="music-widget__button"
    >
      Fun Fact
    </button>
    {showFunFactDropdown && (
      <div className="music-widget__dropdown">{funFact}</div>
    )}
  </div>

  {/* NEW: Song Details Button */}
  <div className="relative">
    <button
      onClick={() => {
        setShowSongDetailsDropdown(!showSongDetailsDropdown);
        setShowOverviewDropdown(false);
        setShowFunFactDropdown(false);
      }}
      className="music-widget__button"
    >
      Song Details
    </button>
    {showSongDetailsDropdown && result && (
      <div className="music-widget__dropdown space-y-2 text-sm">
        <p><b>Song:</b> {result.song}</p>
        <p><b>Album:</b> {result.albumName || "Unknown Album"}</p>
        <p><b>Year:</b> {result.releaseDate ? result.releaseDate.split("-")[0] : "Unknown"}</p>
      </div>
    )}
  </div>
</div>

        {/* Spotify Embed */}
        {result.spotifyId && (
          <div className="music-widget__spotify">
            <iframe
              title="Spotify preview"
              src={`https://open.spotify.com/embed/track/${result.spotifyId}`}
              allow="autoplay; encrypted-media"
              loading="lazy"
            />
          </div>
        )}

        {/* ACCEPT / REJECT ROW */}
        <div className="accept-reject">
          <button onClick={onAccept}>
            <Check size={28} />
          </button>
          <button onClick={onReject}>
            <X size={28} />
          </button>
          </div>     
      </div>
    </div>
  ) : (
    <>
      {/* initial “Think!” landing */}
      {!showForm && !showChat && !result && (
  <div className="think-view flex flex-col items-center justify-start mt-10 space-y-10">
    <button className="think-btn" onClick={() => setShowForm(true)}>
      Think!
    </button>
  </div>
)}


      {/* Think form */}
      {showForm && !showChat && !result && (
        <Think
          phrases={phrases}
          setPhrases={setPhrases}
          genre={genre}
          setGenre={setGenre}
          year={year}
          setYear={setYear}
          tone={tone}
          setTone={setTone}
          vibe={vibe}
          setVibe={setVibe}
          identifySong={identifySong}
          loading={loading}
          error={error}
        />
      )}

      {/* Chat w/ Déjà */}
      {showChat && !result && (
        <Deja
          conversation={conversation}
          currentQuestion={currentQuestion}
          options={options}
          inputValue={inputValue}
          setInputValue={setInputValue}
          handleSendInitial={handleSendInitial}
          handleOption={handleOption}
          loading={loading}
          error={error}
        />
      )}
    </>
  )}
</main>





      {/* Right Sidebar */}
<aside className="right-sidebar flex flex-col items-end space-y-4 p-4 bg-gradient-to-b from-gray-900 to-gray-800 border-l border-gray-700">
<div className="flex items-center space-x-4 mb-4">
  <Profile />
  <Disc3 className="h-12 w-12 text-white" />
</div>

  {!showChat && !showGenerate && (
    <>
      <button
        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all duration-300 text-white font-semibold"
        onClick={() => { clearAll(); setShowChat(true); }}
      >
        Chat w/ Déjà
      </button>

      <button
        className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all duration-300 text-white font-semibold"
        onClick={() => { clearAll(); setShowForm(true); }}
      >
        Think w/ Form
      </button>
    </>
  )}

  {!showGenerate ? (
    <button
      className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 rounded-lg transition-all duration-300 text-white font-semibold"
      onClick={() => { clearAll(); setShowGenerate(true); }}
    >
      Generate Tunes
    </button>
  ) : (
    <button
      className="w-full py-3 px-4 bg-gray-600 hover:bg-gray-700 rounded-lg transition-all duration-300 text-white font-semibold"
      onClick={() => setShowGenerate(false)}
    >
      Close Generator
    </button>
  )}
</aside>
    </div>
  );
};

export default Home;
