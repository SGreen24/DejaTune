import React from "react";

const Think = ({
  phrases,
  setPhrases,
  genre,
  setGenre,
  year,
  setYear,
  tone,
  setTone,
  vibe,
  setVibe,
  identifySong,
  loading,
  error,
}) => (
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
);

export default Think;
