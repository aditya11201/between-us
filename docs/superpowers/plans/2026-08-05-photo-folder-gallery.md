# Photo folder gallery implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan aplikasi galeri foto pada simulator macOS berbasis React yang membaca foto dari subfolder repository dan menampilkannya melalui build GitHub Pages.

**Architecture:** Foto disimpan di `src/content/photos/` dan ditemukan saat build memakai `import.meta.glob`. Model katalog murni mengubah path asset menjadi section dan item foto, sedangkan UI mengelola pencarian, selection, grid, dan status bar tanpa database atau upload runtime.

**Tech Stack:** React 19, Vite 5, JavaScript/JSX, Sass, Node.js built-in test runner, `react-window` hanya jika profiling membuktikan kebutuhan.

## Global Constraints

- Sumber foto harus berada di `src/content/photos/`.
- Setiap subfolder langsung di bawah `src/content/photos/` menjadi satu section.
- File yang didukung adalah `.jpg`, `.jpeg`, `.png`, `.webp`, dan `.gif`.
- Folder bersarang di bawah section diabaikan pada MVP.
- Tidak ada database, backend, CMS, GitHub API, authentication service, atau dependency baru pada MVP.
- Upload dilakukan melalui Git commit dan push, bukan dari browser runtime.
- URL asset harus berasal dari Vite agar base path `/macweb.dev/` tetap bekerja di GitHub Pages.
- Selection ID harus menggunakan path relatif, bukan index array.
- Baris status bawah hanya menampilkan state selection dan tidak melakukan mutation repository.
- Jangan menyalin asset proprietary, trademark, ikon resmi, atau kode Apple.
- Jangan mengubah fitur existing yang tidak terkait dengan galeri foto.
- Setiap task dalam plan menghasilkan tepat satu commit pada branch `feature/photo-folder-gallery-plan`.
- Jangan stage atau commit `docs/superpowers/plans/2026-08-04-direct-iframe.md`, `docs/superpowers/specs/`, atau `prompt`.
- Verifikasi minimum setelah perubahan adalah `npm test` dan `npm run build`.

## File map

| File | Tanggung jawab | Perubahan |
|---|---|---|
| `src/content/photos/.gitkeep` | Menjaga root content folder tetap ada sebelum foto pertama ditambahkan | Create |
| `src/features/photos/photoCatalogModel.js` | Fungsi pure untuk mengubah glob map menjadi katalog dan section | Create |
| `src/features/photos/photoCatalogModel.test.js` | Test catalog filtering, grouping, label, dan sorting | Create |
| `src/features/photos/photoCatalog.js` | Adapter Vite yang menjalankan `import.meta.glob` | Create |
| `src/features/photos/photoSelectionModel.js` | Fungsi pure untuk selection, filtering, dan label status | Create |
| `src/features/photos/photoSelectionModel.test.js` | Test selection dan filter | Create |
| `src/features/photos/PhotosContent.jsx` | Orchestrator window content, toolbar, sidebar, grid, dan state | Create |
| `src/features/photos/PhotoSection.jsx` | Render heading dan grid satu section | Create |
| `src/features/photos/PhotoCard.jsx` | Render satu thumbnail dan selection state | Create |
| `src/features/photos/PhotosStatusBar.jsx` | Render total item atau item terpilih | Create |
| `src/styles/components/Photos/Photos.scss` | Style gallery tanpa mengubah theme global | Create |
| `src/styles/features/main.scss` | Import stylesheet gallery | Modify lines 27-35 |
| `src/core/constants/apps.jsx` | Daftar aplikasi yang dapat dibuka Dock | Modify lines 18-82 |
| `src/core/constants/positions.jsx` | Ukuran awal window foto | Modify lines 1-8 |
| `src/windows/Dock.jsx` | Menambahkan Photos ke Dock | Modify lines 20-30 |
| `src/utils/renderAppContent.jsx` | Lazy import dan dispatch content `photos` | Modify lines 4-37 |

Current application files outside this map remain unchanged.

## Task 1: Build the photo asset catalog

**Files:**

- Create: `src/content/photos/.gitkeep`
- Create: `src/features/photos/photoCatalogModel.js`
- Create: `src/features/photos/photoCatalogModel.test.js`
- Create: `src/features/photos/photoCatalog.js`

**Interfaces:**

- Consumes: Vite glob map with keys such as `/src/content/photos/travel/japan.png` and values containing built asset URLs.
- Produces: `createPhotoCatalog(modules, root)` returning `PhotoAsset[]`.
- Produces: `groupPhotoCatalog(catalog)` returning `PhotoSection[]`.
- Produces: `photoCatalog` and `photoSections` exports for React components.

```js
// PhotoAsset
{
  id: "travel/japan.png",
  sectionId: "travel",
  sectionLabel: "Travel",
  name: "japan.png",
  url: "/macweb.dev/assets/japan-hash.png",
}
```

```js
// PhotoSection
{
  id: "travel",
  label: "Travel",
  photos: [PhotoAsset],
}
```

- [ ] **Step 1: Write the failing catalog tests**

Create `src/features/photos/photoCatalogModel.test.js` with these cases:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  createPhotoCatalog,
  groupPhotoCatalog,
} from "./photoCatalogModel.js";

const modules = {
  "/src/content/photos/favorites/sunset.webp": "/assets/sunset.webp",
  "/src/content/photos/travel/japan.png": "/assets/japan.png",
  "/src/content/photos/travel/raw/ignored.jpg": "/assets/ignored.jpg",
  "/src/content/photos/travel/readme.txt": "/assets/readme.txt",
};

test("catalog keeps supported direct section files", () => {
  const catalog = createPhotoCatalog(modules);
  assert.deepEqual(catalog.map((photo) => photo.id), [
    "favorites/sunset.webp",
    "travel/japan.png",
  ]);
});
```

Add tests for section grouping and label conversion:

```js
test("catalog groups sections and humanizes names", () => {
  const catalog = createPhotoCatalog({
    "/src/content/photos/my-trips/photo.jpg": "/photo.jpg",
  });
  const [section] = groupPhotoCatalog(catalog);

  assert.equal(section.id, "my-trips");
  assert.equal(section.label, "My Trips");
  assert.equal(section.photos[0].name, "photo.jpg");
});
```

- [ ] **Step 2: Run the catalog tests and verify they fail**

Run:

```bash
node --test src/features/photos/photoCatalogModel.test.js
```

Expected result: FAIL because `photoCatalogModel.js` does not exist yet.

- [ ] **Step 3: Implement the pure catalog model**

Create `src/features/photos/photoCatalogModel.js` with these exports:

```js
export const PHOTO_ROOT = "/src/content/photos/";

const SUPPORTED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
]);

function humanizeSectionId(sectionId) {
  return sectionId
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function createPhotoCatalog(modules, root = PHOTO_ROOT) {
  return Object.entries(modules)
    .flatMap(([sourcePath, url]) => {
      if (!sourcePath.startsWith(root)) return [];
      const relativePath = sourcePath.slice(root.length);
      const segments = relativePath.split("/");
      if (segments.length !== 2) return [];

      const [sectionId, name] = segments;
      const extension = name.slice(name.lastIndexOf(".")).toLowerCase();
      if (!SUPPORTED_EXTENSIONS.has(extension)) return [];

      return [{
        id: relativePath,
        sectionId,
        sectionLabel: humanizeSectionId(sectionId),
        name,
        url,
      }];
    })
    .sort((left, right) => left.id.localeCompare(right.id));
}
```

Add grouping without mutating the input catalog:

```js
export function groupPhotoCatalog(catalog) {
  const sections = new Map();

  for (const photo of catalog) {
    if (!sections.has(photo.sectionId)) {
      sections.set(photo.sectionId, {
        id: photo.sectionId,
        label: photo.sectionLabel,
        photos: [],
      });
    }
    sections.get(photo.sectionId).photos.push(photo);
  }

  return [...sections.values()];
}
```

- [ ] **Step 4: Add the Vite adapter**

Create `src/features/photos/photoCatalog.js`:

```js
import {
  createPhotoCatalog,
  groupPhotoCatalog,
} from "./photoCatalogModel.js";

const photoModules = import.meta.glob(
  "/src/content/photos/**/*.{jpg,jpeg,png,webp,gif}",
  {
    eager: true,
    query: "?url",
    import: "default",
  },
);

export const photoCatalog = createPhotoCatalog(photoModules);
export const photoSections = groupPhotoCatalog(photoCatalog);
```

- [ ] **Step 5: Run the catalog tests and verify they pass**

Run:

```bash
node --test src/features/photos/photoCatalogModel.test.js
```

Expected result: PASS with all catalog assertions passing.

- [ ] **Step 6: Run the full existing test suite**

Run:

```bash
npm test
```

Expected result: 9 existing tests pass plus the catalog tests, with 0 failures.

- [ ] **Step 7: Commit the catalog task**

Run:

```bash
git add src/content/photos/.gitkeep \
  src/features/photos/photoCatalogModel.js \
  src/features/photos/photoCatalogModel.test.js \
  src/features/photos/photoCatalog.js
git commit -m "feat: add photo asset catalog"
```

## Task 2: Add selection and filtering models

**Files:**

- Create: `src/features/photos/photoSelectionModel.js`
- Create: `src/features/photos/photoSelectionModel.test.js`

**Interfaces:**

- Consumes: `Set<string>` selection IDs and `PhotoSection[]` catalog sections.
- Produces: `updatePhotoSelection(selectedIds, photoId, additive)` returning a new `Set<string>`.
- Produces: `clearPhotoSelection()` returning an empty `Set<string>`.
- Produces: `filterPhotoSections(sections, query)` returning new filtered sections.
- Produces: `formatSelectionStatus(selectedCount, totalCount)` returning the bottom status label.

- [ ] **Step 1: Write the failing selection tests**

Create tests for single selection, additive selection, deselection, filtering, and status text:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  updatePhotoSelection,
  clearPhotoSelection,
  filterPhotoSections,
  formatSelectionStatus,
} from "./photoSelectionModel.js";

test("single click replaces the current selection", () => {
  const next = updatePhotoSelection(
    new Set(["favorites/old.jpg"]),
    "travel/new.jpg",
    false,
  );

  assert.deepEqual([...next], ["travel/new.jpg"]);
});

test("additive click toggles one photo without mutating the input", () => {
  const current = new Set(["favorites/old.jpg"]);
  const next = updatePhotoSelection(current, "travel/new.jpg", true);

  assert.deepEqual([...current], ["favorites/old.jpg"]);
  assert.deepEqual([...next], ["favorites/old.jpg", "travel/new.jpg"]);
});

test("additive click removes an already selected photo", () => {
  const next = updatePhotoSelection(
    new Set(["favorites/old.jpg"]),
    "favorites/old.jpg",
    true,
  );

  assert.deepEqual([...next], []);
});

test("clear selection returns a fresh empty set", () => {
  const cleared = clearPhotoSelection();
  assert.equal(cleared.size, 0);
});
```

Add a filter assertion:

```js
test("filter keeps only matching photos and non-empty sections", () => {
  const sections = [{
    id: "travel",
    label: "Travel",
    photos: [
      { id: "travel/japan.png", name: "japan.png" },
      { id: "travel/bali.jpg", name: "bali.jpg" },
    ],
  }];

  const result = filterPhotoSections(sections, "japan");
  assert.deepEqual(result[0].photos.map((photo) => photo.id), [
    "travel/japan.png",
  ]);
});
```

Add the status-label contract used by the bottom bar:

```js
test("selection status reports total photos until selection exists", () => {
  assert.equal(formatSelectionStatus(0, 12), "12 photos");
  assert.equal(formatSelectionStatus(3, 12), "3 photos selected");
});
```

- [ ] **Step 2: Run the selection tests and verify they fail**

Run:

```bash
node --test src/features/photos/photoSelectionModel.test.js
```

Expected result: FAIL because `photoSelectionModel.js` does not exist yet.

- [ ] **Step 3: Implement immutable selection helpers**

Create `src/features/photos/photoSelectionModel.js`:

```js
export function updatePhotoSelection(selectedIds, photoId, additive) {
  const next = additive ? new Set(selectedIds) : new Set();

  if (additive && next.has(photoId)) {
    next.delete(photoId);
  } else {
    next.add(photoId);
  }

  return next;
}

export function clearPhotoSelection() {
  return new Set();
}
```

Implement filtering without mutating sections:

```js
export function filterPhotoSections(sections, query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return sections;

  return sections
    .map((section) => ({
      ...section,
      photos: section.photos.filter((photo) =>
        photo.name.toLowerCase().includes(normalizedQuery),
      ),
    }))
    .filter((section) => section.photos.length > 0);
}

export function formatSelectionStatus(selectedCount, totalCount) {
  return selectedCount > 0
    ? `${selectedCount} photos selected`
    : `${totalCount} photos`;
}
```

- [ ] **Step 4: Run the selection tests and verify they pass**

Run:

```bash
node --test src/features/photos/photoSelectionModel.test.js
```

Expected result: PASS with all selection and filter assertions passing.

- [ ] **Step 5: Run the full test suite**

Run:

```bash
npm test
```

Expected result: 0 failures across existing and photo model tests.

- [ ] **Step 6: Commit the selection task**

Run:

```bash
git add src/features/photos/photoSelectionModel.js \
  src/features/photos/photoSelectionModel.test.js
git commit -m "feat: add photo selection model"
```

## Task 3: Build the photo gallery UI

**Files:**

- Create: `src/features/photos/PhotosContent.jsx`
- Create: `src/features/photos/PhotoSection.jsx`
- Create: `src/features/photos/PhotoCard.jsx`
- Create: `src/features/photos/PhotosStatusBar.jsx`
- Create: `src/styles/components/Photos/Photos.scss`

**Interfaces:**

- Consumes: `photoSections` from `photoCatalog.js`.
- Consumes: `updatePhotoSelection`, `clearPhotoSelection`, `filterPhotoSections`, and `formatSelectionStatus` from `photoSelectionModel.js`.
- Produces: `PhotosContent({ onClose, onMinimize, onMaximize })` for `renderAppContent`.
- Produces: `PhotoSection({ section, selectedPhotoIds, onTogglePhoto })`.
- Produces: `PhotoCard({ photo, selected, onToggle })`.
- Produces: `PhotosStatusBar({ selectedCount, totalCount, onClear })`.

### UI behavior

- Render every non-empty section automatically.
- Render section names from the catalog, not hardcoded photo data.
- Search filters by filename across all sections.
- A normal click selects one photo.
- `Meta` or `Control` click toggles additive selection.
- The status bar displays total photos when selection is empty.
- The status bar displays selected photos when selection is non-empty.
- The clear action removes selection without deleting files.
- The window header uses the callbacks passed by `renderAppContent`.
- The layout remains usable when the catalog is empty.

- [ ] **Step 1: Implement `PhotoCard` with accessible selection behavior**

Create `src/features/photos/PhotoCard.jsx` using a button-like interaction. The component must pass the event modifier state to its parent:

```jsx
export function PhotoCard({ photo, selected, onToggle }) {
  return (
    <button
      type="button"
      className={`photos-card${selected ? " photos-card--selected" : ""}`}
      aria-pressed={selected}
      aria-label={photo.name}
      onClick={(event) => onToggle(photo.id, event.metaKey || event.ctrlKey)}
    >
      <img
        src={photo.url}
        alt={photo.name}
        loading="lazy"
        decoding="async"
      />
      <span className="photos-card__caption">{photo.name}</span>
    </button>
  );
}
```

- [ ] **Step 2: Implement `PhotoSection`**

Create `src/features/photos/PhotoSection.jsx` with a stable section anchor and the section's cards:

```jsx
import { PhotoCard } from "./PhotoCard";

export function PhotoSection({ section, selectedPhotoIds, onTogglePhoto }) {
  return (
    <section id={`photos-section-${section.id}`} className="photos-section">
      <h2 className="photos-section__title">{section.label}</h2>
      <div className="photos-grid">
        {section.photos.map((photo) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            selected={selectedPhotoIds.has(photo.id)}
            onToggle={onTogglePhoto}
          />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Implement `PhotosStatusBar`**

Create `src/features/photos/PhotosStatusBar.jsx`:

```jsx
import { formatSelectionStatus } from "./photoSelectionModel";

export function PhotosStatusBar({ selectedCount, totalCount, onClear }) {
  return (
    <footer className="photos-status-bar">
      <span>{formatSelectionStatus(selectedCount, totalCount)}</span>
      {selectedCount > 0 && (
        <button type="button" onClick={onClear}>
          Clear selection
        </button>
      )}
    </footer>
  );
}
```

- [ ] **Step 4: Implement `PhotosContent`**

Create `src/features/photos/PhotosContent.jsx` with these responsibilities:

```jsx
const [query, setQuery] = useState("");
const [selectedPhotoIds, setSelectedPhotoIds] = useState(() => new Set());

const visibleSections = filterPhotoSections(photoSections, query);
const totalCount = photoCatalog.length;

const handleTogglePhoto = (photoId, additive) => {
  setSelectedPhotoIds((current) =>
    updatePhotoSelection(current, photoId, additive),
  );
};
```

The rendered structure must contain:

```text
.photos-app
├── .photos-window-header
├── .photos-toolbar
├── .photos-layout
│   ├── .photos-sidebar
│   └── .photos-content
└── PhotosStatusBar
```

The sidebar lists `visibleSections`. Clicking a section calls `document.getElementById(sectionAnchor).scrollIntoView({ behavior: "smooth" })`. Do not add a router for section navigation.

The empty state must distinguish these cases:

- No files exist in `src/content/photos/`.
- Files exist but the search query matches nothing.

- [ ] **Step 5: Add isolated Photos Sass styles**

Create `src/styles/components/Photos/Photos.scss` with selectors prefixed by `.photos-`. Include these rules:

- Flexible sidebar width between `180px` and `240px`.
- Scrollable content area with grid layout.
- Grid columns using `repeat(auto-fill, minmax(140px, 1fr))`.
- Consistent thumbnail aspect ratio of `1 / 1`.
- Selected card outline using the existing blue theme token or `#0a84ff` fallback.
- Bottom status bar fixed within the app content, not the browser viewport.
- Dark and light theme selectors compatible with existing `dark-theme` and `light-theme` classes.
- Keyboard focus outline that remains visible.

- [ ] **Step 6: Import the Photos stylesheet**

Add this line to `src/styles/features/main.scss` after the other application styles:

```scss
@use "../components/Photos/Photos";
```

Do not rewrite existing global selectors or move unrelated Sass imports.

- [ ] **Step 7: Run model tests and build the UI**

Run:

```bash
npm test
npm run build
```

Expected result:

- All model tests pass.
- Vite builds successfully with an empty photo catalog.
- No import resolution error occurs for `src/content/photos/`.

- [ ] **Step 8: Commit the gallery UI task**

Run:

```bash
git add src/features/photos/PhotosContent.jsx \
  src/features/photos/PhotoSection.jsx \
  src/features/photos/PhotoCard.jsx \
  src/features/photos/PhotosStatusBar.jsx \
  src/styles/components/Photos/Photos.scss \
  src/styles/features/main.scss
git commit -m "feat: add photo gallery UI"
```

## Task 4: Integrate Photos into the desktop shell

**Files:**

- Modify: `src/core/constants/apps.jsx:18-82`
- Modify: `src/core/constants/positions.jsx:1-8`
- Modify: `src/windows/Dock.jsx:20-30`
- Modify: `src/utils/renderAppContent.jsx:4-37`

**Interfaces:**

- Consumes: `PhotosContent({ onClose, onMinimize, onMaximize })`.
- Produces: app ID `photos` that can be opened by the Dock and rendered by the existing `WindowList`.
- Produces: initial window position `{ x, y, w, h }` for `photos`.

- [ ] **Step 1: Write the failing integration smoke check**

Before editing shell files, add a temporary manual checklist to the task execution log and verify the current implementation cannot satisfy it:

```text
1. `APPS` contains an item with id `photos`.
2. `DOCK_APPS` includes the `photos` item.
3. `INITIAL_POSITIONS.photos` exists.
4. `renderAppContent("photos", callbacks)` returns PhotosContent.
```

The current branch must fail items 1 through 4 because the Photos app is not registered. Do not add a new test dependency for this smoke check.

- [ ] **Step 2: Register the Photos app with an original fallback icon**

Append this item to `APPS` in `src/core/constants/apps.jsx`:

```js
{
  id: "photos",
  name: "Photos",
  icon: "🖼",
  color: "#0a84ff",
},
```

Do not add Apple Photos icons or copy proprietary artwork. `AssetIcon` already renders the `icon` fallback when `iconPath` is absent.

- [ ] **Step 3: Register the initial window position**

Add this entry to `src/core/constants/positions.jsx`:

```js
photos: { x: 120, y: 64, w: 980, h: 650 },
```

The window must remain inside the existing menu bar and Dock layout.

- [ ] **Step 4: Add Photos to the Dock**

Insert this entry into `DOCK_APPS` in `src/windows/Dock.jsx`:

```js
APPS.find((app) => app.id === "photos"),
```

Place it with the other content apps before the divider. Do not modify magnification logic or Dock item behavior.

- [ ] **Step 5: Lazy-load and dispatch Photos content**

Add the lazy import to `src/utils/renderAppContent.jsx`:

```jsx
const PhotosContent = lazy(() =>
  import("@/features/photos/PhotosContent").then((module) => ({
    default: module.PhotosContent,
  })),
);
```

Add a switch branch using the existing `commonProps`:

```jsx
case "photos":
  return (
    <Suspense fallback={<WindowLoading />}>
      <PhotosContent {...commonProps} />
    </Suspense>
  );
```

- [ ] **Step 6: Verify the registered application**

Run:

```bash
npm test
npm run build
```

Expected result:

- All tests pass.
- Production build succeeds.
- Opening Photos from the Dock creates one window.
- Reopening the Dock item focuses the existing window.
- Closing and reopening does not duplicate the window.
- The Photos UI shows an empty state until photos are committed.

- [ ] **Step 7: Manually verify with fixture images**

Add two non-sensitive local fixture images only in the working tree:

```text
src/content/photos/favorites/fixture-favorite.jpg
src/content/photos/travel/fixture-travel.jpg
```

Run:

```bash
npm run build
npm run preview
```

Verify in the browser:

- Favorites and Travel appear as separate sections.
- Each image appears in the correct section.
- Search filters by filename.
- Normal click selects one image.
- `Meta` or `Control` click adds a second image.
- The bottom status bar changes to `2 photos selected`.
- Clear selection returns the status text to the total count.
- The production URL works below `/macweb.dev/`.

Remove fixture images before committing unless they are intentionally part of the gallery.

- [ ] **Step 8: Commit the shell integration task**

Run:

```bash
git add src/core/constants/apps.jsx \
  src/core/constants/positions.jsx \
  src/windows/Dock.jsx \
  src/utils/renderAppContent.jsx
git commit -m "feat: integrate photo gallery app"
```

## Final verification

After all task commits exist, run the complete verification set:

```bash
npm test
npm run build
git status --short
git log --oneline -4
```

Expected result:

- Test command exits with 0 failures.
- Vite build exits with status 0.
- `git status --short` contains only intentionally untracked photo content or unrelated pre-existing files.
- The last four commits contain one commit per implementation task.
- No unrelated existing file is staged.

## Acceptance criteria

- A photo added to `src/content/photos/<section>/` appears in the corresponding UI section after build and deployment.
- A new section appears automatically when its first supported image is added.
- Unsupported file extensions do not render.
- Nested section folders do not render on the MVP path.
- Asset URLs work with the production base `/macweb.dev/`.
- The gallery has a sidebar, search toolbar, section headings, photo grid, and bottom selection status.
- Selection state uses relative asset IDs.
- The status bar does not delete, upload, or mutate repository files.
- No runtime GitHub token or API call is introduced.
- Existing applications continue to pass the current Node test suite and production build.
- The feature adds no external dependency.

## Scope boundaries

This plan does not implement runtime upload, private galleries, GitHub API integration, EXIF search, database persistence, image editing, face recognition, object recognition, or Cloud sync. Each of those changes would require a separate design because it changes the storage, security, or deployment model.
