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

3. **Isi config di `src/features/photos/driveConfig.js`**
   - `DRIVE_FOLDER_ID`: bagian URL folder setelah `/folders/…`.
     Contoh URL: `https://drive.google.com/drive/folders/ABC123xyz` → ID = `ABC123xyz`.
   - `DRIVE_API_KEY`: API key dari langkah 2.

4. **Commit & push** — deploy GitHub Pages otomatis via `.github/workflows/deploy.yml`.

## Cara menambah foto

1. Upload foto ke folder Drive (ke subfolder album yang diinginkan).
2. Refresh halaman app. Selesai — tidak ada rebuild/redeploy.

## Catatan

- API key ini public by design (read-only, folder publik, domain-locked).
- Jika foto Drive tidak muncul: cek folder sudah di-share "Anyone with the link",
  API key aktif + Drive API enabled, dan referrer restriction sesuai domain deploy.
- Katalog lokal (`src/content/photos/`) tetap bekerja seperti biasa.
