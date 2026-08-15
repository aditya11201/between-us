import{r as n,W as w,m as e}from"./finder-lHxtpFSB.js";function g(){const{onClose:i,onMinimize:r,onZoom:l,onTitleMouseDown:d}=n.useContext(w),m=[{id:1,title:"Histories",content:`Love arrives
and in its train come ecstasies
old memories of pleasure
ancient histories of pain.
Yet if we are bold,
love strikes away the chains of fear
from our souls.`,modified:"Today"},{id:2,title:"Home",content:`I'm falling in love with you and I guess it scares me because from the very beginning, I told myself not to.

Part of me,

the human part of me, is warning me to be careful, to not allow myself to feel this way, to protect myself

from getting hurt.

But my soul... my soul feels like I am home, and there is no reason to lock the door because I am safe.
`,modified:"Today"},{id:3,title:"Reason for Being",content:"I am a wanderer who has spent my life gazing at maps, while you are the north that keeps me from losing my way. Perhaps the universe is too vast to ever be possessed, yet somehow, every step I take always finds its way toward the same direction. Just as the sun never asks the Earth to revolve around it, you never asked me to make you the center of everything. And yet, without even realizing it, your name became the axis around which all my happiness revolves.",modified:"Today"},{id:4,title:"1",content:`I know I’m not perfect, but I want to be everything you dream of. I want to be the man who understands you—not just the big things, but the small details, too. I want you to tell me what makes you happy, what makes you laugh, and what makes you feel safe. Teach me how to love you the way you want to be loved. I don’t want to assume I know what you need; I want to listen and learn.

Your happiness means everything to me, and I will never stop trying to be the man who brings it to you. I want to be the one who shows up for you, who gets it right, and who learns from his mistakes. I will always be ready to grow, to change, and to love you more deeply than I did yesterday.

Tell me your dreams, your desires, and your fears, and I promise I’ll be right here. You deserve to be loved in a way that feels right to you, and I’m willing to do whatever it takes to be the person you need, because you are my number one.`,modified:"Today"}],[o,h]=n.useState(m),[s,c]=n.useState(4),u=o.find(t=>t.id===s),y=t=>{h(f=>f.map(a=>a.id===s?{...a,content:t,modified:"Just now"}:a))};return e.jsxs("div",{className:"notes",children:[e.jsxs("div",{className:"notes-titlebar",onMouseDown:t=>!t.target.closest(".notes-traffic-light")&&d(t),children:[e.jsxs("div",{className:"notes-traffic-lights",children:[e.jsx("button",{className:"notes-traffic-light notes-traffic-light--close",onClick:i,title:"Close"}),e.jsx("button",{className:"notes-traffic-light notes-traffic-light--minimize",onClick:r,title:"Minimize"}),e.jsx("button",{className:"notes-traffic-light notes-traffic-light--zoom",onClick:l,title:"Zoom"})]}),e.jsx("span",{className:"notes-title",children:"Notes"})]}),e.jsxs("div",{className:"notes-body",children:[e.jsxs("div",{className:"notes-sidebar",children:[e.jsxs("div",{className:"notes-sidebar-header",children:["ALL NOTES — ",o.length]}),e.jsx("div",{className:"notes-list",children:o.map(t=>e.jsxs("div",{className:`notes-list-item ${s===t.id?"active":""}`,onClick:()=>c(t.id),children:[e.jsx("div",{className:"notes-item-title",children:t.title}),e.jsx("div",{className:"notes-item-modified",children:t.modified})]},t.id))})]}),e.jsx("textarea",{className:"notes-editor",value:u?.content||"",onChange:t=>y(t.target.value),placeholder:"Start writing..."})]})]})}export{g as NotesContent};
