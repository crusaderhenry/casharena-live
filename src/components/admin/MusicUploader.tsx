import { useState, useRef } from 'react';
import { Upload, Play, Pause, X, Loader2, Volume2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface MusicUploaderProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  bucketName?: string;
}

export const MusicUploader = ({ 
  label, 
  value, 
  onChange, 
  bucketName = 'game-music' 
}: MusicUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      toast.error('Please select an audio file (MP3, WAV, etc.)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${label.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.${fileExt}`;

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(data.path);

      onChange(urlData.publicUrl);
      toast.success(`${label} uploaded successfully!`);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload file');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const togglePlayPause = () => {
    if (!value) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(value);
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.onerror = () => {
        toast.error('Failed to play audio');
        setIsPlaying(false);
      };
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.src = value;
      audioRef.current.play().catch(() => {
        toast.error('Failed to play audio');
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  };

  const clearMusic = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    onChange('');
  };

  // Cleanup on unmount
  const handleUnmount = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs flex items-center gap-1.5">
        <Volume2 className="w-3 h-3" />
        {label}
      </Label>
      
      <div className="flex gap-2">
        <Input
          type="url"
          placeholder="Enter URL or upload file..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 text-xs"
        />
        
        {/* Upload Button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="shrink-0"
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
        </Button>
        
        {/* Preview Button */}
        {value && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={togglePlayPause}
            className="shrink-0"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </Button>
        )}
        
        {/* Clear Button */}
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearMusic}
            className="shrink-0 text-destructive hover:text-destructive"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {value && (
        <p className="text-xs text-muted-foreground truncate max-w-full">
          {value.split('/').pop()}
        </p>
      )}
    </div>
  );
};
