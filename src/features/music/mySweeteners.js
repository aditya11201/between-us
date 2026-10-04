// Template placeholders: tracks without audio yet — fill `src` (and
// `artwork`/`addedAt`) per song as assets land under src/content/music.
// Drop-in asset contract:
// - Album cover: src/content/music/My Sweeteners.webp
// - Per-track audio: src/content/music/My Sweeteners/<NN> - <Artist> - <Title>.wasm (mp4)
// - Per-track artwork: src/content/music/My Sweeteners/<NN> - <Artist> - <Title>.webp
// - Wire into musicCatalog.js later; reuse the ids below as catalog ids.
export const MY_SWEETENERS_ALBUM = {
  id: "my-sweeteners",
  title: "My Sweeteners",
  spotifyUrl: "https://open.spotify.com/playlist/102WG5C4Ohu8j3mQ81vM9E",
  description:
    "This playlist is a timeline of my heart. Every song marks exactly what I felt for you in that moment. If you ever wonder how I felt, just look at the date, press play, and listen.",
};

export const MY_SWEETENERS_TRACKS = [
  { id: "my-sweeteners-01-dadi-siji", src: "", artwork: "", addedAt: "", title: "Dadi Siji", artist: "Restianade, Surepman", album: "Dadi Siji", duration: "3:50", explicit: false },
  { id: "my-sweeteners-02-cundamani", src: "", artwork: "", addedAt: "", title: "Cundamani", artist: "Restianade", album: "Cundamani", duration: "4:17", explicit: false },
  { id: "my-sweeteners-03-tresno-tekan-mati-akustik", src: "", artwork: "", addedAt: "", title: "Tresno Tekan Mati - Akustik", artist: "Restianade", album: "Tresno Tekan Mati (Akustik)", duration: "4:50", explicit: false },
  { id: "my-sweeteners-04-tanpo-hubungan", src: "", artwork: "", addedAt: "", title: "Tanpo Hubungan", artist: "La Tasya, Rei Vania", album: "Tanpo Hubungan", duration: "4:56", explicit: false },
  { id: "my-sweeteners-05-hts", src: "", artwork: "", addedAt: "", title: "HTS", artist: "Lavora", album: "HTS", duration: "4:15", explicit: false },
  { id: "my-sweeteners-06-konco-mesra", src: "", artwork: "", addedAt: "", title: "Konco Mesra", artist: "NOK YEKA", album: "Konco Mesra", duration: "5:08", explicit: false },
  { id: "my-sweeteners-07-cinta-terbaik", src: "", artwork: "", addedAt: "", title: "Cinta Terbaik", artist: "Cassandra", album: "Cinta Terbaik", duration: "4:01", explicit: false },
  { id: "my-sweeteners-08-cinta-dan-benci", src: "", artwork: "", addedAt: "", title: "Cinta Dan Benci", artist: "Geisha", album: "Meraih Bintang", duration: "4:12", explicit: false },
  { id: "my-sweeteners-09-cinta-dalam-hati", src: "", artwork: "", addedAt: "", title: "Cinta Dalam Hati", artist: "Ungu", album: "Untukmu Selamanya", duration: "4:43", explicit: false },
  { id: "my-sweeteners-10-lumpuhkan-ingatanku", src: "", artwork: "", addedAt: "", title: "Lumpuhkan Ingatanku", artist: "Geisha", album: "Seleksi Hits", duration: "4:17", explicit: false },
  { id: "my-sweeteners-11-tentang-rasa", src: "", artwork: "", addedAt: "", title: "Tentang Rasa", artist: "Astrid", album: "Lihat Aku Sekarang", duration: "4:11", explicit: false },
  { id: "my-sweeteners-12-jikalau-kau-cinta", src: "", artwork: "", addedAt: "", title: "Jikalau Kau Cinta", artist: "Judika", album: "Judika", duration: "4:02", explicit: false },
  { id: "my-sweeteners-13-munajat-cinta", src: "", artwork: "", addedAt: "", title: "Munajat Cinta", artist: "The Rock", album: "Master Mister Ahmad Dhani", duration: "3:44", explicit: false },
  { id: "my-sweeteners-14-suara-ku-berharap", src: "", artwork: "", addedAt: "", title: "Suara (Ku Berharap)", artist: "Hijau Daun", album: "Ikuti Cahaya", duration: "3:56", explicit: false },
  { id: "my-sweeteners-15-pupus", src: "", artwork: "", addedAt: "", title: "Pupus", artist: "Dewa", album: "Cintailah Cinta", duration: "5:05", explicit: false },
  { id: "my-sweeteners-16-tak-lagi-sama", src: "", artwork: "", addedAt: "", title: "Tak Lagi Sama", artist: "Noah", album: "Seperti Seharusnya", duration: "5:15", explicit: false },
  { id: "my-sweeteners-17-semakin-ku-kejar", src: "", artwork: "", addedAt: "", title: "Semakin Ku Kejar Semakin Kau Jauh", artist: "Five Minutes", album: "Semua Ini Sendiri", duration: "4:15", explicit: false },
  { id: "my-sweeteners-18-gantung", src: "", artwork: "", addedAt: "", title: "Gantung", artist: "Melly Goeslaw", album: "Mindnsoul", duration: "3:45", explicit: false },
  { id: "my-sweeteners-19-cobalah-mengerti", src: "", artwork: "", addedAt: "", title: "Cobalah Mengerti", artist: "Ariel NOAH, Uki, Lukman, Reza, David", album: "Suara Lainnya", duration: "5:04", explicit: false },
  { id: "my-sweeteners-20-semua-tentang-kita", src: "", artwork: "", addedAt: "", title: "Semua Tentang Kita", artist: "Peterpan", album: "Taman Langit", duration: "4:25", explicit: false },
  { id: "my-sweeteners-21-the-reason", src: "", artwork: "", addedAt: "", title: "The Reason", artist: "Hoobastank", album: "00's Rock", duration: "3:52", explicit: false },
  { id: "my-sweeteners-22-afterglow", src: "", artwork: "", addedAt: "", title: "Afterglow", artist: "Taylor Swift", album: "Lover", duration: "3:43", explicit: false },
  { id: "my-sweeteners-23-back-to-december", src: "", artwork: "", addedAt: "", title: "Back To December", artist: "Taylor Swift", album: "Speak Now", duration: "4:53", explicit: false },
  { id: "my-sweeteners-24-i-hate-u-i-love-u", src: "", artwork: "", addedAt: "", title: "i hate u, i love u (feat. olivia o'brien)", artist: "gnash, Olivia O'Brien", album: "us", duration: "4:11", explicit: true },
  { id: "my-sweeteners-25-aku-yang-jatuh-cinta", src: "", artwork: "", addedAt: "", title: "Aku Yang Jatuh Cinta", artist: "Dudy Oris", album: "Aku Yang Jatuh Cinta", duration: "3:16", explicit: false },
  { id: "my-sweeteners-26-casual", src: "", artwork: "", addedAt: "", title: "Casual", artist: "Chappell Roan", album: "The Rise and Fall of a Midwest Princess", duration: "3:52", explicit: true },
  { id: "my-sweeteners-27-the-less-i-know-the-better", src: "", artwork: "", addedAt: "", title: "The Less I Know The Better", artist: "Tame Impala", album: "Currents", duration: "3:36", explicit: true },
  { id: "my-sweeteners-28-just-a-friend-to-you", src: "", artwork: "", addedAt: "", title: "Just a Friend to You", artist: "Meghan Trainor", album: "Thank You (Deluxe)", duration: "2:44", explicit: false },
  { id: "my-sweeteners-29-say-you-love-me", src: "", artwork: "", addedAt: "", title: "Say You Love Me", artist: "Jessie Ware", album: "Tough Love (Deluxe)", duration: "4:17", explicit: false },
  { id: "my-sweeteners-30-i-wont-give-up", src: "", artwork: "", addedAt: "", title: "I Won't Give Up", artist: "Jason Mraz", album: "Love Is a Four Letter Word", duration: "4:00", explicit: false },
  { id: "my-sweeteners-31-fight-for-this-love", src: "", artwork: "", addedAt: "", title: "Fight For This Love", artist: "Cheryl", album: "3 Words", duration: "3:43", explicit: false },
  { id: "my-sweeteners-32-the-archer", src: "", artwork: "", addedAt: "", title: "The Archer", artist: "Taylor Swift", album: "Lover", duration: "3:31", explicit: false },
  { id: "my-sweeteners-33-i-wanna-get-better", src: "", artwork: "", addedAt: "", title: "I Wanna Get Better", artist: "Bleachers", album: "Strange Desire", duration: "3:24", explicit: false },
  { id: "my-sweeteners-34-take-a-chance-with-me", src: "", artwork: "", addedAt: "", title: "Take A Chance With Me", artist: "NIKI", album: "Nicole", duration: "5:03", explicit: false },
];
