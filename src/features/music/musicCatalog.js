import { validateMusicCatalog } from "./musicModel.js";
import perfectAudio from "@/content/music/Ed Sheeran - Perfect.wasm?url";
import perfectArtwork from "@/content/music/Ed Sheeran - Perfect.webp";

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
    explicit: false,
  },
];

export const MUSIC_CATALOG = validateMusicCatalog(catalog);
