// Template placeholders: tracks without audio yet — fill `src` (and
// `artwork`/`addedAt`) per song as assets land under src/content/music.
// Drop-in asset contract:
// - Album cover: src/content/music/vit u.webp
// - Per-track audio: src/content/music/vit u/<NN> - <Artist> - <Title>.wasm (mp4)
// - Per-track artwork: src/content/music/vit u/<NN> - <Artist> - <Title>.webp
// - Wire into musicCatalog.js later; reuse the ids below as catalog ids.
// Source: private "vit u" playlist (pupipu and Ramadhan, 50 songs, about 3 hr).
// Album cells truncated by the Spotify UI were resolved to full names via web search.
export const VIT_U_PLAYLIST = {
  id: "vit-u",
  title: "vit u",
  spotifyUrl: "https://open.spotify.com/playlist/0o45Hi4AIm48q2Y66aCxYJ",
  description: "Private Playlist by pupipu and Ramadhan · 50 songs, about 3 hr",
};

export const VIT_U_TRACKS = [
  { id: "vit-u-01-drop-dead", src: "", artwork: "", addedAt: "", title: "drop dead", artist: "Olivia Rodrigo", album: "drop dead (taken that eurostar to france)", duration: "3:44", explicit: false },
  { id: "vit-u-02-about-you", src: "", artwork: "", addedAt: "", title: "About You", artist: "The 1975", album: "Being Funny In A Foreign Language", duration: "5:26", explicit: false },
  { id: "vit-u-03-the-night-we-met", src: "", artwork: "", addedAt: "", title: "The Night We Met", artist: "Lord Huron", album: "Strange Trails", duration: "3:28", explicit: false },
  { id: "vit-u-04-anything-you-want", src: "", artwork: "", addedAt: "", title: "Anything You Want", artist: "Reality Club", album: "Reality Club Presents…", duration: "3:56", explicit: false },
  { id: "vit-u-05-is-there-someone-else", src: "", artwork: "", addedAt: "", title: "Is There Someone Else?", artist: "The Weeknd", album: "Dawn FM", duration: "3:19", explicit: false },
  { id: "vit-u-06-creepin", src: "", artwork: "", addedAt: "", title: "Creepin' (with The Weeknd & 21 Savage)", artist: "Metro Boomin, The Weeknd, 21 Savage", album: "HEROES & VILLAINS", duration: "3:41", explicit: true },
  { id: "vit-u-07-back-to-friends", src: "", artwork: "", addedAt: "", title: "back to friends", artist: "sombr", album: "back to friends", duration: "3:19", explicit: false },
  { id: "vit-u-08-sweet", src: "", artwork: "", addedAt: "", title: "Sweet", artist: "Cigarettes After Sex", album: "Cigarettes After Sex", duration: "4:52", explicit: false },
  { id: "vit-u-09-cry", src: "", artwork: "", addedAt: "", title: "Cry", artist: "Cigarettes After Sex", album: "Cry", duration: "4:16", explicit: false },
  { id: "vit-u-10-adore-you", src: "", artwork: "", addedAt: "", title: "Adore You", artist: "Harry Styles", album: "Fine Line", duration: "3:27", explicit: false },
  { id: "vit-u-11-just-a-friend-to-you", src: "", artwork: "", addedAt: "", title: "Just a Friend to You", artist: "Meghan Trainor", album: "Thank You (Deluxe Version)", duration: "2:44", explicit: false },
  { id: "vit-u-12-you-belong-with-me-taylors-version", src: "", artwork: "", addedAt: "", title: "You Belong With Me (Taylor's Version)", artist: "Taylor Swift", album: "Fearless (Taylor's Version)", duration: "3:51", explicit: false },
  { id: "vit-u-13-best-friend", src: "", artwork: "", addedAt: "", title: "Best Friend", artist: "Rex Orange County", album: "Best Friend", duration: "4:22", explicit: true },
  { id: "vit-u-14-risalah-hati", src: "", artwork: "", addedAt: "", title: "Risalah Hati", artist: "Dewa", album: "Bintang Lima", duration: "4:52", explicit: false },
  { id: "vit-u-15-strawberries-and-cigarettes", src: "", artwork: "", addedAt: "", title: "Strawberries & Cigarettes", artist: "Troye Sivan", album: "Strawberries & Cigarettes", duration: "3:21", explicit: false },
  { id: "vit-u-16-wicked-games", src: "", artwork: "", addedAt: "", title: "Wicked Games", artist: "Kiana Ledé", album: "Selfless", duration: "3:01", explicit: true },
  { id: "vit-u-17-there-is-a-light-that-never-goes-out", src: "", artwork: "", addedAt: "", title: "There Is a Light That Never Goes Out", artist: "The Smiths", album: "The Queen Is Dead", duration: "4:04", explicit: false },
  { id: "vit-u-18-please-please-please-let-me-get-what-i-want", src: "", artwork: "", addedAt: "", title: "Please, Please, Please, Let Me Get What I Want", artist: "The Smiths", album: "Hatful of Hollow", duration: "1:52", explicit: false },
  { id: "vit-u-19-yellow", src: "", artwork: "", addedAt: "", title: "Yellow", artist: "Coldplay", album: "Parachutes", duration: "4:26", explicit: false },
  { id: "vit-u-20-better", src: "", artwork: "", addedAt: "", title: "Better", artist: "Khalid", album: "Suncity", duration: "3:49", explicit: false },
  { id: "vit-u-21-friends", src: "", artwork: "", addedAt: "", title: "Friends", artist: "Chase Atlantic", album: "Nostalgia", duration: "3:50", explicit: false },
  { id: "vit-u-22-we-fell-in-love-in-october", src: "", artwork: "", addedAt: "", title: "we fell in love in october", artist: "girl in red", album: "we fell in love in october", duration: "3:04", explicit: false },
  { id: "vit-u-23-sweater-weather", src: "", artwork: "", addedAt: "", title: "Sweater Weather", artist: "The Neighbourhood", album: "I Love You.", duration: "4:00", explicit: false },
  { id: "vit-u-24-sparks", src: "", artwork: "", addedAt: "", title: "Sparks", artist: "Coldplay", album: "Parachutes", duration: "3:47", explicit: false },
  { id: "vit-u-25-those-eyes", src: "", artwork: "", addedAt: "", title: "Those Eyes", artist: "New West", album: "Based On A True Story…", duration: "3:40", explicit: false },
  { id: "vit-u-26-favorite-crime", src: "", artwork: "", addedAt: "", title: "favorite crime", artist: "Olivia Rodrigo", album: "SOUR", duration: "2:32", explicit: false },
  { id: "vit-u-27-understand", src: "", artwork: "", addedAt: "", title: "UNDERSTAND", artist: "keshi", album: "GABRIEL", duration: "2:30", explicit: false },
  { id: "vit-u-28-like-or-like-like", src: "", artwork: "", addedAt: "", title: "Like or Like Like", artist: "Miniature Tigers", album: "Tell It to the Volcano", duration: "2:38", explicit: false },
  { id: "vit-u-29-i-love-you-but-im-letting-go", src: "", artwork: "", addedAt: "", title: "I Love You but I'm Letting Go", artist: "Pamungkas", album: "Walk the Talk", duration: "3:40", explicit: false },
  { id: "vit-u-30-somebody-else", src: "", artwork: "", addedAt: "", title: "Somebody Else", artist: "The 1975", album: "I like it when you sleep, for you are so beautiful yet so unaware of it", duration: "5:47", explicit: true },
  { id: "vit-u-31-the-one-that-got-away", src: "", artwork: "", addedAt: "", title: "The One That Got Away", artist: "Katy Perry", album: "Teenage Dream: The Complete Confection", duration: "3:47", explicit: false },
  { id: "vit-u-32-atlantis", src: "", artwork: "", addedAt: "", title: "Atlantis", artist: "Seafret", album: "Tell Me It's Real (Expanded)", duration: "3:49", explicit: false },
  { id: "vit-u-33-you-are-not-alone", src: "", artwork: "", addedAt: "", title: "You Are Not Alone", artist: "Michael Jackson", album: "HIStory - PAST, PRESENT AND FUTURE - BOOK I", duration: "5:44", explicit: false },
  { id: "vit-u-34-cause-you-have-to", src: "", artwork: "", addedAt: "", title: "'Cause You Have To", artist: "LANY", album: "a beautiful blur", duration: "4:10", explicit: false },
  { id: "vit-u-35-i-dont-trust-myself-with-loving-you", src: "", artwork: "", addedAt: "", title: "I Don't Trust Myself (With Loving You)", artist: "John Mayer", album: "Continuum", duration: "4:52", explicit: false },
  { id: "vit-u-36-lose", src: "", artwork: "", addedAt: "", title: "Lose", artist: "NIKI", album: "MOONCHILD", duration: "4:16", explicit: true },
  { id: "vit-u-37-please-dont-say-you-love-me", src: "", artwork: "", addedAt: "", title: "Please Don't Say You Love Me", artist: "Gabrielle Aplin", album: "English Rain", duration: "3:01", explicit: false },
  { id: "vit-u-38-touch", src: "", artwork: "", addedAt: "", title: "Touch", artist: "Cigarettes After Sex", album: "Cry", duration: "4:52", explicit: false },
  { id: "vit-u-39-pastikan-riuh-akhiri-malamu", src: "", artwork: "", addedAt: "", title: "Pastikan Riuh Akhiri Malammu", artist: "Perunggu", album: "Memorandum", duration: "4:12", explicit: false },
  { id: "vit-u-40-haru-paling-biru", src: "", artwork: "", addedAt: "", title: "Haru Paling Biru", artist: "Perunggu", album: "Memorandum", duration: "4:50", explicit: false },
  { id: "vit-u-41-honeybee", src: "", artwork: "", addedAt: "", title: "honeybee", artist: "Olivia Rodrigo", album: "you seem pretty sad for a girl so in love", duration: "3:43", explicit: false },
  { id: "vit-u-42-the-cure", src: "", artwork: "", addedAt: "", title: "the cure", artist: "Olivia Rodrigo", album: "the cure", duration: "4:57", explicit: true },
  { id: "vit-u-43-less", src: "", artwork: "", addedAt: "", title: "less", artist: "Olivia Rodrigo", album: "you seem pretty sad for a girl so in love", duration: "3:13", explicit: false },
  { id: "vit-u-44-stop-waiting", src: "", artwork: "", addedAt: "", title: "Stop Waiting", artist: "Cigarettes After Sex", album: "Bubblegum", duration: "6:02", explicit: false },
  { id: "vit-u-45-i-dont-want-to-miss-a-thing", src: "", artwork: "", addedAt: "", title: "I Don't Want To Miss A Thing - From the Touchstone film, \"Armageddon\"", artist: "Aerosmith", album: "I Don't Want To Miss A Thing - From the Touchstone film, \"Armageddon\"", duration: "4:59", explicit: false },
  { id: "vit-u-46-merry-christmas-please-dont-call", src: "", artwork: "", addedAt: "", title: "Merry Christmas, Please Don't Call", artist: "Bleachers", album: "Merry Christmas, Please Don't Call", duration: "3:22", explicit: false },
  { id: "vit-u-47-all-too-well-sad-girl-autumn-version", src: "", artwork: "", addedAt: "", title: "All Too Well (Sad Girl Autumn Version)", artist: "Taylor Swift", album: "All Too Well (Sad Girl Autumn Version)", duration: "9:58", explicit: true },
  { id: "vit-u-48-the-1", src: "", artwork: "", addedAt: "", title: "the 1", artist: "Taylor Swift", album: "folklore", duration: "3:30", explicit: true },
  { id: "vit-u-49-always", src: "", artwork: "", addedAt: "", title: "Always", artist: "Daniel Caesar", album: "NEVER ENOUGH", duration: "3:45", explicit: true },
  { id: "vit-u-50-sick-feeling", src: "", artwork: "", addedAt: "", title: "Sick Feeling", artist: "boy pablo", album: "Soy Pablo", duration: "2:35", explicit: false },
];
