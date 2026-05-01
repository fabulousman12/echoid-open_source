var capacitorffmpeg_thumnail = (function (exports, core) {
    'use strict';

    const ffmpeg_thumnail = core.registerPlugin('ffmpeg_thumnail', {
        web: () => Promise.resolve().then(function () { return web; }).then((m) => new m.ffmpeg_thumnailWeb()),
    });

    class ffmpeg_thumnailWeb extends core.WebPlugin {
        async echo(options) {
            console.log('ECHO', options);
            return options;
        }
        async generateThumbnail(options) {
            console.warn('[VideoThumbnail] Web platform fallback – returning input path as-is');
            return {
                data: options.path // Simply return path to simulate result
            };
        }
        async getFileInfo(options) {
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
        async initStartio(options) {
            console.warn('[Start.io] Web platform – initStartio() called with App ID:', options.appId);
        }
        async showStartioInterstitial() {
            console.warn('[Start.io] Web platform – showStartioInterstitial() called.');
        }
        async showStartioRewarded() {
            console.warn('[Start.io] Web platform – showStartioRewarded() called.');
            return { rewarded: false, viewedTime: 0 };
        }
    }

    var web = /*#__PURE__*/Object.freeze({
        __proto__: null,
        ffmpeg_thumnailWeb: ffmpeg_thumnailWeb
    });

    exports.ffmpeg_thumnail = ffmpeg_thumnail;

    return exports;

})({}, capacitorExports);
//# sourceMappingURL=plugin.js.map
