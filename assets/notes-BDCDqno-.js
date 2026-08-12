import{r as n,W as v,m as e}from"./finder-ZeMhxfli.js";function g(){const{onClose:a,onMinimize:l,onZoom:c,onTitleMouseDown:r}=n.useContext(v),d=[{id:1,title:"Histories",content:`Love arrives
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
`,modified:"Today"}],[s,m]=n.useState(d),[i,f]=n.useState(1),h=s.find(t=>t.id===i),u=t=>{m(x=>x.map(o=>o.id===i?{...o,content:t,modified:"Just now"}:o))};return e.jsxs("div",{className:"notes",children:[e.jsxs("div",{className:"notes-titlebar",onMouseDown:t=>!t.target.closest(".notes-traffic-light")&&r(t),children:[e.jsxs("div",{className:"notes-traffic-lights",children:[e.jsx("button",{className:"notes-traffic-light notes-traffic-light--close",onClick:a,title:"Close"}),e.jsx("button",{className:"notes-traffic-light notes-traffic-light--minimize",onClick:l,title:"Minimize"}),e.jsx("button",{className:"notes-traffic-light notes-traffic-light--zoom",onClick:c,title:"Zoom"})]}),e.jsx("span",{className:"notes-title",children:"Notes"})]}),e.jsxs("div",{className:"notes-body",children:[e.jsxs("div",{className:"notes-sidebar",children:[e.jsxs("div",{className:"notes-sidebar-header",children:["ALL NOTES — ",s.length]}),e.jsx("div",{className:"notes-list",children:s.map(t=>e.jsxs("div",{className:`notes-list-item ${i===t.id?"active":""}`,onClick:()=>f(t.id),children:[e.jsx("div",{className:"notes-item-title",children:t.title}),e.jsx("div",{className:"notes-item-modified",children:t.modified})]},t.id))})]}),e.jsx("textarea",{className:"notes-editor",value:h?.content||"",onChange:t=>u(t.target.value),placeholder:"Start writing..."})]})]})}export{g as NotesContent};
