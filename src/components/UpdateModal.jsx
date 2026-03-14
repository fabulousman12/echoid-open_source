import React, { useEffect, useState } from "react";
import ApkUpdater from 'cordova-plugin-apkupdater';

export default function UpdateModal({ version, url, critical, onClose }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    console.log("UpdateModal:", version, url, critical);
  }, [version, url, critical]);

  const simulateDownloadClick = async () => {
    try {
      setLoading(true);
      setProgress(0);

      let simulatedProgress = 0;
      const interval = setInterval(() => {
        simulatedProgress += 5;
        setProgress(simulatedProgress);

        if (simulatedProgress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            alert("✅ Simulated APK downloaded and ready to install.");
            setLoading(false);
            setProgress(0);
            onClose();
          }, 500);
        }
      }, 200);
    } catch (err) {
      console.error("Simulation failed:", err);
      alert("Simulated update failed.");
    }
  };

  const onDownloadClick = async () => {
    try {
      setLoading(true);
      setProgress(0);

      const permission = await ApkUpdater.canRequestPackageInstalls();
      if (!permission) {
        await ApkUpdater.openInstallSetting();
      }

      const options = {
        onDownloadProgress: (e) => {
          const percent = Math.round(e.progress);
          setProgress(percent);
        },
      };

      const apkInfo = await ApkUpdater.download(url, options);
      console.log("Downloaded APK info:", apkInfo);
      await ApkUpdater.install();
    } catch (err) {
      console.error("Update process failed:", err);
      alert("Update failed, please try again.");
    } finally {
      setLoading(false);
      setProgress(0);
      onClose();
    }
  };

  const onOpenInBrowser = () => {
    window.open(url, "_system"); // Cordova-compatible way to open link in browser
  };

  return (
    <div
      className={`fixed inset-0 ${
        critical ? "bg-black bg-opacity-60" : "bg-transparent"
      } flex items-center justify-center z-50`}
    >
      <div className="bg-white rounded-xl shadow-lg p-5 sm:p-6 w-auto max-w-sm text-center space-y-4 border border-gray-200">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
          {critical
            ? "⚠️ Critical Update Required To Continue"
            : "Update Available"}
        </h2>

        <p className="text-sm text-gray-600">
          Please update to{" "}
          <span className="font-medium text-gray-800">version {version}</span>{" "}
          to Enjoy With Something Better.
        </p>

        <button
          disabled={loading}
          onClick={onDownloadClick}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition"
        >
          {loading ? `Downloading... ${progress}%` : "⬇️ Download Update"}
        </button>

        <button
          disabled={loading}
          onClick={onOpenInBrowser}
          className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition"
        >
          🌐 Open in Browser
        </button>

        {!critical && !loading && (
          <button
            onClick={onClose}
            className="block mx-auto text-xs text-gray-500 hover:text-gray-700 transition duration-150"
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}
