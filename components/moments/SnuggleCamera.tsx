import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, ZapOff, SwitchCamera, Image as ImageIcon, Camera, Settings, Sparkles, Type, Infinity, Grid } from 'lucide-react';

// ==================== FILTER DEFINITIONS ====================

export const CAMERA_FILTERS = [
  { id: 'none', name: 'Normal', css: 'none' },
  { id: 'warm', name: 'Warm', css: 'sepia(30%) saturate(140%) brightness(110%)' },
  { id: 'cool', name: 'Cool', css: 'hue-rotate(180deg) saturate(80%) brightness(105%)' },
  { id: 'retro', name: 'Retro', css: 'sepia(60%) contrast(120%) brightness(90%)' },
  { id: 'glitch', name: 'Glitch', css: 'contrast(150%) hue-rotate(90deg) saturate(200%)' },
  { id: 'cartoon', name: 'Cartoon', css: 'contrast(200%) saturate(150%) brightness(110%)' },
  { id: 'noir', name: 'Noir', css: 'grayscale(100%) contrast(130%) brightness(90%)' },
  { id: 'dreamy', name: 'Dreamy', css: 'brightness(110%) saturate(120%) blur(0.5px)' },
];

type CameraMode = 'photo' | 'video' | 'loop' | 'layout';

interface SnuggleCameraProps {
  onCapture: (media: Blob, type: 'image' | 'video' | 'layout', filter: string) => void;
  onClose: () => void;
  onGalleryPick: () => void;
  recentUsers?: { avatar?: string; photoURL?: string }[];
}

const SnuggleCamera: React.FC<SnuggleCameraProps> = ({ onCapture, onClose, onGalleryPick, recentUsers }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const layoutPhotosRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<CameraMode>('photo');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [flashOn, setFlashOn] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [activeFilter, setActiveFilter] = useState('none');
  const [showFilters, setShowFilters] = useState(false);
  const [layoutCount, setLayoutCount] = useState(0);
  const [layoutTarget] = useState(4);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Zoom state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);

  // Shutter: tap=photo, hold=video
  const shutterTimerRef = useRef<number | null>(null);
  const shutterHeld = useRef(false);
  const recordingTimerRef = useRef<number | null>(null);

  // Double-tap to flip
  const lastTapRef = useRef(0);

  // Pinch-to-zoom state
  const pinchStartDistance = useRef(0);
  const pinchStartZoom = useRef(1);

  // ---- Start Camera ----
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: mode === 'video' || mode === 'loop',
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
        setError(null);
      }

      // Detect zoom capabilities
      const videoTrack = stream.getVideoTracks()[0];
      const caps = videoTrack.getCapabilities?.() as any;
      if (caps?.zoom) {
        setMinZoom(caps.zoom.min || 1);
        setMaxZoom(caps.zoom.max || 1);
        setZoomLevel(caps.zoom.min || 1);
      } else {
        setMinZoom(1);
        setMaxZoom(1);
        setZoomLevel(1);
      }

      // Flash (torch) support
      if (flashOn && caps?.torch) {
        await videoTrack.applyConstraints({ advanced: [{ torch: true } as any] });
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      setError('Camera access denied. Please allow camera permissions.');
    }
  }, [facingMode, mode, flashOn]);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [startCamera]);

  // ---- Apply zoom via track constraints ----
  const applyZoom = useCallback(async (level: number) => {
    if (!streamRef.current) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    const clamped = Math.max(minZoom, Math.min(maxZoom, level));
    setZoomLevel(clamped);
    try {
      await videoTrack.applyConstraints({ advanced: [{ zoom: clamped } as any] });
    } catch {}
  }, [minZoom, maxZoom]);

  // ---- Pinch-to-zoom (touch) ----
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDistance.current = Math.sqrt(dx * dx + dy * dy);
      pinchStartZoom.current = zoomLevel;
    }
  }, [zoomLevel]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const scale = dist / pinchStartDistance.current;
      const newZoom = pinchStartZoom.current * scale;
      applyZoom(newZoom);
    }
  }, [applyZoom]);

  // ---- Double-tap to flip ----
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
      lastTapRef.current = 0; // reset
    } else {
      lastTapRef.current = now;
    }
  }, []);

  // ---- Capture Photo ----
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;

    const isFrontCamera = facingMode === 'user';
    if (isFrontCamera) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    ctx.filter = 'none';

    return new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
      }, 'image/webp', 0.9);
    });
  }, [activeFilter]);

  // ---- Shutter: tap=photo, hold=video ----
  const handleShutterDown = useCallback(() => {
    shutterHeld.current = false;

    // After 400ms, start recording (hold gesture)
    shutterTimerRef.current = window.setTimeout(() => {
      shutterHeld.current = true;
      startRecording();
    }, 400);
  }, []);

  const handleShutterUp = useCallback(async () => {
    if (shutterTimerRef.current) {
      clearTimeout(shutterTimerRef.current);
      shutterTimerRef.current = null;
    }

    if (shutterHeld.current && isRecording) {
      // End hold-to-record
      stopRecording();
      shutterHeld.current = false;
    } else if (!shutterHeld.current) {
      // Quick tap: take photo or handle layout
      if (mode === 'layout') {
        const blob = await capturePhoto();
        if (blob) {
          layoutPhotosRef.current.push(blob);
          setLayoutCount(prev => prev + 1);
          if (layoutPhotosRef.current.length >= layoutTarget) {
            const composed = await composeLayout(layoutPhotosRef.current);
            layoutPhotosRef.current = [];
            setLayoutCount(0);
            onCapture(composed, 'layout', activeFilter);
          }
        }
      } else {
        // Photo mode (tap)
        const blob = await capturePhoto();
        if (blob) onCapture(blob, 'image', activeFilter);
      }
    }
  }, [isRecording, mode, capturePhoto, activeFilter, layoutTarget, onCapture]);

  // ---- Start Recording ----
  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current, {
      mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm',
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      onCapture(blob, 'video', activeFilter);
      setIsRecording(false);
      setRecordingTime(0);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    setRecordingTime(0);

    recordingTimerRef.current = window.setInterval(() => {
      setRecordingTime(prev => {
        const next = prev + 1;
        const maxTime = mode === 'loop' ? 5 : 300;
        if (next >= maxTime) {
          stopRecording();
          return maxTime;
        }
        return next;
      });
    }, 1000);
  }, [activeFilter, mode, onCapture]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  }, []);

  // ---- Compose Layout Grid ----
  const composeLayout = async (photos: Blob[]): Promise<Blob> => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d')!;

    const count = photos.length;
    const cols = 2;
    const rows = count <= 2 ? 1 : 2;
    const cellW = canvas.width / cols;
    const cellH = canvas.height / rows;
    const gap = 4;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const images = await Promise.all(
      photos.map(blob => {
        return new Promise<HTMLImageElement>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.src = URL.createObjectURL(blob);
        });
      })
    );

    images.forEach((img, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * cellW + gap;
      const y = row * cellH + gap;
      const w = cellW - gap * 2;
      const h = cellH - gap * 2;

      const scale = Math.max(w / img.width, h / img.height);
      const sw = w / scale;
      const sh = h / scale;
      const sx = (img.width - sw) / 2;
      const sy = (img.height - sh) / 2;

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 12);
      ctx.clip();
      ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
      ctx.restore();
    });

    return new Promise<Blob>((resolve) => {
      canvas.toBlob(blob => resolve(blob!), 'image/webp', 0.9);
    });
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const filterObj = CAMERA_FILTERS.find(f => f.id === activeFilter);

  // Zoom preset buttons for desktop
  const zoomPresets = maxZoom > 1 ? [
    { label: '1×', value: minZoom },
    { label: '2×', value: Math.min(minZoom * 2, maxZoom) },
  ] : [];

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center gap-4 text-white">
        <Camera className="w-16 h-16 text-gray-500" />
        <p className="text-center px-8">{error}</p>
        <button onClick={onClose} className="px-6 py-2 bg-white/10 rounded-full">Close</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* ========== TOP BAR ========== */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 pt-safe">
        <button onClick={onClose} className="p-2">
          <X className="w-7 h-7 text-white drop-shadow-lg" />
        </button>

        {/* Flash toggle — center-top like IG */}
        <button
          onClick={() => setFlashOn(!flashOn)}
          className="p-2"
        >
          {flashOn
            ? <Zap className="w-6 h-6 text-yellow-400 drop-shadow-lg" />
            : <ZapOff className="w-6 h-6 text-white drop-shadow-lg" />
          }
        </button>

        {/* Settings / Filters */}
        <button onClick={() => setShowFilters(!showFilters)} className="p-2">
          <Settings className="w-6 h-6 text-white drop-shadow-lg" />
        </button>
      </div>

      {/* ========== RECORDING TIMER ========== */}
      {isRecording && (
        <div className="absolute top-14 left-0 right-0 z-20 flex justify-center">
          <div className="flex items-center gap-2 bg-red-600/90 backdrop-blur px-4 py-1.5 rounded-full">
            <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
            <span className="text-white text-sm font-mono font-bold">{formatTime(recordingTime)}</span>
          </div>
        </div>
      )}

      {/* Layout counter */}
      {mode === 'layout' && layoutCount > 0 && (
        <div className="absolute top-14 left-0 right-0 z-20 flex justify-center">
          <div className="bg-white/20 backdrop-blur px-4 py-1.5 rounded-full text-white text-sm font-bold">
            {layoutCount} / {layoutTarget}
          </div>
        </div>
      )}

      {/* ========== CAMERA PREVIEW (9:16 rounded) ========== */}
      <div
        ref={previewContainerRef}
        className="flex-1 relative overflow-hidden mx-1.5 mt-14 mb-1 rounded-[28px]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onClick={handleDoubleTap}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{
            filter: filterObj?.css !== 'none' ? filterObj?.css : undefined,
            transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
          }}
        />

        {/* LEFT SIDE TOOLS (Instagram-style: Aa, ∞, ✨) */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col gap-5 z-10">
          <button className="text-white drop-shadow-lg text-xl font-serif font-bold">Aa</button>
          <button className="text-white drop-shadow-lg">
            <Infinity className="w-6 h-6" />
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-white drop-shadow-lg"
          >
            <Sparkles className="w-6 h-6" />
          </button>
        </div>

        {/* ZOOM BUTTONS — desktop (1x / 2x) */}
        {zoomPresets.length > 0 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 hidden md:flex items-center gap-2">
            {zoomPresets.map(p => (
              <button
                key={p.label}
                onClick={() => applyZoom(p.value)}
                className={`w-10 h-10 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                  Math.abs(zoomLevel - p.value) < 0.1
                    ? 'bg-white/30 text-white scale-110'
                    : 'bg-black/40 text-white/70'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Layout Grid Overlay */}
        {mode === 'layout' && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-1 p-2">
              {Array.from({ length: layoutTarget }).map((_, i) => (
                <div key={i} className={`border-2 rounded-2xl transition-colors ${i < layoutCount ? 'border-green-400' : 'border-white/20'}`} />
              ))}
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* ========== FILTER STRIP (slide in above bottom bar) ========== */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="absolute bottom-40 left-0 right-0 z-20"
          >
            <div className="flex gap-3 overflow-x-auto px-4 py-3" style={{ scrollbarWidth: 'none' }}>
              {CAMERA_FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={`flex flex-col items-center gap-1 flex-shrink-0 transition ${activeFilter === f.id ? 'opacity-100 scale-110' : 'opacity-60'}`}
                >
                  <div className={`w-14 h-14 rounded-full border-2 overflow-hidden ${
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

      {/* ========== BOTTOM CONTROLS ========== */}
      <div className="pb-safe bg-black">
        {/* Shutter Row: gallery — recent avatars — [SHUTTER] — recent avatars — flip */}
        <div className="flex items-center justify-between px-4 py-3">
          {/* Gallery thumbnail */}
          <button
            onClick={onGalleryPick}
            className="w-11 h-11 rounded-xl bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center"
          >
            <ImageIcon className="w-5 h-5 text-zinc-400" />
          </button>

          {/* Recent user avatars (left) */}
          <div className="flex -space-x-2 pl-2">
            {(recentUsers || []).slice(0, 2).map((u, i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-black overflow-hidden">
                {(u.avatar || u.photoURL) ? (
                  <img src={u.avatar || u.photoURL || ''} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-zinc-700" />
                )}
              </div>
            ))}
          </div>

          {/* SHUTTER BUTTON — tap=photo, hold=video */}
          <button
            onPointerDown={handleShutterDown}
            onPointerUp={handleShutterUp}
            onPointerLeave={() => {
              if (shutterTimerRef.current) clearTimeout(shutterTimerRef.current);
              if (isRecording) stopRecording();
            }}
            className="relative w-[76px] h-[76px] flex items-center justify-center select-none touch-none"
          >
            {/* Progress ring for recording */}
            {isRecording && (
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 76 76">
                <circle cx="38" cy="38" r="35" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
                <circle
                  cx="38" cy="38" r="35" fill="none" stroke="#ef4444" strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 35}
                  strokeDashoffset={2 * Math.PI * 35 * (1 - recordingTime / (mode === 'loop' ? 5 : 300))}
                  className="transition-all duration-1000"
                />
              </svg>
            )}
            {/* Outer ring */}
            <div className={`absolute inset-0 rounded-full border-[3.5px] transition-colors ${
              isRecording ? 'border-red-500' : 'border-white'
            }`} />
            {/* Inner circle */}
            <div className={`rounded-full transition-all ${
              isRecording
                ? 'w-7 h-7 bg-red-500 rounded-[6px]'
                : 'w-[58px] h-[58px] bg-white'
            }`} />
          </button>

          {/* Recent user avatars (right) */}
          <div className="flex -space-x-2 pr-2">
            {(recentUsers || []).slice(2, 4).map((u, i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-black overflow-hidden">
                {(u.avatar || u.photoURL) ? (
                  <img src={u.avatar || u.photoURL || ''} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-zinc-700" />
                )}
              </div>
            ))}
          </div>

          {/* Switch camera */}
          <button
            onClick={toggleCamera}
            className="w-11 h-11 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center"
          >
            <SwitchCamera className="w-5 h-5 text-zinc-300" />
          </button>
        </div>

        {/* Mode Tabs at very bottom (Instagram-style) */}
        <div className="flex justify-center gap-5 pb-2 pt-0.5">
          {(['photo', 'video', 'loop', 'layout'] as CameraMode[]).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setLayoutCount(0); layoutPhotosRef.current = []; }}
              className={`text-[11px] font-bold uppercase tracking-widest py-1 transition-all ${
                mode === m ? 'text-white' : 'text-zinc-500'
              }`}
            >
              {m === 'photo' ? 'STORY' : m === 'video' ? 'REEL' : m === 'loop' ? 'LOOP' : 'LAYOUT'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SnuggleCamera;
