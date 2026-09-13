export function mergePhotoLibrary(local, drive) {
  return {
    catalog: [...local.catalog, ...drive.photos],
    sections: [...local.sections, ...drive.sections],
  };
}
