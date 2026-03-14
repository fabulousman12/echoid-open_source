import { FFmpeg } from '@ffmpeg/ffmpeg';

const ffmpeg = new FFmpeg({ log: true });

(async () => {
  try {
    // Load the FFmpeg instance
    await ffmpeg.load();
    console.log('FFmpeg loaded successfully!');
    
    // You can now use ffmpeg to perform tasks
    // Example: loading a video and performing some operation
  } catch (error) {
    console.error('Error loading FFmpeg:', error);
  }
})();


/*   <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.READ_CONTACTS" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.BLUETOOTH" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" /> */