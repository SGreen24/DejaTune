// src/pages/GenerateTunes.jsx

import React, { useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth, db } from "../../config/firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";

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
    <div className="p-6 bg-white rounded-lg shadow-md space-y-4">
      <h2 className="text-xl font-bold">Generate Tunes</h2>

      <div className="space-y-4">
        <label className="block">
          Genre
          <input
            type="text"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            placeholder="e.g. Hip-Hop, Rock"
            className="w-full mt-1 p-2 border rounded"
          />
        </label>

        <label className="block">
          Era
          <select
            value={era}
            onChange={(e) => setEra(e.target.value)}
            className="w-full mt-1 p-2 border rounded"
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
        </label>

        <label className="block">
          Vibe
          <input
            type="text"
            value={vibe}
            onChange={(e) => setVibe(e.target.value)}
            placeholder="e.g. Chill, Energetic"
            className="w-full mt-1 p-2 border rounded"
          />
        </label>

        <div>
          <p className="mb-1">Favorite artists</p>
          <div className="flex space-x-2">
            <input
              type="text"
              value={artistInput}
              onChange={(e) => setArtistInput(e.target.value)}
              placeholder="Artist name"
              className="flex-1 p-2 border rounded"
            />
            <button
              type="button"
              onClick={addArtist}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Add Artist
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {artists.map((a, i) => (
              <span key={i} className="text-sm px-2 py-1 bg-gray-200 rounded-full">
                {a}
              </span>
            ))}
          </div>
        </div>

        <label className="block">
          Number of songs
          <input
            type="number"
            min={1}
            max={20}
            value={numSongs}
            onChange={(e) => setNumSongs(Number(e.target.value))}
            className="w-24 mt-1 p-2 border rounded"
          />
        </label>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? "Generating…" : "Generate"}
      </button>
    </div>
  );
}
