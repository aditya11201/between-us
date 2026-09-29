import { useEffect, useState } from "react";
import { photoCatalog, photoSections } from "./photoCatalog.js";
import { fetchDrivePhotos } from "./drivePhotos.js";
import { isDriveConfigured } from "./driveConfig.js";
import { mergePhotoLibrary } from "./photoLibraryModel.js";

export function usePhotoLibrary() {
  const [driveResult, setDriveResult] = useState(null);
  const [status, setStatus] = useState(isDriveConfigured() ? "loading" : "local");

  useEffect(() => {
    if (!isDriveConfigured()) return undefined;

    let cancelled = false;
    fetchDrivePhotos()
      .then((result) => {
        if (!cancelled) {
          setDriveResult(result);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const driveData = status === "ready" && driveResult
    ? driveResult
    : { photos: [], sections: [] };

  return {
    ...mergePhotoLibrary({ catalog: photoCatalog, sections: photoSections }, driveData),
    status,
  };
}
