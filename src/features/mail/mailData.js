export const CATEGORIES = [
  { id: "primary", label: "Primary", icon: "person" },
  { id: "transactions", label: "Transactions", icon: "cart" },
  { id: "updates", label: "Updates", icon: "news" },
  { id: "promotions", label: "Promotions", icon: "megaphone" },
];

export const MAILBOX_GROUPS = [
  {
    label: "Favorites",
    items: [
      { id: "inbox", label: "Inbox", icon: "inbox" },
      { id: "flagged", label: "Flagged", icon: "flag" },
      { id: "drafts", label: "Drafts", icon: "draft" },
      { id: "sent", label: "Sent", icon: "sent" },
    ],
  },
  { label: "Smart Mailboxes", items: [] },
  {
    label: "Mail Account",
    items: [
      { id: "important", label: "Important", icon: "flag" },
      { id: "inbox", label: "Inbox", icon: "inbox" },
      { id: "account-drafts", label: "Drafts", icon: "draft" },
      { id: "account-sent", label: "Sent", icon: "sent" },
      { id: "junk", label: "Junk", icon: "junk" },
      { id: "trash", label: "Trash", icon: "trash" },
      { id: "archive", label: "Archive", icon: "archive" },
    ],
  },
];

export const INITIAL_MESSAGES = [
  {
    id: "favorite-stranger-first-times",
    mailbox: "inbox",
    category: "primary",
    sender: "user11201",
    senderEmail: "user11201@gmail.com",
    time: "Oct 30",
    subject: "First Experience",
    preview: "Hai, My Favorite Stranger. 🤍 Kamu tahu nggak? Hmm, kalau dipikir-pikir, ternyata banyak banget first experiences dalam hidupku yang aku alamin bareng kamu, hehehe.",
    body: `Hai, My Favorite Stranger. 🤍

Kamu tahu nggak? Hmm, kalau dipikir-pikir, ternyata banyak banget first experiences dalam hidupku yang aku alamin bareng kamu, hehehe.

Banyak hal yang sebelumnya nggak pernah aku pikir bakal aku suka, nggak pernah aku bayangin bakal aku coba, bahkan nggak pernah aku sangka bakal jadi bagian dari hidupku. But somehow, you made all those little things feel so special.

Dari film-film yang dulu nggak pernah menarik perhatianku, makanan-makanan yang baru pertama kali aku coba, sampai obrolan random kita yang kadang nggak jelas arahnya, wkwk. Somehow, everything felt a little more special simply because I got to experience it with you.

Tapi dari semua first experiences itu, ada satu hal yang paling berarti buat aku.

You made me believe in love again.

Setelah sekian lama takut buat membuka hati, ternyata aku masih bisa ngerasain gimana rasanya jatuh cinta lagi. Excited nungguin seseorang, senyum-senyum sendiri cuma gara-gara satu pesan, dan ngerasain hangatnya punya seseorang yang terasa seperti rumah.

And that someone was you, hihihi. 🤍

Lucu ya, how someone who was once a complete stranger could slowly become such a meaningful part of my life.

Aku nggak tahu apakah semua momen kecil itu punya arti yang sama buat kamu. But to me, they meant more than you could ever imagine.

And even though our story didn't turn out the way I once hoped, aku tetap bersyukur banget karena pernah punya kesempatan buat kenal kamu sedekat itu.

Because some people become memories, while others change the way we see the world. And somehow, you did both.

So, thank you for everything. For all those little firsts, the random laughter, the warmth, and all the beautiful memories I never knew I needed.

Maybe not every beautiful story gets the ending we once dreamed of. But that doesn't make the moments we shared any less meaningful.

Dan kalau suatu hari nanti kita benar-benar jadi dua orang asing lagi, I hope you know that those little memories will always have a special place in my heart.

You'll always be a beautiful part of my story.

With all the love and gratitude I still carry,

user11201 🤍`,
    to: "myfavoritestranger@gmail.com",
    toName: "My Favorite Stranger",
    unread: true,
    flagged: false,
  },
  {
    id: "apology-to-my-favorite-stranger",
    mailbox: "inbox",
    category: "primary",
    sender: "user11201",
    senderEmail: "user11201@gmail.com",
    sentAt: "2026-10-31T22:40:00+07:00",
    subject: "I'm Really Sorry",
    preview: "Haii, Pwetty. Sebelumnya, I'm really sorry ya buat apa yang aku lakuin waktu itu, hehe.",
    body: `Haii, Pwetty. Sebelumnya, I'm really sorry ya buat apa yang aku lakuin waktu itu, hehe.

I never meant to hurt you or make you feel uncomfortable. Aku cuma lagi berusaha buat tetap konsisten sama komitmenku untuk menjaga jarak dari kamu, supaya aku nggak kembali terjebak dalam the same unhealthy cycle dan akhirnya malah bikin hati kamu terluka lagi.

To be honest, the process of detaching myself from you has been really painful and emotionally exhausting for me. It's not easy at all, apalagi ketika perasaanku ke kamu masih sebesar itu. But I'm trying my best, karena aku nggak mau kita terus-terusan mengulang hal yang sama dan saling menyakiti lagi.

Dan soal kenapa aku tiba-tiba leave waktu itu, sebenarnya karena suasananya mendadak jadi rame banget, sementara aku lagi capek secara mental dan belum sanggup denger banyak orang ngobrol sekaligus. So I decided to leave for a while.

Once again, I'm really sorry ya,. Aku harap kamu bisa memahami maksudku, dan semoga suatu saat kamu bisa maafin aku, hihihi. 🤍`,
    to: "myfavoritestranger@gmail.com",
    toName: "My Favorite Stranger",
    unread: true,
    flagged: false,
  },
  {
    id: "security",
    mailbox: "inbox",
    category: "primary",
    sender: "user11201",
    senderEmail: "user11201@gmail.com",
    sentAt: "2026-10-21T17:50:00+07:00",
    subject: "Can it be fixed?",
    preview: "Haiii, Acaaa! 🤍",
    body: `Haiii, Acaaa! 🤍

Sebenernya, di momen aku bilang kayak gitu waktu itu, deep down I was hoping you'd give me a reason to stay. Aku sebenernya masih pengen kamu meyakinkan aku buat tetap stay sama kamu, cuma mungkin aku nggak bisa menyampaikannya dengan baik saat itu.

And honestly, waktu kamu ngajak aku call lagi, I was genuinely so happy, you know? Aku seneng banget karena sebenernya aku juga masih pengen ngobrol langsung sama kamu. Bahkan waktu itu aku masih nunggu jawaban dari kamu soal kapan kamu bisa call bareng aku lagi, hihihi.

Hmm, but maybe things just didn't go the way we hoped. Di satu sisi, aku juga lagi berusaha buat nggak kembali ke kebiasaanku yang dulu, yang selalu begging dan terlalu memaksakan sesuatu.

Dan mungkin aja, kamu juga sebenarnya lagi nunggu aku buat take action, nentuin kapan kita bisa call lagi, dan mencoba work things out dengan ngobrol langsung.

But somehow, maybe we were both waiting for each other, tanpa benar-benar tahu apa yang sebenarnya diharapkan satu sama lain.

And look where we ended up... malah sama-sama sedih, wkwkwk 😭

Lucu sekaligus nyesek ya, Ca. Maybe all we needed was a little more communication, instead of silently waiting for each other.

Aku cuma pengen kamu tahu kalau waktu itu aku sebenernya masih ingin stay dan memperbaiki semuanya. I just didn't know how to say it without feeling like I was begging again. 🤍`,
    to: "myfavoritestranger@gmail.com",
    toName: "My Favorite Stranger",
    unread: false,
    flagged: false,
  },
  {
    id: "social",
    mailbox: "inbox",
    category: "updates",
    sender: "Social Network",
    time: "19:07",
    subject: "Three people viewed your profile",
    preview: "Your profile is getting attention from people in your industry.",
    body: "Three people viewed your profile this evening. Open the activity page to see more details.",
    to: "user@example.com",
    unread: true,
    flagged: false,
  },
  {
    id: "payment",
    mailbox: "inbox",
    category: "transactions",
    sender: "Demo Bank",
    time: "13:07",
    subject: "Internet transaction journal",
    preview: "Your mobile banking transaction was successful.",
    body: "The example transaction was completed successfully. Review the attached transaction details in your banking app.",
    to: "user@example.com",
    unread: true,
    flagged: true,
  },
  {
    id: "investment",
    mailbox: "inbox",
    category: "promotions",
    sender: "Invest App",
    time: "15:39",
    subject: "Low-risk investment insights",
    preview: "Explore a few low-risk options for your monthly savings.",
    body: "This promotional message contains example investment information only.",
    to: "user@example.com",
    unread: false,
    flagged: false,
  },
  {
    id: "account-update",
    mailbox: "inbox",
    category: "updates",
    sender: "Workspace App",
    time: "11:24",
    subject: "Your weekly workspace summary",
    preview: "Five pages changed and two comments are waiting for your reply.",
    body: "Here is your weekly workspace activity summary.",
    to: "user@example.com",
    unread: true,
    flagged: false,
  },
  {
    id: "draft-example",
    mailbox: "drafts",
    category: "primary",
    sender: "Draft",
    time: "10:12",
    subject: "Planning notes",
    preview: "A saved local draft for testing the Drafts mailbox.",
    body: "This is a local draft fixture.",
    to: "team@example.com",
    unread: false,
    flagged: false,
  },
  {
    id: "sent-example",
    mailbox: "sent",
    category: "primary",
    sender: "user11201",
    time: "09:40",
    subject: "Project update",
    preview: "A local sent-message fixture for the Sent mailbox.",
    body: "This is a local sent-message fixture.",
    to: "team@example.com",
    unread: false,
    flagged: false,
  },
  {
    id: "archived-example",
    mailbox: "archive",
    category: "primary",
    sender: "Archive Service",
    time: "Yesterday",
    subject: "Archived project note",
    preview: "A local archived message fixture.",
    body: "This is a local archived message fixture.",
    to: "user@example.com",
    unread: false,
    flagged: false,
  },
  {
    id: "junk-example",
    mailbox: "junk",
    category: "promotions",
    sender: "Unknown Sender",
    time: "Yesterday",
    subject: "Example junk message",
    preview: "A local junk mailbox fixture.",
    body: "This is a local junk message fixture.",
    to: "user@example.com",
    unread: true,
    flagged: false,
  },
  {
    id: "trash-example",
    mailbox: "trash",
    category: "transactions",
    sender: "Old Receipt",
    time: "Monday",
    subject: "Example deleted receipt",
    preview: "A local Trash mailbox fixture.",
    body: "This is a local Trash message fixture.",
    to: "user@example.com",
    unread: false,
    flagged: false,
  },
];

export function createInitialMessages() {
  return INITIAL_MESSAGES.map((message) => ({ ...message }));
}
