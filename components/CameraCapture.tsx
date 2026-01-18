
import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, Video as VideoIcon } from 'lucide-react';

interface CameraCaptureProps {
    onCapture: (dataUrl: string, type: 'image' | 'video') => void;
    onClose: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [mode, setMode] = useState<'photo' | 'video'>('photo');
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, [facingMode]);

    const startCamera = async () => {
        stopCamera();
        try {
            const s = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: facingMode },
                audio: true // Request audio permission upfront for seamless switching
            });
            setStream(s);
            if (videoRef.current) {
                videoRef.current.srcObject = s;
            }
        } catch (e) {
            console.error("Camera error", e);
            alert("Unable to access camera. Please allow permissions.");
            onClose();
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(t => t.stop());
        }
    };

    const handleCapture = () => {
        if (mode === 'photo') {
            if (videoRef.current) {
                const canvas = document.createElement('canvas');
                canvas.width = videoRef.current.videoWidth;
                canvas.height = videoRef.current.videoHeight;
                canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
                const dataUrl = canvas.toDataURL('image/jpeg');
                onCapture(dataUrl, 'image');
            }
        } else {
            if (isRecording) {
                stopRecording();
            } else {
                startRecording();
            }
        }
    };

    const startRecording = () => {
        if (!stream) return;
        chunksRef.current = [];
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'video/webm' });
            const reader = new FileReader();
            reader.onloadend = () => {
                onCapture(reader.result as string, 'video');
            };
            reader.readAsDataURL(blob);
        };
        recorder.start();
        setIsRecording(true);
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const switchCamera = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <div className="relative flex-1 overflow-hidden bg-black flex items-center justify-center">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                
                <button onClick={onClose} className="absolute top-4 left-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors z-10">
                    <X className="w-6 h-6" />
                </button>
            </div>

            <div className="h-36 bg-black flex flex-col items-center justify-center pb-safe">
                <div className="flex items-center justify-around w-full px-8">
                     <button 
                        onClick={() => setMode(mode === 'photo' ? 'video' : 'photo')}
                        className="p-3 rounded-full bg-gray-800 text-white active:scale-95 transition-transform"
                        title="Switch Mode"
                     >
                         {mode === 'photo' ? <VideoIcon className="w-6 h-6" /> : <Camera className="w-6 h-6" />}
                     </button>

                     <button 
                        onClick={handleCapture}
                        className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all duration-200 ${isRecording ? 'bg-red-500 scale-110 border-red-300' : 'bg-white/20 hover:bg-white/30'}`}
                     >
                         <div className={`transition-all duration-200 ${mode === 'video' ? 'bg-red-500' : 'bg-white'} ${isRecording ? 'rounded-md w-8 h-8' : 'rounded-full w-16 h-16'}`} />
                     </button>

                     <button onClick={switchCamera} className="p-3 rounded-full bg-gray-800 text-white active:scale-95 transition-transform">
                         <RefreshCw className="w-6 h-6" />
                     </button>
                </div>
                <div className="mt-3 text-xs text-gray-400 font-medium uppercase tracking-widest">
                    {mode === 'video' ? (isRecording ? 'Recording...' : 'Video') : 'Photo'}
                </div>
            </div>
        </div>
    );
};

export default CameraCapture;
