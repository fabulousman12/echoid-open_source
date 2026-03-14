// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "IonicThumbnail",
    platforms: [.iOS(.v14)],
    products: [
        .library(
            name: "IonicThumbnail",
            targets: ["ffmpeg_thumnailPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "7.0.0")
    ],
    targets: [
        .target(
            name: "ffmpeg_thumnailPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Sources/ffmpeg_thumnailPlugin"),
        .testTarget(
            name: "ffmpeg_thumnailPluginTests",
            dependencies: ["ffmpeg_thumnailPlugin"],
            path: "ios/Tests/ffmpeg_thumnailPluginTests")
    ]
)