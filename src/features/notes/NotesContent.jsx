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
      content: `I’m sorry for what happened the other day.

Looking back at it now with a clearer mind, I realize that my emotions got the better of me. I was scared, overwhelmed, and somewhere along the way, I acted against something I’ve always believed about love.

Love should never have to be forced.

It shouldn’t have to be convinced, negotiated, or proven until someone finally gives in. Real feelings come in their own way, in their own time, and I’m sorry if the way I acted made you feel pressured, hurt, or as if I was asking your heart to give me something it simply wasn’t ready to give.

I’ve learned a lot from what happened.

And I think I understand something now that I should have understood more clearly before:

loving you does not have to mean having you.

What I feel for you doesn’t become less real just because you cannot return it in the same way. I don’t need to convince you to choose me, change your mind, or become someone you’re not ready to be.

I can simply care about you for who you are.

For the parts of you that are easy to understand, and the parts that may always remain a little complicated. For your strength, your fears, your softness, your silence, and all the little things that make you you.

And I finally understand that I’m not here to fix you.

I’m not here to become your cure.

Some wounds are yours to understand and heal in your own way, at your own pace. I can’t decide what healing should look like for you, and I don’t want to anymore.

I want to respect your process instead of trying to guide it.

I honestly still don’t know what my place in your life will look like from here. I don’t know whether staying will eventually be something I can do peacefully, or whether someday I’ll need some distance to take care of my own heart too.

I’m still figuring that part out.

But whatever happens, I don’t want my care for you to become another weight you have to carry.

If one day you need someone to listen, someone to help, or simply someone you feel comfortable reaching out to, and I’m in a place where I’m able to be there, you can still ask.

Not because I’m waiting for another chance.

Not because I’m secretly hoping you’ll change your mind.

And not because I expect your feelings to eventually become the same as mine.

Simply because you became someone deeply important to me, and that doesn’t disappear overnight just because things didn’t turn out the way I once hoped.

I’m no longer trying to convince you to choose me.

I’m trying to learn how to respect your choice.

And maybe that is another form of love too.

Maybe love isn’t always about holding on.

Sometimes it’s letting go of expectations without turning the love into resentment.

Sometimes it’s accepting that someone’s path may not lead back to you and still genuinely hoping they find peace along the way.

So I’m not asking you to become anything for me anymore.

I just want you to become whatever version of yourself makes you feel safe, whole, and at peace.

And I hope I can learn to do the same for myself.

Whatever happens from here, thank you for being someone I was able to care about this deeply.`,
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
