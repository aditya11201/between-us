import { formatSelectionStatus } from "./photoSelectionModel.js";

export function PhotosStatusBar({ selectedCount, totalCount, onClear }) {
  return (
    <footer className="photos-status-bar">
      <span role="status">{formatSelectionStatus(selectedCount, totalCount)}</span>
      {selectedCount > 0 && (
        <button type="button" onClick={onClear}>
          Clear selection
        </button>
      )}
    </footer>
  );
}
