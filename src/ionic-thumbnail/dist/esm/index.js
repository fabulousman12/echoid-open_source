import { registerPlugin } from '@capacitor/core';
const ffmpeg_thumnail = registerPlugin('ffmpeg_thumnail', {
    web: () => import('./web').then((m) => new m.ffmpeg_thumnailWeb()),
});
export * from './definitions';
export { ffmpeg_thumnail };
//# sourceMappingURL=index.js.map