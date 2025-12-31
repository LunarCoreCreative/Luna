import React, { useEffect, useRef, useState } from "react";

const WS_URL = "ws://127.0.0.1:8001/ws/canvas";
const API_URL = "http://127.0.0.1:8001";

function Toolbar({ onAddNote, onAddRect, zoom, setZoom, onClear, onSave }) {
  return (
    <div className="fixed top-10 right-8 z-50 glass-panel rounded-xl border border-white/10 p-2 flex items-center gap-2">
      <button onClick={onAddNote} className="px-3 py-2 text-xs rounded bg-white/5 hover:bg-white/10 border border-white/10">Nota</button>
      <button onClick={onAddRect} className="px-3 py-2 text-xs rounded bg-white/5 hover:bg-white/10 border border-white/10">Retângulo</button>
      <div className="flex items-center gap-2 mx-2">
        <button onClick={() => setZoom(Math.max(0.2, zoom - 0.1))} className="px-2 py-2 text-xs rounded bg-white/5 hover:bg-white/10 border border-white/10">-</button>
        <span className="text-xs">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(Math.min(2, zoom + 0.1))} className="px-2 py-2 text-xs rounded bg-white/5 hover:bg-white/10 border border-white/10">+</button>
      </div>
      <button onClick={onClear} className="px-3 py-2 text-xs rounded bg-white/5 hover:bg-white/10 border border-white/10">Limpar</button>
      <button onClick={onSave} className="px-3 py-2 text-xs rounded bg-blue-600 hover:bg-blue-500">Salvar</button>
    </div>
  );
}

export default function CanvasView() {
  const [nodes, setNodes] = useState([]);
  const [zoom, setZoom] = useState(1);
  const [drag, setDrag] = useState(null);
  const boardRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_URL}/canvas`);
        const d = await r.json();
        if (d.success && d.canvas) setNodes(d.canvas.nodes || []);
      } catch {}
    })();
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        if (data.type === "init" && data.canvas) {
          setNodes(data.canvas.nodes || []);
        }
        if (data.type === "canvas_patch" && Array.isArray(data.ops)) {
          applyOps(data.ops);
        }
      } catch {}
    };
    return () => {
      try { ws.close(); } catch {}
    };
  }, []);

  const sendOps = (ops) => {
    try {
      wsRef.current?.send(JSON.stringify({ type: "patch", ops }));
    } catch {}
  };

  const applyOps = (ops) => {
    setNodes(prev => {
      let next = [...prev];
      ops.forEach(op => {
        if (op.op === "add") {
          next.push(op.node);
        } else if (op.op === "update") {
          next = next.map(n => n.id === op.id ? { ...n, ...(op.data || {}) } : n);
        } else if (op.op === "remove") {
          next = next.filter(n => n.id !== op.id);
        }
      });
      return next;
    });
  };

  const addNote = () => {
    const id = `n_${Date.now()}`;
    const node = { id, type: "note", x: 80, y: 80, w: 180, h: 120, text: "Clique para editar" };
    applyOps([{ op: "add", node }]);
    sendOps([{ op: "add", node }]);
  };

  const addRect = () => {
    const id = `n_${Date.now()}`;
    const node = { id, type: "rect", x: 120, y: 120, w: 220, h: 140, color: "#3b82f6" };
    applyOps([{ op: "add", node }]);
    sendOps([{ op: "add", node }]);
  };

  const onMouseDown = (e, n) => {
    e.stopPropagation();
    setDrag({ id: n.id, startX: e.clientX, startY: e.clientY, origX: n.x, origY: n.y });
  };

  useEffect(() => {
    const move = (e) => {
      if (!drag) return;
      const dx = (e.clientX - drag.startX) / zoom;
      const dy = (e.clientY - drag.startY) / zoom;
      const x = Math.round(drag.origX + dx);
      const y = Math.round(drag.origY + dy);
      applyOps([{ op: "update", id: drag.id, data: { x, y } }]);
    };
    const up = () => {
      if (drag) {
        sendOps([{ op: "update", id: drag.id, data: nodes.find(n => n.id === drag.id) }]);
      }
      setDrag(null);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [drag, zoom, nodes]);

  const editText = (id, text) => {
    applyOps([{ op: "update", id, data: { text } }]);
    sendOps([{ op: "update", id, data: { text } }]);
  };

  const removeNode = (id) => {
    applyOps([{ op: "remove", id }]);
    sendOps([{ op: "remove", id }]);
  };

  const clearBoard = () => {
    const ops = nodes.map(n => ({ op: "remove", id: n.id }));
    applyOps(ops);
    sendOps(ops);
  };

  const saveBoard = async () => {
    try {
      await fetch(`${API_URL}/canvas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canvas: { nodes, edges: [], meta: {} } })
      });
    } catch {}
  };

  return (
    <div className="w-full h-full relative overflow-hidden">
      <Toolbar onAddNote={addNote} onAddRect={addRect} zoom={zoom} setZoom={setZoom} onClear={clearBoard} onSave={saveBoard} />
      <div ref={boardRef} className="w-full h-full" style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
        {nodes.map(n => (
          <div key={n.id} style={{ position: "absolute", left: n.x, top: n.y, width: n.w, height: n.h }}
               className="group">
            {n.type === "note" ? (
              <div className="rounded-xl bg-yellow-300/80 text-gray-900 shadow-xl p-3 relative">
                <textarea value={n.text || ""} onChange={(e) => editText(n.id, e.target.value)}
                          className="w-full h-[80px] bg-transparent outline-none text-sm resize-none" />
                <button onClick={() => removeNode(n.id)}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs opacity-0 group-hover:opacity-100">x</button>
              </div>
            ) : (
              <div className="rounded-xl shadow-xl" style={{ backgroundColor: n.color || "#334155", width: "100%", height: "100%" }} />
            )}
            <div onMouseDown={(e) => onMouseDown(e, n)} className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white/80 text-xs text-gray-700 px-2 py-1 rounded-full shadow cursor-move">mover</div>
          </div>
        ))}
      </div>
    </div>
  );
}
