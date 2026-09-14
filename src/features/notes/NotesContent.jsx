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
    {
      id: 3,
      title: "Reason for Being",
      content: "I am a wanderer who has spent my life gazing at maps, while you are the north that keeps me from losing my way. Perhaps the universe is too vast to ever be possessed, yet somehow, every step I take always finds its way toward the same direction. Just as the sun never asks the Earth to revolve around it, you never asked me to make you the center of everything. And yet, without even realizing it, your name became the axis around which all my happiness revolves.",
      modified: "Today",
    },
    {
      id: 4,
      title: "1",
      content: `I know I’m not perfect, but I want to be everything you dream of. I want to be the man who understands you—not just the big things, but the small details, too. I want you to tell me what makes you happy, what makes you laugh, and what makes you feel safe. Teach me how to love you the way you want to be loved. I don’t want to assume I know what you need; I want to listen and learn.

Your happiness means everything to me, and I will never stop trying to be the man who brings it to you. I want to be the one who shows up for you, who gets it right, and who learns from his mistakes. I will always be ready to grow, to change, and to love you more deeply than I did yesterday.

Tell me your dreams, your desires, and your fears, and I promise I’ll be right here. You deserve to be loved in a way that feels right to you, and I’m willing to do whatever it takes to be the person you need, because you are my number one.`,
      modified: "Today",
    },
    {
      id: 5,
      title: "Without Having You",
      content: `I know now that loving you does not have to mean having you.

I don’t need you to become mine for what I feel for you to be real. I don’t need to convince you, change your mind, or ask you to give me something your heart is not ready to give.

I can simply love you for who you are.

For the parts of you that are easy to understand, and the parts that may always remain a little complicated. For your strength, your fears, your softness, your silence, and all the little things that make you who you are.

I’m not here to fix you, and I’m not here to become the answer to everything you’re going through. I finally understand that some things are yours to heal in your own way, at your own pace.

But if one day you need someone to listen, someone to help, or simply someone you can reach out to, I want you to know that I’ll still care. Not because I expect something in return, but because your place in my heart was never only about whether I could call you mine.

I’m no longer trying to convince you to choose me.

I’m choosing to respect you.

And maybe that is another form of love too.

Because love does not always have to end with possession. Sometimes love is staying kind even when you have to let go of expectations. Sometimes it is wishing someone peace even when their path does not lead back to you.

So I will love you as you are, without asking you to become anything for me.

And if life ever makes you need my help, and I’m able to give it, you can still ask.

Not because I’m waiting for my chance.

Not because I’m hoping you’ll change your mind.

Simply because, in one form or another, I still care about you.

And I think I always will.`,
      modified: "Today",
    },
  ];

  const [notes, setNotes] = useState(initialNotes);
  const [activeId, setActiveId] = useState(5);

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
