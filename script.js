/* =====================================================
   AI DJ MIXER
===================================================== */

const decks = {
  A: {
    source: null,
    file: null,
    audio: null,
    appleSong: null,
    gain: 1,
    filter: 50
  },

  B: {
    source: null,
    file: null,
    audio: null,
    appleSong: null,
    gain: 1,
    filter: 50
  }
};

let activeAppleDeck = null;
let music = null;
let appleSongs = [];


/* =====================================================
   APPLE MUSIC
===================================================== */

async function connectAppleMusic() {

  try {

    if (!window.MusicKit) {
      toast("Apple Music wird noch geladen.");
      return;
    }

    if (!music) {
      music = MusicKit.getInstance();
    }

    if (!music.isAuthorized) {
      await music.authorize();
    }

    document.getElementById("appleStatus").textContent =
      "Verbunden mit deiner Apple-Music-Mediathek";

    document.querySelector(".apple-connect").textContent =
      "Verbunden ✓";

    document.getElementById("appleLibrary")
      .classList.remove("hidden");

    await loadAppleLibrary();

  } catch(error) {

    console.error(error);

    toast(
      "Apple Music konnte nicht verbunden werden."
    );

  }

}


/* =====================================================
   APPLE LIBRARY LADEN
===================================================== */

async function loadAppleLibrary() {

  if (!music) return;

  try {

    const result =
      await music.api.library.songs({
        limit: 100,
        offset: 0
      });

    appleSongs = result.data || [];

    renderAppleSongs(appleSongs);

  } catch(error) {

    console.error(error);

    toast(
      "Deine Apple-Music-Mediathek konnte nicht geladen werden."
    );

  }

}


/* =====================================================
   APPLE SONGS RENDERN
===================================================== */

function renderAppleSongs(songs) {

  const container =
    document.getElementById("appleSongs");

  if (!songs.length) {

    container.innerHTML = `
      <div class="empty">
        Keine Songs gefunden.
      </div>
    `;

    return;
  }

  container.innerHTML = songs.map((song, index) => {

    const title =
      song.attributes?.name || "Unbekannter Titel";

    const artist =
      song.attributes?.artistName || "Unbekannter Künstler";

    let artwork = "";

    if (song.attributes?.artwork?.url) {

      artwork =
        song.attributes.artwork.url
          .replace("{w}", "100")
          .replace("{h}", "100");
    }

    return `
      <div class="song-row">

        ${
          artwork
          ?
          `<img class="song-art" src="${artwork}">`
          :
          `<div class="song-art">🎵</div>`
        }

        <div class="song-info">

          <div class="song-name">
            ${escapeHtml(title)}
          </div>

          <div class="song-artist">
            ${escapeHtml(artist)}
          </div>

        </div>

        <div class="song-actions">

          <button onclick="loadAppleSong('A', ${index})">
            A
          </button>

          <button onclick="loadAppleSong('B', ${index})">
            B
          </button>

        </div>

      </div>
    `;

  }).join("");

}


/* =====================================================
   APPLE SUCHEN
===================================================== */

function searchAppleLibrary() {

  const input =
    document.getElementById("appleSearch");

  const search =
    input.value.toLowerCase().trim();

  if (!search) {

    renderAppleSongs(appleSongs);

    return;
  }

  const filtered =
    appleSongs.filter(song => {

      const title =
        song.attributes?.name?.toLowerCase() || "";

      const artist =
        song.attributes?.artistName?.toLowerCase() || "";

      const album =
        song.attributes?.albumName?.toLowerCase() || "";

      return (
        title.includes(search) ||
        artist.includes(search) ||
        album.includes(search)
      );

    });

  renderAppleSongs(filtered);

}


/* =====================================================
   APPLE SONG AUF DECK LADEN
===================================================== */

async function loadAppleSong(deckId, index) {

  const song = appleSongs[index];

  if (!song) return;

  activeAppleDeck = deckId;

  decks[deckId].source = "apple";
  decks[deckId].appleSong = song;

  const title =
    song.attributes?.name || "Unbekannter Titel";

  const artist =
    song.attributes?.artistName || "Unbekannter Künstler";

  const artwork =
    song.attributes?.artwork?.url
      ?.replace("{w}", "600")
      ?.replace("{h}", "600");

  document.getElementById(
    `deck${deckId}Title`
  ).textContent = title;

  document.getElementById(
    `deck${deckId}Artist`
  ).textContent = artist;

  document.getElementById(
    `deck${deckId}Source`
  ).textContent = "🍎 Apple Music";

  const art =
    document.getElementById(`deck${deckId}Art`);

  if (artwork) {

    art.style.backgroundImage =
      `url("${artwork}")`;

    art.textContent = "";

  } else {

    art.style.backgroundImage = "";
    art.textContent = "🎵";

  }

  /*
    Apple Music Web besitzt einen gemeinsamen
    MusicKit-Player.

    Deshalb wird hier die Apple-Music-Wiedergabe
    über MusicKit gesteuert.
  */

  try {

    await music.setQueue({
      song: song.id
    });

    await music.play();

    document.getElementById(
      `play${deckId}`
    ).textContent = "⏸";

    updateDJStatus(
      `${title} läuft über Apple Music`
    );

  } catch(error) {

    console.error(error);

    toast(
      "Song konnte nicht gestartet werden."
    );

  }

}


/* =====================================================
   APPLE BUTTON
===================================================== */

async function openAppleForDeck(deckId) {

  activeAppleDeck = deckId;

  if (!music || !music.isAuthorized) {

    await connectAppleMusic();

  }

  document.getElementById("appleLibrary")
    .classList.remove("hidden");

  document.getElementById("appleLibrary")
    .scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

}


/* =====================================================
   DATEI AUF DECK
===================================================== */

function loadFileToDeck(deckId, file) {

  if (!file) return;

  const deck = decks[deckId];

  if (deck.audio) {

    deck.audio.pause();

    URL.revokeObjectURL(
      deck.audio.src
    );

  }

  const url =
    URL.createObjectURL(file);

  const audio =
    new Audio(url);

  audio.preload = "metadata";

  deck.source = "file";
  deck.file = file;
  deck.audio = audio;
  deck.appleSong = null;

  document.getElementById(
    `deck${deckId}Title`
  ).textContent =
    file.name.replace(/\.[^/.]+$/, "");

  document.getElementById(
    `deck${deckId}Artist`
  ).textContent =
    "Lokale Musikdatei";

  document.getElementById(
    `deck${deckId}Source`
  ).textContent =
    "📁 Datei";

  document.getElementById(
    `deck${deckId}Art`
  ).style.backgroundImage = "";

  document.getElementById(
    `deck${deckId}Art`
  ).textContent = "🎵";

  audio.addEventListener(
    "loadedmetadata",
    () => {

      document.getElementById(
        `time${deckId}Duration`
      ).textContent =
        formatTime(audio.duration);

    }
  );

  audio.addEventListener(
    "timeupdate",
    () => {

      if (!audio.duration) return;

      const progress =
        audio.currentTime /
        audio.duration *
        100;

      document.getElementById(
        `progress${deckId}`
      ).value = progress;

      document.getElementById(
        `time${deckId}Current`
      ).textContent =
        formatTime(audio.currentTime);

    }
  );

  audio.addEventListener(
    "ended",
    () => {

      document.getElementById(
        `play${deckId}`
      ).textContent = "▶";

    }
  );

  toast(
    `${file.name} auf Deck ${deckId} geladen`
  );

}


/* =====================================================
   PLAY / PAUSE
===================================================== */

async function deckPlay(deckId) {

  const deck = decks[deckId];

  /*
    APPLE MUSIC
  */

  if (deck.source === "apple") {

    if (!music) return;

    if (music.isPlaying) {

      music.pause();

      document.getElementById(
        `play${deckId}`
      ).textContent = "▶";

    } else {

      music.play();

      document.getElementById(
        `play${deckId}`
      ).textContent = "⏸";

    }

    return;
  }


  /*
    LOKALE DATEI
  */

  if (!deck.audio) {

    toast(
      `Bitte zuerst eine Musikquelle für Deck ${deckId} auswählen.`
    );

    return;
  }

  if (deck.audio.paused) {

    try {

      await deck.audio.play();

      document.getElementById(
        `play${deckId}`
      ).textContent = "⏸";

    } catch(error) {

      console.error(error);

    }

  } else {

    deck.audio.pause();

    document.getElementById(
      `play${deckId}`
    ).textContent = "▶";

  }

}


/* =====================================================
   CUE
===================================================== */

function deckCue(deckId) {

  const deck = decks[deckId];

  if (
    deck.source === "file" &&
    deck.audio
  ) {

    deck.audio.currentTime = 0;

  }

  if (
    deck.source === "apple" &&
    music
  ) {

    music.seekToTime(0);

  }

}


/* =====================================================
   SEEK
===================================================== */

function seekDeck(deckId, value) {

  const deck = decks[deckId];

  if (
    deck.source === "file" &&
    deck.audio &&
    deck.audio.duration
  ) {

    deck.audio.currentTime =
      deck.audio.duration *
      (value / 100);

  }

  if (
    deck.source === "apple" &&
    music &&
    music.currentPlaybackDuration
  ) {

    music.seekToTime(
      music.currentPlaybackDuration *
      (value / 100)
    );

  }

}


/* =====================================================
   PREVIOUS / NEXT
===================================================== */

async function deckNext(deckId) {

  const deck = decks[deckId];

  if (
    deck.source === "apple" &&
    music
  ) {

    await music.skipToNextItem();

  }

}

async function deckPrevious(deckId) {

  const deck = decks[deckId];

  if (
    deck.source === "apple" &&
    music
  ) {

    await music.skipToPreviousItem();

  }

}


/* =====================================================
   GAIN
===================================================== */

function deckGain(deckId, value) {

  const gain =
    Number(value) / 100;

  decks[deckId].gain = gain;

  if (
    decks[deckId].source === "file" &&
    decks[deckId].audio
  ) {

    decks[deckId].audio.volume =
      Math.max(
        0,
        Math.min(1, gain)
      );

  }

}


/* =====================================================
   FILTER
===================================================== */

function deckFilter(deckId, value) {

  decks[deckId].filter =
    Number(value);

  /*
    Für lokale Dateien kann später
    Web Audio API eingebaut werden.

    Apple-Music-Playback wird bewusst
    nicht als MP3/Audio-Blob abgegriffen.
  */

}


/* =====================================================
   CROSS FADER
===================================================== */

function crossfade(value) {

  value = Number(value);

  const a =
    Math.cos(
      (value / 100) *
      Math.PI / 2
    );

  const b =
    Math.cos(
      ((100 - value) / 100) *
      Math.PI / 2
    );

  /*
    Lokale Dateien
  */

  if (
    decks.A.audio &&
    decks.A.source === "file"
  ) {

    decks.A.audio.volume =
      Math.min(
        1,
        a * decks.A.gain
      );

  }

  if (
    decks.B.audio &&
    decks.B.source === "file"
  ) {

    decks.B.audio.volume =
      Math.min(
        1,
        b * decks.B.gain
      );

  }

}


/* =====================================================
   AI OPTIONS
===================================================== */

function toggleAI(button) {

  button.classList.toggle("active");

}


/* =====================================================
   STATUS
===================================================== */

function updateDJStatus(text) {

  const el =
    document.getElementById("djStatus");

  if (el) {
    el.textContent = "● " + text;
  }

}


/* =====================================================
   FORMAT TIME
===================================================== */

function formatTime(seconds) {

  if (!seconds || !isFinite(seconds)) {
    return "0:00";
  }

  const minutes =
    Math.floor(seconds / 60);

  const secs =
    Math.floor(seconds % 60);

  return (
    minutes +
    ":" +
    String(secs).padStart(2, "0")
  );

}


/* =====================================================
   HTML SICHER AUSGEBEN
===================================================== */

function escapeHtml(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


/* =====================================================
   APPLE MUSIC EVENTS
===================================================== */

document.addEventListener(
  "musickitloaded",
  async () => {

    console.log(
      "MusicKit wurde geladen."
    );

    /*
      DEIN DEVELOPER TOKEN HIER NICHT
      direkt öffentlich veröffentlichen.

      Beispiel:

      await MusicKit.configure({
        developerToken: "DEIN_TOKEN",
        app: {
          name: "Smart Remote",
          build: "1.0.0"
        }
      });

    */

  }
);