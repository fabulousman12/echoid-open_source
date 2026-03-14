import Foundation
import Capacitor

/**
 * Please read the Capacitor iOS Plugin Development Guide
 * here: https://capacitorjs.com/docs/plugins/ios
 */
@objc(ffmpeg_thumnailPlugin)
public class ffmpeg_thumnailPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ffmpeg_thumnailPlugin"
    public let jsName = "ffmpeg_thumnail"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "echo", returnType: CAPPluginReturnPromise)
    ]
    private let implementation = ffmpeg_thumnail()

    @objc func echo(_ call: CAPPluginCall) {
        let value = call.getString("value") ?? ""
        call.resolve([
            "value": implementation.echo(value)
        ])
    }
}
