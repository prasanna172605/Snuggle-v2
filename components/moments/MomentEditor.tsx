import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Type, Smile, Pencil, AtSign, Sparkles, Send, Palette, Undo2 } from 'lucide-react';
import { CAMERA_FILTERS } from './SnuggleCamera';

// ==================== LAYER TYPES ====================

interface TextLayer {
  id: string; text: string;
  x: number; y: number;
  fontSize: number; color: string;
  rotation: number;
}

interface StickerLayer {
  id: string; emoji: string;
  x: number; y: number;
  scale: number;
}

interface DrawPoint { x: number; y: number; }
interface DrawPath {
  id: string; points: DrawPoint[];
  color: string; width: number;
}

interface MomentEditorProps {
  media: Blob;
  mediaType: 'image' | 'video' | 'layout';
  initialFilter: string;
  onPublish: (finalBlob: Blob, textOverlay: string | undefined, mentions: string[], filter: string) => void;
  onDiscard: () => void;
}

const EMOJI_STICKERS = ['😊','😂','❤️','🔥','✨','💀','🥺','😭','🎉','💯','🥰','😍','🤣','💕','🙏','😎','👀','🤯','💖','🦋','🌟','🤗','😇','🌈'];
const TEXT_COLORS = ['#FFFFFF','#000000','#FF3B30','#FF9500','#FFCC00','#34C759','#007AFF','#AF52DE','#FF2D55','#5856D6'];

const MomentEditor: React.FC<MomentEditorProps> = ({ media, mediaType, initialFilter, onPublish, onDiscard }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [stickerLayers, setStickerLayers] = useState<StickerLayer[]>([]);
  const [drawPaths, setDrawPaths] = useState<DrawPath[]>([]);
  const [activeFilter, setActiveFilter] = useState(initialFilter);

  // Tool state
  const [activeTool, setActiveTool] = useState<'none' | 'text' | 'stickers' | 'draw' | 'mention' | 'filter'>('none');
  const [textInput, setTextInput] = useState('');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [textFontSize, setTextFontSize] = useState(32);
  const [mentionInput, setMentionInput] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  const [drawColor, setDrawColor] = useState('#FFFFFF');
  const [drawWidth, setDrawWidth] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<DrawPoint[]>([]);
  const [publishing, setPublishing] = useState(false);

  // Media preview
  const [mediaUrl, setMediaUrl] = useState('');

  useEffect(() => {
    const url = URL.createObjectURL(media);
    setMediaUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [media]);

  // ---- Add text layer ----
  const addText = () => {
    if (!textInput.trim()) return;
    setTextLayers(prev => [...prev, {
      id: Date.now().toString(),
      text: textInput.trim(),
      x: 50, y: 50,
      fontSize: textFontSize,
      color: textColor,
      rotation: 0,
    }]);
    setTextInput('');
    setActiveTool('none');
  };

  // ---- Add sticker ----
  const addSticker = (emoji: string) => {
    setStickerLayers(prev => [...prev, {
      id: Date.now().toString(),
      emoji,
      x: 50, y: 50,
      scale: 1,
    }]);
  };

  // ---- Add mention ----
  const addMention = () => {
    if (!mentionInput.trim()) return;
    const username = mentionInput.trim().replace('@', '');
    if (!mentions.includes(username)) {
      setMentions(prev => [...prev, username]);
    }
    // Also add as text overlay
    setTextLayers(prev => [...prev, {
      id: Date.now().toString(),
      text: `@${username}`,
      x: 50, y: 70,
      fontSize: 24,
      color: '#007AFF',
      rotation: 0,
    }]);
    setMentionInput('');
    setActiveTool('none');
  };

  // ---- Drawing handlers ----
  const handleDrawStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (activeTool !== 'draw') return;
    setIsDrawing(true);
    const point = getPoint(e);
    setCurrentPath([point]);
  };

  const handleDrawMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing || activeTool !== 'draw') return;
    const point = getPoint(e);
    setCurrentPath(prev => [...prev, point]);
    drawOnCanvas([...currentPath, point]);
  };

  const handleDrawEnd = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentPath.length > 1) {
      setDrawPaths(prev => [...prev, {
        id: Date.now().toString(),
        points: currentPath,
        color: drawColor,
        width: drawWidth,
      }]);
    }
    setCurrentPath([]);
  };

  const getPoint = (e: React.TouchEvent | React.MouseEvent): DrawPoint => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    if ('touches' in e) {
      return {
        x: ((e.touches[0].clientX - rect.left) / rect.width) * 100,
        y: ((e.touches[0].clientY - rect.top) / rect.height) * 100,
      };
    }
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  const drawOnCanvas = (points: DrawPoint[]) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Re-draw all saved paths
    drawPaths.forEach(path => {
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      path.points.forEach((p, i) => {
        const px = (p.x / 100) * canvas.width;
        const py = (p.y / 100) * canvas.height;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      });
      ctx.stroke();
    });

    // Draw current path
    if (points.length > 1) {
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = drawWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      points.forEach((p, i) => {
        const px = (p.x / 100) * canvas.width;
        const py = (p.y / 100) * canvas.height;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      });
      ctx.stroke();
    }
  };

  // ---- Undo last action ----
  const undo = () => {
    if (drawPaths.length > 0) {
      setDrawPaths(prev => prev.slice(0, -1));
    } else if (stickerLayers.length > 0) {
      setStickerLayers(prev => prev.slice(0, -1));
    } else if (textLayers.length > 0) {
      setTextLayers(prev => prev.slice(0, -1));
    }
    // Re-draw
    const canvas = drawCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // ---- Publish: flatten + compress + upload ----
  const handlePublish = async () => {
    setPublishing(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d')!;

      // 1. Draw base media
      if (mediaType === 'image' || mediaType === 'layout') {
        const img = await loadImage(mediaUrl);
        const filterObj = CAMERA_FILTERS.find(f => f.id === activeFilter);
        if (filterObj && filterObj.css !== 'none') {
          ctx.filter = filterObj.css;
        }
        // Cover-fill
        const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
        const sw = canvas.width / scale;
        const sh = canvas.height / scale;
        const sx = (img.width - sw) / 2;
        const sy = (img.height - sh) / 2;
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        ctx.filter = 'none';
      } else {
        // For video, grab first frame
        const vid = document.createElement('video');
        vid.src = mediaUrl;
        vid.muted = true;
        await new Promise<void>((res) => { vid.onloadeddata = () => res(); vid.load(); });
        vid.currentTime = 0;
        await new Promise<void>((res) => { vid.onseeked = () => res(); });
        ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
      }

      // 2. Draw paths
      drawPaths.forEach(path => {
        ctx.strokeStyle = path.color;
        ctx.lineWidth = path.width * (canvas.width / 100);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        path.points.forEach((p, i) => {
          const px = (p.x / 100) * canvas.width;
          const py = (p.y / 100) * canvas.height;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        });
        ctx.stroke();
      });

      // 3. Draw text layers
      textLayers.forEach(layer => {
        ctx.save();
        const px = (layer.x / 100) * canvas.width;
        const py = (layer.y / 100) * canvas.height;
        ctx.translate(px, py);
        ctx.rotate((layer.rotation * Math.PI) / 180);
        ctx.font = `bold ${layer.fontSize * (canvas.width / 360)}px 'Inter', sans-serif`;
        ctx.fillStyle = layer.color;
        ctx.textAlign = 'center';
        // Text shadow for readability
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 8;
        ctx.fillText(layer.text, 0, 0);
        ctx.restore();
      });

      // 4. Draw stickers
      stickerLayers.forEach(layer => {
        const px = (layer.x / 100) * canvas.width;
        const py = (layer.y / 100) * canvas.height;
        ctx.font = `${48 * layer.scale * (canvas.width / 360)}px serif`;
        ctx.textAlign = 'center';
        ctx.fillText(layer.emoji, px, py);
      });

      // 5. Export
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob(b => resolve(b!), 'image/webp', 0.9);
      });

      const textOverlay = textLayers.map(l => l.text).join(' | ') || undefined;
      onPublish(blob, textOverlay, mentions, activeFilter);
    } catch (err) {
      console.error('Publish error:', err);
    } finally {
      setPublishing(false);
    }
  };

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const filterObj = CAMERA_FILTERS.find(f => f.id === activeFilter);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top Bar — IG style: back arrow left, undo right */}
      <div className="flex items-center justify-between px-3 py-3 pt-safe">
        <button onClick={onDiscard} className="w-9 h-9 rounded-full bg-zinc-800/80 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <button onClick={undo} className="w-9 h-9 rounded-full bg-zinc-800/80 flex items-center justify-center">
          <Undo2 className="w-4.5 h-4.5 text-white" />
        </button>
      </div>

      {/* Preview Area */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden mx-1.5 rounded-[28px]"
        onTouchStart={handleDrawStart}
        onTouchMove={handleDrawMove}
        onTouchEnd={handleDrawEnd}
        onMouseDown={handleDrawStart}
        onMouseMove={handleDrawMove}
        onMouseUp={handleDrawEnd}
      >
        {/* Media preview */}
        {(mediaType === 'image' || mediaType === 'layout') ? (
          <img
            src={mediaUrl}
            className="w-full h-full object-cover"
            style={{ filter: filterObj?.css !== 'none' ? filterObj?.css : undefined }}
          />
        ) : (
          <video
            src={mediaUrl}
            className="w-full h-full object-cover"
            autoPlay loop muted playsInline
            style={{ filter: filterObj?.css !== 'none' ? filterObj?.css : undefined }}
          />
        )}

        {/* Drawing canvas overlay */}
        <canvas
          ref={drawCanvasRef}
          width={1080}
          height={1920}
          className="absolute inset-0 w-full h-full"
          style={{ touchAction: activeTool === 'draw' ? 'none' : 'auto' }}
        />

        {/* Text layers */}
        {textLayers.map(layer => (
          <div
            key={layer.id}
            className="absolute pointer-events-none select-none"
            style={{
              left: `${layer.x}%`, top: `${layer.y}%`,
              transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
              fontSize: `${layer.fontSize}px`,
              color: layer.color,
              fontWeight: 'bold',
              textShadow: '0 2px 8px rgba(0,0,0,0.5)',
              fontFamily: "'Inter', sans-serif",
              whiteSpace: 'nowrap',
            }}
          >
            {layer.text}
          </div>
        ))}

        {/* Sticker layers */}
        {stickerLayers.map(layer => (
          <div
            key={layer.id}
            className="absolute pointer-events-none select-none"
            style={{
              left: `${layer.x}%`, top: `${layer.y}%`,
              transform: `translate(-50%, -50%) scale(${layer.scale})`,
              fontSize: '48px',
            }}
          >
            {layer.emoji}
          </div>
        ))}
      </div>

      {/* IG-style Right Side Tools: label + icon */}
      <div className="absolute right-2.5 top-24 flex flex-col gap-4 z-20">
        {([
          { tool: 'text' as const, icon: Type, label: 'Text' },
          { tool: 'stickers' as const, icon: Smile, label: 'Stickers' },
          { tool: 'draw' as const, icon: Pencil, label: 'Draw' },
          { tool: 'mention' as const, icon: AtSign, label: 'Mention' },
          { tool: 'filter' as const, icon: Sparkles, label: 'Effects' },
        ]).map(({ tool, icon: Icon, label }) => (
          <button
            key={tool}
            onClick={() => setActiveTool(activeTool === tool ? 'none' : tool)}
            className="flex items-center gap-2"
          >
            <span className={`text-[11px] font-semibold transition-colors ${
              activeTool === tool ? 'text-white' : 'text-zinc-400'
            }`}>{label}</span>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              activeTool === tool ? 'bg-white text-black' : 'bg-zinc-800/80 text-white'
            }`}>
              <Icon className="w-[18px] h-[18px]" />
            </div>
          </button>
        ))}
      </div>

      {/* Tool Panels */}
      <AnimatePresence>
        {activeTool === 'text' && (
          <motion.div
            initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
            className="p-4 space-y-3"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                placeholder="Add text..."
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/40 focus:outline-none"
                autoFocus
              />
              <button onClick={addText} className="px-4 py-2 bg-white text-black rounded-xl font-bold text-sm">Add</button>
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {TEXT_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setTextColor(c)}
                  className={`w-8 h-8 rounded-full flex-shrink-0 border-2 ${textColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {activeTool === 'stickers' && (
          <motion.div
            initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
            className="p-4"
          >
            <div className="grid grid-cols-8 gap-2">
              {EMOJI_STICKERS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => addSticker(emoji)}
                  className="w-10 h-10 text-2xl flex items-center justify-center hover:bg-white/10 rounded-xl transition"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {activeTool === 'draw' && (
          <motion.div
            initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
            className="p-4 flex items-center gap-4"
          >
            <div className="flex gap-2">
              {['#FFFFFF', '#FF3B30', '#007AFF', '#FFCC00', '#34C759', '#AF52DE'].map(c => (
                <button
                  key={c}
                  onClick={() => setDrawColor(c)}
                  className={`w-7 h-7 rounded-full border-2 ${drawColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <input
              type="range" min="2" max="12" value={drawWidth}
              onChange={e => setDrawWidth(+e.target.value)}
              className="flex-1 accent-white"
            />
          </motion.div>
        )}

        {activeTool === 'mention' && (
          <motion.div
            initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
            className="p-4"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={mentionInput}
                onChange={e => setMentionInput(e.target.value)}
                placeholder="@username"
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/40 focus:outline-none"
                autoFocus
              />
              <button onClick={addMention} className="px-4 py-2 bg-blue-500 text-white rounded-xl font-bold text-sm">Add</button>
            </div>
            {mentions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {mentions.map(m => (
                  <span key={m} className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">@{m}</span>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTool === 'filter' && (
          <motion.div
            initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
            className="p-4"
          >
            <div className="flex gap-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {CAMERA_FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={`flex flex-col items-center gap-1 flex-shrink-0 ${activeFilter === f.id ? 'opacity-100' : 'opacity-60'}`}
                >
                  <div className={`w-14 h-14 rounded-2xl border-2 overflow-hidden ${
                    activeFilter === f.id ? 'border-white' : 'border-white/20'
                  }`}>
                    <div
                      className="w-full h-full bg-gradient-to-br from-pink-400 via-purple-500 to-blue-500"
                      style={{ filter: f.css !== 'none' ? f.css : undefined }}
                    />
                  </div>
                  <span className="text-[10px] text-white font-medium">{f.name}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* IG-style Bottom Bar: caption + Your story + Send */}
      <div className="px-3 py-3 pb-safe space-y-3">
        {/* Caption input */}
        <input
          type="text"
          placeholder="Add a caption..."
          className="w-full bg-transparent text-white text-sm placeholder-zinc-500 border-b border-zinc-800 pb-2 focus:outline-none focus:border-zinc-600 transition-colors"
        />

        {/* Publish row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-4 py-2 bg-zinc-800 rounded-full">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600" />
              <span className="text-white text-xs font-semibold">Your story</span>
            </div>
          </div>

          {/* Send button */}
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center disabled:opacity-50 transition-all"
          >
            {publishing ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5 text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MomentEditor;
