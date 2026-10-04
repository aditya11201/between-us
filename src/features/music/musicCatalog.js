import { MY_SWEETENERS_TRACKS } from "./mySweeteners.js";
import { VIT_U_TRACKS } from "./vitU.js";
import { validateMusicCatalog } from "./musicModel.js";
import perfectAudio from "@/content/music/Ed Sheeran - Perfect.wasm?url";
import perfectArtwork from "@/content/music/Ed Sheeran - Perfect.webp";
import perfectLyrics from "@/content/music/ed-sheeran-perfect.lrc?raw";
import ordinaryAudio from "@/content/music/Alex Warren - Ordinary.wasm?url";
import ordinaryArtwork from "@/content/music/Alex Warren - Ordinary.webp";
import ordinaryLyrics from "@/content/music/alex-warren-ordinary.lrc?raw";
import riskItAllAudio from "@/content/music/Bruno Mars - Risk It All.wasm?url";
import riskItAllArtwork from "@/content/music/Bruno Mars - Risk It All.webp";
import riskItAllLyrics from "@/content/music/bruno-mars-risk-it-all.lrc?raw";
import untilIFoundYouAudio from "@/content/music/Stephen Sanchez - Until I Found You.wasm?url";
import untilIFoundYouArtwork from "@/content/music/Stephen Sanchez - Until I Found You.webp";
import untilIFoundYouLyrics from "@/content/music/stephen-sanchez-until-i-found-you.lrc?raw";
import manguAudio from "@/content/music/Fourtwnty - Mangu (Orchestral Cover).wasm?url";

const catalog = [
  {
    id: "ed-sheeran-perfect",
    title: "Perfect",
    artist: "Ed Sheeran",
    album: "Divide",
    genre: "Pop",
    src: perfectAudio,
    artwork: perfectArtwork,
    mimeType: "audio/mp4",
    lyrics: perfectLyrics,
    explicit: false,
    addedAt: "2026-08-02",
  },
  {
    id: "alex-warren-ordinary",
    title: "Ordinary",
    artist: "Alex Warren",
    album: "Single",
    genre: "Pop",
    src: ordinaryAudio,
    artwork: ordinaryArtwork,
    mimeType: "audio/mp4",
    lyrics: ordinaryLyrics,
    explicit: false,
    addedAt: "2026-09-12",
  },
  {
    id: "bruno-mars-risk-it-all",
    title: "Risk It All",
    artist: "Bruno Mars",
    album: "Single",
    genre: "Pop",
    src: riskItAllAudio,
    artwork: riskItAllArtwork,
    mimeType: "audio/mp4",
    lyrics: riskItAllLyrics,
    explicit: false,
    addedAt: "2026-09-20",
  },
  {
    id: "stephen-sanchez-until-i-found-you",
    title: "Until I Found You",
    artist: "Stephen Sanchez",
    album: "Single",
    genre: "Pop",
    src: untilIFoundYouAudio,
    artwork: untilIFoundYouArtwork,
    mimeType: "audio/mp4",
    lyrics: untilIFoundYouLyrics,
    explicit: false,
    addedAt: "2026-09-28",
  },
  {
    id: "fourtwnty-mangu-orchestral-cover",
    title: "Mangu (Orchestral Cover)",
    artist: "Fourtwnty",
    album: "Single",
    genre: "Instrumental",
    src: manguAudio,
    // ponytail: placeholder artwork until a dedicated cover exists
    artwork: perfectArtwork,
    mimeType: "audio/mp4",
    explicit: false,
    addedAt: "2026-09-30",
  },
];
export const MUSIC_CATALOG = validateMusicCatalog(catalog);

function toTemplateSong(track, collection) {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    album: track.album,
    genre: "",
    src: track.src ?? "",
    artwork: track.artwork ?? "",
    mimeType: "audio/mp4",
    explicit: track.explicit === true,
    addedAt: track.addedAt ?? "",
    duration: track.duration,
    collection,
  };
}

// ponytail: 84 empty templates. Fill src/artwork/addedAt per entry in
// mySweeteners.js / vitU.js as assets land; each becomes playable everywhere.
export const TEMPLATE_SONGS = [
  ...MY_SWEETENERS_TRACKS.map((track) => toTemplateSong(track, "My Sweeteners")),
  ...VIT_U_TRACKS.map((track) => toTemplateSong(track, "vit u")),
];
