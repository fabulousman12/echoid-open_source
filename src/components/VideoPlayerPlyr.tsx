import React, { useEffect, useState } from 'react';
import Plyr from "plyr-react";
import { IonSpinner } from '@ionic/react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { ffmpeg_thumnail } from 'ionic-thumbnail';
import imga from '../../public/favicon.png';
import { Capacitor } from '@capacitor/core';
interface Props {
  src: string;       // Sandbox path or Blob URL
  onClose: () => void;
  controls?: boolean;
  Name: string;
  Size: number;
  style?: React.CSSProperties;
}

const VideoPlayerPlyr: React.FC<Props> = ({ src, onClose, controls = true, style, Name, Size }) => {
  const [poster, setPoster] = useState<string>(imga); // Default poster
  const [loading, setLoading] = useState(true);
    const webPath = Capacitor.convertFileSrc(src);
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
  }, [src]);

  const captureThumbnail2 = async (
    nativePath: string,
    fileName: string,
    fileSize: number,
  
  ): Promise<string | null> => {
    try {
      const folder = 'thumbnails';
      const thumbnailFileName = `${fileName}_${fileSize}_thumb.jpg`;
      const fullPath = `${folder}/${thumbnailFileName}`;

      // Step 1: Try reading cached thumbnail
      try {
        const existing = await Filesystem.readFile({
          path: fullPath,
          directory: Directory.Cache,
        });
        return `data:image/jpeg;base64,${existing.data}`;
      } catch {
        // Not cached yet
      }

      // Step 2: Generate new thumbnail
      const result = await ffmpeg_thumnail.generateThumbnail({ path: nativePath });
      const base64Thumbnail = result.data;
      if (!base64Thumbnail) throw new Error('No thumbnail data');

      // Step 3: Save to cache
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
  if (!src) return <div style={{ color: 'white', textAlign: 'center' }}>Failed to load video</div>;

  return (
    <Plyr
      source={{
        type: 'video',
        sources: [{ src:webPath }],
        poster: poster,
      }}
      poster={poster}
      options={{
        controls: controls ? ['play', 'progress', 'current-time', 'fullscreen'] : [],
      }}
      style={style}
    />
  );
};

export default VideoPlayerPlyr;
