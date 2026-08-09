import React, { useState, useContext } from "react";
import { WindowContext } from "@/windows";

export function NotesContent() {
  const { onClose, onMinimize, onZoom, onTitleMouseDown } = useContext(WindowContext);

  const initialNotes = [
    {
      id: 1,
      title: "Histories",
      content: "Love arrives\nand in its train come ecstasies\nold memories of pleasure\nancient histories of pain.\nYet if we are bold,\nlove strikes away the chains of fear\nfrom our souls.",
      modified: "Today",
    },
    {
      id: 2,
      title: "Home",
      content: "I'm falling in love with you and I guess it scares me because from the very beginning, I told myself not to.\n\nPart of me,\n\nthe human part of me, is warning me to be careful, to not allow myself to feel this way, to protect myself\n\nfrom getting hurt.\n\nBut my soul... my soul feels like I am home, and there is no reason to lock the door because I am safe.\n",
      modified: "Today",
    },
  ];

  const [notes, setNotes] = useState(initialNotes);
  const [activeId, setActiveId] = useState(1);

  const activeNote = notes.find((n) => n.id === activeId);

  const updateContent = (content) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === activeId
          ? { ...n, content, modified: "Just now" }
          : n
      )
    );
  };

  return (
    <div className="notes">
      {/* ── Custom Title Bar ── */}
      <div className="notes-titlebar" onMouseDown={(e) => !e.target.closest('.notes-traffic-light') && onTitleMouseDown(e)}>
        <div className="notes-traffic-lights">
          <button
            className="notes-traffic-light notes-traffic-light--close"
            onClick={onClose}
            title="Close"
          />
          <button
            className="notes-traffic-light notes-traffic-light--minimize"
            onClick={onMinimize}
            title="Minimize"
          />
          <button
            className="notes-traffic-light notes-traffic-light--zoom"
            onClick={onZoom}
            title="Zoom"
          />
        </div>
        <span className="notes-title">Notes</span>
      </div>

      {/* ── Main Content ── */}
      <div className="notes-body">
        {/* Sidebar */}
        <div className="notes-sidebar">
          <div className="notes-sidebar-header">
            ALL NOTES — {notes.length}
          </div>
          <div className="notes-list">
            {notes.map((note) => (
              <div
                key={note.id}
                className={`notes-list-item ${activeId === note.id ? "active" : ""}`}
                onClick={() => setActiveId(note.id)}
              >
                <div className="notes-item-title">{note.title}</div>
                <div className="notes-item-modified">{note.modified}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Editor */}
        <textarea
          className="notes-editor"
          value={activeNote?.content || ""}
          onChange={(e) => updateContent(e.target.value)}
          placeholder="Start writing..."
        />
      </div>
    </div>
  );
}
