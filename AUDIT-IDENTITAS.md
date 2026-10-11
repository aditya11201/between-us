# Audit Identitas — Between Us (macOS clone)

Tanggal: 2026-10-11. Scope: direktori `/home/aditya11201/coding-repo/between-us-change-identitas-dari-macbooknya`. Metode: baca statis (grep/read), tanpa eksekusi binary. Nilai sensitif di-masking (`***`).

## 1. Apple ID
| Temuan | Lokasi sumber | Nilai |
|---|---|---|
| Sidebar Settings, nama akun | `src/features/settings/SettingsContent/components/AppleIdSection.jsx:8-9` | `user11201` / `Apple ID` |
| Kartu iCloud Settings | `src/features/settings/Settings_Components/panels/Security/ICloudSettings.jsx:28-29` | `user11201` / `user11201@icloud.com` |
| Akun Internet Accounts → iCloud | `src/features/settings/Settings_Components/panels/Security/InternetAccountsSettings.jsx:10-11` | `iCloud` / `user11201@example.com` |
| Game Center | `src/features/settings/Settings_Components/panels/Security/GameCenterSettings.jsx:10` | belum sign-in ("Sign in to Game Center…") |

## 2. Identitas Login Screen
| Temuan | Lokasi sumber | Nilai |
|---|---|---|
| Nama user di layar login | `src/ui/LockScreen/LockScreen.jsx:246` | `user11201` |
| Avatar login | `src/ui/LockScreen/LockScreen.jsx:3-4` | `src/assets/images/avatar/profile.webp` |
| Wallpaper lockscreen | `src/ui/LockScreen/LockScreen.jsx:4,209` + `vite.config.js:53` (inline ke bundle) | `src/assets/images/lockscreen/lockscreen-wallpaper.webp` |
| Teks hint login | `src/ui/LockScreen/LockScreen.jsx:235` | `Click or press any key to log in` |
| Menu bar saat terkunci | `src/ui/LockScreen/LockScreen.jsx:213` | label `ID` |
| Menu Apple → user dinamis | `src/features/menubar/MenuBar.jsx:169` | `Log Out … user11201…` |

## 3. User Terminal / Shell
| Temuan | Lokasi sumber | Nilai |
|---|---|---|
| Prompt user@host | `src/features/terminal/Terminal.jsx:666-668,682-684` | `user11201@between-us:~$` |
| Judul jendela terminal | `src/features/terminal/Terminal.jsx:655` | `user11201 — zsh — 80×24` |
| `whoami` | `src/features/terminal/Terminal.jsx:171` | `user11201` |
| `pwd` | `src/features/terminal/Terminal.jsx:170` | `/Users/user11201` |
| `who` | `src/features/terminal/Terminal.jsx:493-494` | `user11201` di `tty1`/`tty2` |
| `top` (kolom USER) | `src/features/terminal/Terminal.jsx:455-457` | `user11201` |
| `uname -a` | `src/features/terminal/Terminal.jsx:175` | `Darwin between-us 24.0.0 … RELEASE_ARM64 between-us` |
| `neofetch` (user@hostname) | `src/features/terminal/Terminal.jsx:242` | `user11201@between-us`, Host `MacBook Pro (Simulated)`, Shell `zsh`, Runtime `React 19 / V8` |
| Fixture `cat .git/config` di terminal | `src/features/terminal/Terminal.jsx:210-214` | `github.com/aditya11201/between-us.git` + upstream `gaminghackintosh/macweb.dev.git` |
| `ls` (home simulasi) | `src/features/terminal/Terminal.jsx:163-165` | `Desktop Documents Downloads Movies Music Pictures Projects Public readme.md .git .config .local` |

## 4. Identitas Settings
| Temuan | Lokasi sumber | Nilai |
|---|---|---|
| About → Spesifikasi | `src/features/settings/SettingsContent/panels/AboutPanel.jsx:50,58-69,84-87,102` | `Between Us`; Chip `Apple M3 Max (Virtual 16-Core)`; Memory `16 GB LPDDR5X`; Disk `Macintosh HD`; Serial `HACKW192K98X` (fiksi); macOS `Tahoe 26.0.1 Build 23A344`; storage `342 GB available of 512 GB` |
| About This Mac (menu bar) | `src/features/menubar/AboutThisMac/ATM.jsx:31-33,45-57` | macOS `Tahoe 26.0.1`; Chip `Apple M3 Max`; Memory `16 GB LPDDR5X`; Storage `512 GB SSD`; Serial `HACKW192K98X`; Graphics `Integrated 16-core` |
| Users & Groups | `src/features/settings/Settings_Components/panels/Security/UsersgroupsSettings.jsx:10-18` | `user11201` (`Administrator`) + `Guest User` |
| Wi-Fi | `src/features/settings/Settings_Components/panels/Network/Wi-Fi.jsx:61-62,91,111` + `src/features/menubar/MenuBar/constants.jsx:7` | Terkoneksi `Kernel Panic Network`; dikenal `MERCUSYS_B939`; hotspot `iPhone`; konstanta `WIFI_NAME="Kernel Panic Network"` |
| Bluetooth | `src/features/settings/Settings_Components/panels/Network/BluetoothSettings.jsx:89-90` | `AirPods Pro` (disconnected), `UGREEN KB 3.0` (connected) — fixture |
| Network | `src/features/settings/Settings_Components/panels/Network/NetworkSettings.jsx:86` | IP `192.168.1.42` (fixture) |
| Sound output | `src/features/settings/Settings_Components/panels/System/SoundSettings.jsx:10-11` | `MacBook Pro Speakers`, `External Headphones` (opsi dummy) |

## 5. Hostname & Perangkat
| Temuan | Lokasi sumber | Nilai |
|---|---|---|
| hostname (simulasi) | `src/features/terminal/Terminal.jsx:175,242` | `between-us` (`user11201@between-us`, `Darwin between-us`) |
| Serial number | `src/features/menubar/AboutThisMac/ATM.jsx:57`, `src/features/settings/SettingsContent/panels/AboutPanel.jsx:37,66` (klik → copy ke clipboard) | `HACKW192K98X` (fiksi, bukan serial Apple asli) |
| Model/disk | `src/features/finder/FinderContent.jsx:150,294-298` | tab `Macintosh HD`; folder `/Applications /Library /System /Users` |
| PWA manifest | `public/manifest.json` | name `Between Us`, `start_url ./`, orientation `landscape` |

## 6. Git Config & Kepemilikan Repo
| Temuan | Lokasi sumber | Nilai |
|---|---|---|
| `git config` lokal worktree | `git config user.name/email` (worktree `between-us-change-identitas-dari-macbooknya`) | `aditya11201` / `a***@g***.com` |
| Remote | `git remote -v` | origin `github.com/aditya11201/between-us.git`; upstream `github.com/gaminghackintosh/macweb.dev.git` |
| Worktree | `.git` (file, isi `gitdir:`) | `…/between-us/.git/worktrees/between-us-change-identitas-dari-macbooknya` (repo utama `between-us`) |
| Identitas penulis di histori (`git log`) | `git log --format='%an|%ae'` | `Aditya Ardiansyah Ramadhan` / `6***+a***@users.noreply.github.com`; `aditya11201` / `a***@g***.com`; `aditya` / `v***@b***.co.id`; `gamehack` / `s***@g***.com` (warisan upstream) |
| Atribusi publik di kode | `README.md`, `PRODUCT.md`, `src/features/finder/FinderContent.jsx:333`, `src/features/safari/safariNavigation.js:1-7`, `index.html` (og:url) | `aditya11201.github.io/between-us`; target Safari `…/glad-you-were-born/`, `…/apology-web-app/`, `…/unsent/`; basis `macweb.dev by gaminghackintosh` |

## 7. SSH Key
Tidak ada key/identifier SSH di repo ini: tidak ada direktori `.ssh`, tidak ada string `ssh-rsa|ssh-ed25519|BEGIN .*PRIVATE KEY` pada `src/ public/ index.html PRODUCT.md README.md docs/ private/`. Satu-satunya yang menyerupai kredensial adalah fixture negatif di `src/features/safari/safariNavigation.test.js:152-160` (`https://user:secret@…` sebagai kasus uji URL-berkredensial yang diblokir — bukan kredensial asli).

## 8. Email / Identitas Lain di Fixture
| Temuan | Lokasi sumber | Nilai |
|---|---|---|
| Contoh mail (template) | `private/mail.example.json:7,12` | `example@example.com`, `someone@example.com` (template; `private/mail.json` asli di-gitignore) |
| Fixture mail app | `src/features/mail/mailData.js` | penerima `user@example.com`, `team@example.com` (dummy); pengirim pesan Sent = `user11201` (`mailData.js:129`) |
| Mail terenkripsi | `public/important-mail.enc.json` + `scripts/encrypt-mail.mjs` + `private/README.md` | ciphertext; password via env `IMPORTANT_PWD`, tidak tertulis di repo |
| Kalender iCloud (label UI) | `src/features/calendar/CalendarContent.jsx:38,444` | seksi `iCloud` (Home/Calendar/Work) — label, bukan akun |

## 9. Yang TIDAK ditemukan (bukan identitas pemilik)
- Tidak ada Apple ID / email pribadi asli dalam kode (semua `ghost`, `you`, `*@example.com` adalah dummy/fixture).
- Tidak ada nomor seri, IMEI, UDID, nomor telepon, alamat, atau foto pribadi di kode (avatar/wallpaper adalah file gambar tanpa metadata identitas yang terbaca).
- Email pribadi (`a***@g***.com`, `v***@b***.co.id`) hanya ada di histori/konfigurasi git lokal, bukan di file yang dikomit di worktree ini.
