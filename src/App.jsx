// App.jsx
import { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import "./App.css";

function App() {
  const [elements, setElements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [history, setHistory] = useState([]);
  const canvasRef = useRef(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const resizeRef = useRef({ direction: null });

  const GRID_SIZE = 10;

  // ---------------- HISTORY ----------------
  const saveHistory = (newElements) => {
    setHistory((prev) => [...prev, elements]);
    setElements(newElements);
  };

  const undo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setElements(previous);
    setHistory(history.slice(0, -1));
  };

  // ---------------- ELEMENT CREATION ----------------
  const addRectangle = () => {
    saveHistory([...elements, { id: Date.now(), type: "rect", x: 100, y: 100, width: 200, height: 120, color: "#4f46e5" }]);
  };

  const addText = () => {
    saveHistory([...elements, { id: Date.now(), type: "text", x: 150, y: 150, text: "Edit Me", color: "#000", fontSize: 28, width: 150, height: 50 }]);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      saveHistory([...elements, { id: Date.now(), type: "image", x: 150, y: 150, width: 250, height: 200, src: event.target.result }]);
    };
    reader.readAsDataURL(file);
  };

  // ---------------- DRAG & RESIZE ----------------
  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (dragging && selectedId) {
      setElements((prev) =>
        prev.map((el) =>
          el.id === selectedId
            ? { ...el, x: Math.round((mouseX - offsetRef.current.x) / GRID_SIZE) * GRID_SIZE,
                             y: Math.round((mouseY - offsetRef.current.y) / GRID_SIZE) * GRID_SIZE }
            : el
        )
      );
    }

    if (resizing && selectedId) {
      setElements((prev) =>
        prev.map((el) => {
          if (el.id !== selectedId) return el;
          let newWidth = mouseX - el.x;
          let newHeight = mouseY - el.y;
          newWidth = Math.round(newWidth / GRID_SIZE) * GRID_SIZE;
          newHeight = Math.round(newHeight / GRID_SIZE) * GRID_SIZE;
          return { ...el, width: Math.max(20, newWidth), height: Math.max(20, newHeight) };
        })
      );
    }
  };

  const handleMouseUp = () => {
    setDragging(false);
    setResizing(false);
  };

  // ---------------- DELETE ----------------
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedId) return;
      if (e.key === "Delete") {
        saveHistory(elements.filter((el) => el.id !== selectedId));
        setSelectedId(null);
      }
      // Ctrl+D duplicate
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        const el = elements.find(el => el.id === selectedId);
        if (el) saveHistory([...elements, {...el, id: Date.now(), x: el.x + 20, y: el.y + 20}]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, elements]);

  // ---------------- LAYER ----------------
  const bringForward = () => {
    if (!selectedId) return;
    const idx = elements.findIndex((el) => el.id === selectedId);
    if (idx === elements.length - 1) return;
    const newElements = [...elements];
    const [el] = newElements.splice(idx, 1);
    newElements.splice(idx + 1, 0, el);
    setElements(newElements);
  };
  const sendBackward = () => {
    if (!selectedId) return;
    const idx = elements.findIndex((el) => el.id === selectedId);
    if (idx === 0) return;
    const newElements = [...elements];
    const [el] = newElements.splice(idx, 1);
    newElements.splice(idx - 1, 0, el);
    setElements(newElements);
  };

  // ---------------- TEMPLATE ----------------
  const loadInstagramTemplate = () => {
    setElements([
      { id: 1, type: "rect", x: 0, y: 0, width: 500, height: 500, color: "#f88dba" },
      { id: 2, type: "text", x: 150, y: 200, text: "SALE", color: "#fff", fontSize: 48, width: 200, height: 60 },
    ]);
  };

  // ---------------- EXPORT ----------------
  const exportPNG = async () => {
    const canvas = await html2canvas(canvasRef.current);
    const link = document.createElement("a");
    link.download = "design.png";
    link.href = canvas.toDataURL();
    link.click();
  };

  const exportPDF = async () => {
    const canvas = await html2canvas(canvasRef.current);
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF();
    pdf.addImage(imgData, "PNG", 10, 10, 180, 160);
    pdf.save("design.pdf");
  };

  // ---------------- ELEMENT STYLE UPDATE ----------------
  const updateText = (id, text) => setElements(prev => prev.map(el => el.id === id ? {...el,text}:el));
  const updateColor = (color) => setElements(prev => prev.map(el => el.id === selectedId ? {...el,color}:el));
  const updateFontSize = (size) => setElements(prev => prev.map(el => el.id === selectedId ? {...el,fontSize:size}:el));
  const updatePosition = (x,y) => setElements(prev => prev.map(el => el.id === selectedId ? {...el,x,y}:el));
  const updateSize = (w,h) => setElements(prev => prev.map(el => el.id === selectedId ? {...el,width:w,height:h}:el));

  // ---------------- RESIZE CORNER STYLES ----------------
  const cornerStyles = (corner, width, height) => {
    switch(corner){
      case "top-left": return { top:-5, left:-5 };
      case "top-right": return { top:-5, left:width-5 };
      case "bottom-left": return { top:height-5, left:-5 };
      case "bottom-right": return { top:height-5, left:width-5 };
      default: return {};
    }
  };

  return (
    <div className="main-container">
      <h1 className="main-title">MINI DESIGN CANVAS EDITOR</h1>
      <div className="app">
        <div className="sidebar">
          <h2>Tools</h2>
          <button onClick={addRectangle}>Rectangle</button>
          <button onClick={addText}>Text</button>
          <input type="file" accept="image/*" onChange={handleImageUpload}/>
          <hr />
          <h3>Templates</h3>
          <button onClick={loadInstagramTemplate}>Instagram Post</button>
          <button onClick={undo}>Undo</button>

          {selectedId && (
            <>
              <hr />
              <h3>Properties</h3>
              <input type="color" onChange={e=>updateColor(e.target.value)} style={{width:"100%",height:40,marginBottom:10}}/>
              {elements.find(el=>el.id===selectedId)?.type==="text" && (
                <>
                  <label style={{fontSize:12}}>Font Size</label>
                  <input type="range" min="12" max="100" value={elements.find(el=>el.id===selectedId)?.fontSize} onChange={e=>updateFontSize(Number(e.target.value))}/>
                </>
              )}
              <label>Position X:</label>
              <input type="number" value={elements.find(el=>el.id===selectedId)?.x} onChange={e=>updatePosition(Number(e.target.value),elements.find(el=>el.id===selectedId)?.y)}/>
              <label>Position Y:</label>
              <input type="number" value={elements.find(el=>el.id===selectedId)?.y} onChange={e=>updatePosition(elements.find(el=>el.id===selectedId)?.x,Number(e.target.value))}/>
              <label>Width:</label>
              <input type="number" value={elements.find(el=>el.id===selectedId)?.width} onChange={e=>updateSize(Number(e.target.value),elements.find(el=>el.id===selectedId)?.height)}/>
              <label>Height:</label>
              <input type="number" value={elements.find(el=>el.id===selectedId)?.height} onChange={e=>updateSize(elements.find(el=>el.id===selectedId)?.width,Number(e.target.value))}/>
              <button onClick={bringForward}>Bring Forward</button>
              <button onClick={sendBackward}>Send Backward</button>
            </>
          )}

          <hr />
          <button onClick={exportPNG}>Export PNG</button>
          <button onClick={exportPDF}>Export PDF</button>
        </div>

        <div className="canvas-area" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
          <div className="canvas" ref={canvasRef}>
            {/* Alignment Guides */}
            {selectedId && <>
              <div style={{position:"absolute",top:0,left:"50%",width:1,height:"100%",background:"rgba(99,102,241,0.4)",pointerEvents:"none"}}/>
              <div style={{position:"absolute",top:"50%",left:0,height:1,width:"100%",background:"rgba(99,102,241,0.4)",pointerEvents:"none"}}/>
            </>}
            
            {elements.map(el=>(
              <div
                key={el.id}
                onMouseDown={(e)=>{
                  const rect = e.target.getBoundingClientRect();
                  const isCorner = e.target.dataset.corner;
                  if(isCorner){ resizeRef.current = {direction:e.target.dataset.corner}; setResizing(true); }
                  else { offsetRef.current = {x:e.clientX - rect.left, y:e.clientY - rect.top}; setDragging(true); }
                  setSelectedId(el.id);
                }}
                style={{
                  position:"absolute",
                  left:el.x,
                  top:el.y,
                  width:el.width,
                  height:el.height,
                  backgroundColor:el.type==="rect"?el.color:"transparent",
                  color:el.color,
                  fontSize:el.fontSize,
                  border:selectedId===el.id?"2px dashed #4f46e5":"none",
                  cursor:dragging?"grabbing":"move",
                  display:"flex",
                  justifyContent:"center",
                  alignItems:"center"
                }}
                contentEditable={el.type==="text"}
                suppressContentEditableWarning
                onBlur={e=>el.type==="text" && updateText(el.id,e.target.innerText)}
              >
                {el.type==="text" && el.text}
                {el.type==="image" && <img src={el.src} alt="" style={{width:"100%",height:"100%"}} />}
                {/* Resize corners */}
                {selectedId===el.id && ["top-left","top-right","bottom-left","bottom-right"].map(corner=>(
                  <div key={corner} data-corner={corner} style={{width:10,height:10,backgroundColor:"#4f46e5",position:"absolute",cursor:`${corner}-resize`,...cornerStyles(corner,el.width,el.height)}}/>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;