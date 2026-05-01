import { WebPlugin } from '@capacitor/core';
import type { ffmpeg_thumnailPlugin, GenerateThumbnailOptions, GenerateThumbnailResult, GetFileInfoOptions, GetFileInfoResult } from './definitions';
export declare class ffmpeg_thumnailWeb extends WebPlugin implements ffmpeg_thumnailPlugin {
    echo(options: {
        value: string;
    }): Promise<{
        value: string;
    }>;
    generateThumbnail(options: GenerateThumbnailOptions): Promise<GenerateThumbnailResult>;
    getFileInfo(options: GetFileInfoOptions): Promise<GetFileInfoResult>;
    initStartio(options: {
        appId: string;
    }): Promise<void>;
    showStartioInterstitial(): Promise<void>;
    showStartioRewarded(): Promise<{
        rewarded: boolean;
        viewedTime: number;
    }>;
}
