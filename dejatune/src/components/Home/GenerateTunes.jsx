import React, { useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth, db } from "../../config/firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import './GenerateTunes.css';

export default function GenerateTunes({ onDone }) {
  const user = auth.currentUser;

  // Gemini + Spotify setup
  const apiKey = "AIzaSyCh75P7FsxwekKc8XoXvnVm62hrBKyplQQ";
  const [spotifyClientId] = useState("ffbb278d0ef74b07887f0643f073a745");
  const [spotifyClientSecret] = useState("64f2d31922fb401eab8325c800637ab7");
  const ai = new GoogleGenerativeAI(apiKey);
  const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });

  // form state
  const [genre, setGenre] = useState("");
  const [era, setEra] = useState("2000s");
  const [vibe, setVibe] = useState("");
  const [artists, setArtists] = useState([]);
  const [artistInput, setArtistInput] = useState("");
  const [numSongs, setNumSongs] = useState(5);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // fetch a Spotify token
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

  // fetch cover & metadata
  const fetchSpotifyDetails = async (song, artist) => {
    const token = await fetchSpotifyToken();
    const q = encodeURIComponent(`track:${song} artist:${artist}`);
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const track = (await res.json()).tracks.items[0];
    if (!track) return {};
    return {
      albumImage: track.album.images[0]?.url || "",
      albumName: track.album.name,
      releaseDate: track.album.release_date,
      spotifyId: track.id,
    };
  };

  const addArtist = () => {
    const name = artistInput.trim();
    if (!name) return;
    setArtists([...artists, name]);
    setArtistInput("");
  };

  const buildPrompt = () => `
You’re a personalized music curator.

TASK:
– Based on the following preferences, generate exactly ${numSongs} song recommendations.
– Output ONLY valid JSON: an array of objects with keys "song" and "artist".

PREFERENCES:
• Genre: ${genre || "Any"}
• Era: ${era}
• Vibe: ${vibe || "Any"}
• Favorite artists: ${artists.length ? artists.join(", ") : "None specified"}
  `.trim();

  const handleGenerate = async () => {
    if (!user) {
      setError("You must be logged in.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const raw = await (await model.generateContent(buildPrompt())).response.text();
      const json = raw.replace(/```json|```/g, "").trim();
      const recommendations = JSON.parse(json);

      const savedRef = doc(db, "SavedSongs", user.uid);
      for (const { song, artist } of recommendations) {
        const details = await fetchSpotifyDetails(song, artist);
        await updateDoc(savedRef, {
          songs: arrayUnion({
            song,
            artist,
            timestamp: new Date().toISOString(),
            albumImage: details.albumImage || "",
            albumName: details.albumName || "",
            releaseDate: details.releaseDate || "",
            spotifyId: details.spotifyId || "",
          }),
        });
      }

      onDone();
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="generate-tunes-container">
      <h2 className="title">Generate Tunes</h2>

      <div className="form-group">
        <label>Genre</label>
        <input
          type="text"
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          placeholder="e.g. Hip-Hop, Rock"
          className="input"
        />
      </div>

      <div className="form-group">
        <label>Era</label>
        <select
          value={era}
          onChange={(e) => setEra(e.target.value)}
          className="select"
        >
          <option>1950s</option>
          <option>1960s</option>
          <option>1970s</option>
          <option>1980s</option>
          <option>1990s</option>
          <option>2000s</option>
          <option>2010s</option>
          <option>2020s</option>
        </select>
      </div>

      <div className="form-group">
        <label>Vibe</label>
        <input
          type="text"
          value={vibe}
          onChange={(e) => setVibe(e.target.value)}
          placeholder="e.g. Chill, Energetic"
          className="input"
        />
      </div>

      <div className="form-group artists-group">
        <label>Favorite artists</label>
        <div className="artist-input-row">
          <input
            type="text"
            value={artistInput}
            onChange={(e) => setArtistInput(e.target.value)}
            placeholder="Artist name"
            className="input"
          />
          <button type="button" onClick={addArtist} className="btn add-btn">
            Add
          </button>
        </div>
        <div className="artists-list">
          {artists.map((a, i) => (
            <span key={i} className="artist-chip">
              {a}
            </span>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Number of songs</label>
        <input
          type="number"
          min={1}
          max={20}
          value={numSongs}
          onChange={(e) => setNumSongs(Number(e.target.value))}
          className="input small-input"
        />
      </div>

      {error && <p className="error-text">{error}</p>}

      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="btn generate-btn"
      >
        {loading ? "Generating…" : "Generate"}
      </button>
    </div>
  );
}