import {
  createPhotoCatalog,
  groupPhotoCatalog,
} from "./photoCatalogModel.js";

const photoModules = import.meta.glob(
  "/src/content/photos/**/*.{jpg,jpeg,png,webp,gif,JPG,JPEG,PNG,WEBP,GIF}",
  {
    eager: true,
    query: "?url",
    import: "default",
  },
);

export const photoCatalog = createPhotoCatalog(photoModules);
export const photoSections = groupPhotoCatalog(photoCatalog);
