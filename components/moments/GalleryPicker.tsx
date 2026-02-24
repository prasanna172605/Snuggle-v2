import React, { useRef } from 'react';
import { X, Settings, Camera, Music, Image as ImageIcon, Sparkles, Layout } from 'lucide-react';
import { motion } from 'framer-motion';

interface GalleryPickerProps {
  onClose: () => void;
  onSelect: (file: File) => void;
  onLaunchCamera: () => void;
}

const GALLERY_CHIPS = [
  { id: 'templates', label: 'Templates', icon: Layout, color: 'bg-purple-600' },
  { id: 'music', label: 'Music', icon: Music, color: 'bg-cyan-500' },
  { id: 'ai', label: 'AI images', icon: Sparkles, color: 'bg-pink-500' },
];

const GalleryPicker: React.FC<GalleryPickerProps> = ({ onClose, onSelect, onLaunchCamera }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onSelect(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 pt-safe">
        <button onClick={onClose} className="p-2">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-[17px] font-bold">Add to story</h2>
        <button className="p-2">
          <Settings className="w-6 h-6" />
        </button>
      </div>

      {/* Horizontal Chips */}
      <div className="flex gap-2.5 px-4 py-4 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
        {GALLERY_CHIPS.map((chip) => (
          <button
            key={chip.id}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl ${chip.color} flex-shrink-0 transition-transform active:scale-95`}
          >
            <chip.icon className="w-5 h-5 text-white" />
            <span className="text-sm font-bold">{chip.label}</span>
          </button>
        ))}
      </div>

      {/* Recents Dropdown */}
      <div className="flex items-center gap-1 px-5 py-3">
        <span className="font-bold text-[17px]">Recents</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5"><path d="m6 9 6 6 6-6"/></svg>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-0.5">
        <div className="grid grid-cols-3 gap-0.5">
          {/* First Item: Camera */}
          <button
            onClick={onLaunchCamera}
            className="aspect-[3/4] bg-zinc-900 flex flex-col items-center justify-center gap-2 transition-colors hover:bg-zinc-800"
          >
            <Camera className="w-10 h-10 text-white" />
            <span className="text-xs font-bold">Camera</span>
          </button>

          {/* Placeholders / Call to Action */}
          {Array.from({ length: 11 }).map((_, i) => (
            <button
              key={i}
              onClick={() => fileInputRef.current?.click()}
              className="aspect-[3/4] bg-zinc-800 relative group overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/5 group-hover:bg-white/10 transition-colors" />
              {i === 0 && (
                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                    <ImageIcon className="w-12 h-12" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default GalleryPicker;
