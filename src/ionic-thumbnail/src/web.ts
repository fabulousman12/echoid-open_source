import { WebPlugin } from '@capacitor/core';

import type { ffmpeg_thumnailPlugin, GenerateThumbnailOptions, GenerateThumbnailResult, GetFileInfoOptions, GetFileInfoResult } from './definitions';

export class ffmpeg_thumnailWeb extends WebPlugin implements ffmpeg_thumnailPlugin {
  async echo(options: { value: string }): Promise<{ value: string }> {
    console.log('ECHO', options);
    return options;
  }

      async generateThumbnail(options: GenerateThumbnailOptions): Promise<GenerateThumbnailResult> {
    console.warn('[VideoThumbnail] Web platform fallback – returning input path as-is');
    
    return {
      data: options.path // Simply return path to simulate result
    };
  }
    async getFileInfo(options: GetFileInfoOptions): Promise<GetFileInfoResult> {
    console.warn('[MyFileInfo] Web platform fallback - cannot access native file info.');
    

    
    // As fallback, just return URI and nulls
    return {
      name: null,
      size: null,
      uri: options.uri,
      persisted: false,
      localPath: ''
    };
  }
    // ===== Start.io Ad Stub Methods =====
  async initStartio(options: { appId: string }): Promise<void> {
    console.warn('[Start.io] Web platform – initStartio() called with App ID:', options.appId);
  }

  async showStartioInterstitial(): Promise<void> {
    console.warn('[Start.io] Web platform – showStartioInterstitial() called.');
  }

  async showStartioRewarded(): Promise<{ rewarded: boolean , viewedTime: number }> {
    console.warn('[Start.io] Web platform – showStartioRewarded() called.');
    return { rewarded: false , viewedTime: 0};
  }
}
