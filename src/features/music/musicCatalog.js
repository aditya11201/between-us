import { validateMusicCatalog } from "./musicModel.js";
import perfectAudio from "@/content/music/Ed Sheeran - Perfect.wasm?url";
import perfectArtwork from "@/content/music/Ed Sheeran - Perfect.webp";
import ordinaryAudio from "@/content/music/Alex Warren - Ordinary.wasm?url";
import ordinaryArtwork from "@/content/music/Alex Warren - Ordinary.webp";
import riskItAllAudio from "@/content/music/Bruno Mars - Risk It All.wasm?url";
import riskItAllArtwork from "@/content/music/Bruno Mars - Risk It All.webp";
import untilIFoundYouAudio from "@/content/music/Stephen Sanchez - Until I Found You.wasm?url";
import untilIFoundYouArtwork from "@/content/music/Stephen Sanchez - Until I Found You.webp";

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
  {
    id: "alex-warren-ordinary",
    title: "Ordinary",
    artist: "Alex Warren",
    album: "Single",
    genre: "Pop",
    src: ordinaryAudio,
    artwork: ordinaryArtwork,
    mimeType: "audio/mp4",
    explicit: false,
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
    explicit: false,
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
    explicit: false,
  },
];

export const MUSIC_CATALOG = validateMusicCatalog(catalog);
