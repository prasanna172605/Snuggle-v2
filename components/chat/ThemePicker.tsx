
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Theme } from '../../types';
import { DBService } from '../../services/database';
import { Loader2, Check, Upload, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface ThemePickerProps {
  currentThemeId?: string;
  userId: string;
  onSelect: (theme: Theme) => void;
}

const DEFAULT_THEMES: Theme[] = [
  { id: 'dark', name: 'Original Dark', type: 'default', backgroundUrl: '' }, // No image = dark bg
  { id: 'neon', name: 'Neon City', type: 'default', backgroundUrl: 'https://images.unsplash.com/photo-1565214975484-3cfa9e56f914?q=80&w=600&auto=format&fit=crop' },
  { id: 'nature', name: 'Forest Mist', type: 'default', backgroundUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=600&auto=format&fit=crop' },
  { id: 'minimal', name: 'Minimal Grey', type: 'default', backgroundUrl: 'https://images.unsplash.com/photo-1449247709967-d4461a6a6103?q=80&w=600&auto=format&fit=crop' },
  { id: 'love', name: 'Sunset Love', type: 'default', backgroundUrl: 'https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00?q=80&w=600&auto=format&fit=crop' },
  { id: 'space', name: 'Deep Space', type: 'default', backgroundUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600&auto=format&fit=crop' }
];

const ThemePicker: React.FC<ThemePickerProps> = ({ currentThemeId, userId, onSelect }) => {
  const [themes, setThemes] = useState<Theme[]>(DEFAULT_THEMES);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadThemes();
  }, []);

  const loadThemes = async () => {
    setLoading(true);
    try {
      const customThemes = await DBService.getThemes();
      // Merge default and custom, ensuring no duplicates if defaults are in DB
      const allThemes = [...DEFAULT_THEMES, ...customThemes.filter(t => t.type === 'custom')];
      setThemes(allThemes);
    } catch (e) {
      console.error('Failed to load themes:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    setUploading(true);
    try {
      const newTheme = await DBService.createCustomTheme(userId, file);
      setThemes(prev => [...prev, newTheme]);
      onSelect(newTheme);
      toast.success('Theme uploaded!');
    } catch (e) {
      console.error('Theme upload failed:', e);
      toast.error('Failed to upload theme');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold text-white mb-4">Choose Theme</h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Default / Custom Themes */}
        {themes.map(theme => (
          <motion.div
            key={theme.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(theme)}
            className={`
              relative aspect-[9/16] rounded-xl overflow-hidden cursor-pointer border-2
              ${currentThemeId === theme.id ? 'border-cyan-500' : 'border-transparent'}
            `}
          >
            {theme.backgroundUrl ? (
              <img 
                src={theme.backgroundUrl} 
                alt={theme.name} 
                className="w-full h-full object-cover" 
              />
            ) : (
              <div className="w-full h-full bg-black flex items-center justify-center text-gray-500">
                <span className="text-xs">Default</span>
              </div>
            )}
            
            <div className="absolute inset-0 bg-black/20 flex flex-col justify-end p-2">
              <span className="text-white text-xs font-medium truncate">{theme.name}</span>
            </div>

            {currentThemeId === theme.id && (
              <div className="absolute top-2 right-2 bg-cyan-500 w-6 h-6 rounded-full flex items-center justify-center shadow-lg">
                <Check size={14} className="text-white" />
              </div>
            )}
          </motion.div>
        ))}

        {/* Upload Button */}
        <label className="relative aspect-[9/16] rounded-xl border-2 border-dashed border-gray-700 hover:border-gray-500 flex flex-col items-center justify-center cursor-pointer transition-colors bg-gray-900/50">
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={handleFileUpload} 
            disabled={uploading}
          />
          {uploading ? (
            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mb-2" />
          ) : (
            <ImagePlus className="w-8 h-8 text-gray-400 mb-2" />
          )}
          <span className="text-xs text-gray-400 font-medium">
            {uploading ? 'Uploading...' : 'Custom'}
          </span>
        </label>
      </div>
    </div>
  );
};

// Start Icon for upload
function ImagePlus({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" />
      <line x1="16" x2="22" y1="5" y2="5" />
      <line x1="19" x2="19" y1="2" y2="8" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}

export default ThemePicker;
