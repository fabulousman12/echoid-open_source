export interface ffmpeg_thumnailPlugin {
  echo(options: { value: string }): Promise<{ value: string }>;
  generateThumbnail(options: GenerateThumbnailOptions): Promise<GenerateThumbnailResult>;
  getFileInfo(options: GetFileInfoOptions): Promise<GetFileInfoResult>;

    initStartio(options: { appId: string }): Promise<void>;
  showStartioInterstitial(): Promise<void>;
  showStartioRewarded(): Promise<{ rewarded: boolean , viewedTime: number}>;
}
export interface GenerateThumbnailOptions {
  path: string; // Local video path (e.g., file://...)
}

export interface GenerateThumbnailResult {
  data: string; // Base64 thumbnail or blob URI
}

export interface GetFileInfoOptions {
  uri: string; // e.g., content:// or file:// URI
}

export interface GetFileInfoResult {
  name: string | null;
  size: number | null;
  uri: string;
  persisted: boolean;
  localPath: string;
}