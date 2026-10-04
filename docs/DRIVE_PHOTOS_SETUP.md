# Photos dari Google Drive — Setup

App ini otomatis menampilkan foto dari folder publik Google Drive selain
foto yang di-bundle dari repo. Tidak perlu server — browser memanggil
Google Drive API langsung.

## Setup (sekali)

1. **Buat Folder Drive**
   - Buat folder di Google Drive, misal `Photos App`.
   - Buat subfolder per album, misal `Favorites`, `Trips`. Subfolder = album.
   - Foto langsung di root folder masuk ke album "Drive Photos".
   - Klik kanan folder utama → **Share** → **Anyone with the link** (Viewer).

2. **Buat API Key**
   - Buka https://console.cloud.google.com (login akun Google).
   - Buat project baru, atau pilih project yang ada.
   - Menu **APIs & Services → Library** → cari **Google Drive API** → **Enable**.
   - Menu **APIs & Services → Credentials** → **Create Credentials → API key**.
   - Copy key. Buka **Edit** pada key tersebut:
     - **API restrictions** → restrict ke **Google Drive API**.
     - **Application restrictions** → **HTTP referrers** → tambah
       `https://<username>.github.io/*` (domain GitHub Pages kamu).

3. **Konfigurasi lokal**
   - Buat file `.env.local` di root repo (file ini di-ignore Git) dengan isi:
     ```text
     VITE_DRIVE_API_KEY=...
     ```
   - `DRIVE_FOLDER_ID` yang digunakan app adalah ID folder utama setelah
     `/folders/` pada URL Google Drive.
   - Jangan menempelkan API key ke `src/features/photos/driveConfig.js`.

4. **Konfigurasi GitHub Pages**
   - Tambahkan API key sebagai repository secret bernama `DRIVE_API_KEY`.
   - Workflow deploy memasukkan secret tersebut hanya saat menjalankan build
     production.

5. **Commit & push** — deploy GitHub Pages otomatis via `.github/workflows/deploy.yml`.

## Favorit permanen via favorites.json (tanpa login, tanpa copy file)

- Satu file `favorites.json` di root folder Drive berisi daftar id foto, contoh: `["travel/bali.jpg", "drive:travel/bali.jpg"]`.
- Favorit = isi folder `Favorites` + `favorites.json` + tombol ♥ lokal (per browser). Tanpa login, tanpa OAuth.
- Permanen = edit `favorites.json` / folder `Favorites` langsung di Drive UI; reload app → masuk Favorit di semua device.
- ♥ di app = sementara per browser (localStorage); hilang kalau ganti browser/clear data.
