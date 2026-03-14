import { registerPlugin } from '@capacitor/core';

import type { ffmpeg_thumnailPlugin } from './definitions';

const ffmpeg_thumnail = registerPlugin<ffmpeg_thumnailPlugin>('ffmpeg_thumnail', {
  web: () => import('./web').then((m) => new m.ffmpeg_thumnailWeb()),
});

export * from './definitions';
export { ffmpeg_thumnail };
