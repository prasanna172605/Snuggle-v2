import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import SnuggleCamera from '../components/moments/SnuggleCamera';
import MomentEditor from '../components/moments/MomentEditor';
import GalleryPicker from '../components/moments/GalleryPicker';
import { MomentService } from '../services/momentService';
import { User } from '../types';

interface CreateMomentProps {
  currentUser: User;
}

type Step = 'gallery' | 'camera' | 'editor';

const CreateMoment: React.FC<CreateMomentProps> = ({ currentUser }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('gallery');
  const [capturedMedia, setCapturedMedia] = useState<Blob | null>(null);
  const [capturedType, setCapturedType] = useState<'image' | 'video' | 'layout'>('image');
  const [capturedFilter, setCapturedFilter] = useState('none');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- Camera captured media → open editor ----
  const handleCapture = useCallback((media: Blob, type: 'image' | 'video' | 'layout', filter: string) => {
    setCapturedMedia(media);
    setCapturedType(type);
    setCapturedFilter(filter);
    setStep('editor');
  }, []);

  // ---- Gallery pick ----
  const handleFileSelect = (file: File) => {
    const isVideo = file.type.startsWith('video/');
    setCapturedMedia(file);
    setCapturedType(isVideo ? 'video' : 'image');
    setCapturedFilter('none');
    setStep('editor');
  };

  const handleLaunchCamera = () => {
    setStep('camera');
  };

  // ---- Publish from editor ----
  const handlePublish = async (
    finalBlob: Blob,
    textOverlay: string | undefined,
    mentions: string[],
    filter: string
  ) => {
    try {
      await MomentService.createMoment(
        currentUser.id,
        capturedType,
        finalBlob,
        textOverlay,
        mentions,
        filter
      );
      toast.success('Moment shared! ✨');
      navigate('/messages');
    } catch (err) {
      console.error('Failed to create moment:', err);
      toast.error('Failed to share moment');
    }
  };

  // ---- Discard editor → back to gallery ----
  const handleDiscard = () => {
    setCapturedMedia(null);
    setStep('gallery');
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
      />

      {step === 'gallery' && (
        <GalleryPicker
          onClose={() => navigate(-1)}
          onSelect={handleFileSelect}
          onLaunchCamera={handleLaunchCamera}
        />
      )}

      {step === 'camera' && (
        <SnuggleCamera
          onCapture={handleCapture}
          onClose={() => setStep('gallery')}
          onGalleryPick={() => setStep('gallery')}
        />
      )}

      {step === 'editor' && capturedMedia && (
        <MomentEditor
          media={capturedMedia}
          mediaType={capturedType}
          initialFilter={capturedFilter}
          onPublish={handlePublish}
          onDiscard={handleDiscard}
        />
      )}
    </>
  );
};

export default CreateMoment;
