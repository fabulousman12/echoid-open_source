import React, { useEffect, useState } from 'react';
import { IonSpinner } from '@ionic/react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { ffmpeg_thumnail } from 'ionic-thumbnail';
import imga from '../../public/favicon.png';
import { FaPlay } from "react-icons/fa";

interface Props {
  src: string; // sandbox URL or Blob URL
  style?: React.CSSProperties;
  className?: string;
  Name: string;
  Size: number;
  onClick?: () => void;
}

const hashString = (value: string): string => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
};

const VideoRenderer: React.FC<Props> = ({ src, style, className, Name, Size, onClick }) => {
  const [poster, setPoster] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generatePoster = async () => {
      setLoading(true);
      try {
        const thumbnail = await captureThumbnail2(src, Name, Size);
        setPoster(thumbnail || imga);
      } catch (err) {
        console.error('Error generating thumbnail:', err);
        setPoster(imga);
      } finally {
        setLoading(false);
      }
    };

    generatePoster();
  }, [src, Name, Size]);

  const captureThumbnail2 = async (
    nativePath: string,
    fileName: string,
    fileSize: number
  ): Promise<string | null> => {
    try {
      const folder = 'thumbnails';
      const srcKey = hashString(String(nativePath || ""));
      const nameKey = String(fileName || "video");
      const sizeKey = Number(fileSize || 0);
      const thumbnailFileName = `${nameKey}_${sizeKey}_${srcKey}_thumb.jpg`;
      const fullPath = `${folder}/${thumbnailFileName}`;

      // Try reading cached thumbnail
      try {
        const existing = await Filesystem.readFile({
          path: fullPath,
          directory: Directory.Cache,
        });
        return `data:image/jpeg;base64,${existing.data}`;
      } catch {
        // Not cached yet
      }

      // Generate new thumbnail using ffmpeg plugin
      const result = await ffmpeg_thumnail.generateThumbnail({ path: nativePath });
      const base64Thumbnail = result.data;
      if (!base64Thumbnail) throw new Error('No thumbnail data');

      // Save to cache
      await Filesystem.writeFile({
        path: fullPath,
        data: base64Thumbnail,
        directory: Directory.Cache,
        recursive: true,
      });

      return `data:image/jpeg;base64,${base64Thumbnail}`;
    } catch (error) {
      console.error('Failed to capture thumbnail:', error);
      return null;
    }
  };

  if (loading) return <IonSpinner name="dots" />;
  if (!poster) return <div>Failed to load video thumbnail</div>;

  return (
    <div
      className={className}
      style={{
        width: "100%",
        maxWidth: "min(92vw, 520px)",
        aspectRatio: "9 / 16",
        maxHeight: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        position: "relative",
        ...style,
      }}
      onClick={onClick}
    >
      <img
        src={poster}
        alt="Video thumbnail"
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
      <div
        style={{
          position: "absolute",
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "rgba(0,0,0,0.55)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
        }}
      >
        <FaPlay size={16} />
      </div>
    </div>
  );
};

export default VideoRenderer;
