import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { WebSocketProvider } from "./services/websokcetmain";
import {MessageProvider} from "./Contexts/MessagesContext";
import './tailwind.css' // Import your Tailwind CSS file
import { BrowserRouter as Router, Route, Switch, Redirect,useLocation  } from 'react-router-dom';
import './services/notificationBootstrap';
import { initPrefStorage, storage } from "./services/prefStorage";
import { getDeviceId } from "./services/deviceInfo";
import { Capacitor } from "@capacitor/core";
const production = true
if (production) {
  // Silence noisy console output in production builds without changing app logic.
  console.log = () => {};
  console.debug = () => {};
  console.info = () => {};
}
window.addEventListener("DOMContentLoaded", async () => {
  try {
    const syncMobileWebViewport = () => {
      const isNative = Boolean(Capacitor.isNativePlatform?.());
      const isNarrow = window.matchMedia?.("(max-width: 768px)")?.matches ?? window.innerWidth <= 768;
      const isMobileWeb = !isNative && isNarrow;
      document.body.classList.toggle("mobile-web-browser", isMobileWeb);

      if (!isMobileWeb) {
        document.documentElement.style.removeProperty("--app-mobile-browser-bottom-gap");
        return;
      }

      const visualViewport = window.visualViewport;
      const viewportGap = visualViewport
        ? Math.max(0, window.innerHeight - visualViewport.height - visualViewport.offsetTop)
        : 0;
      const browserControlsGap = Math.max(42, Math.ceil(viewportGap));
      document.documentElement.style.setProperty("--app-mobile-browser-bottom-gap", `${browserControlsGap}px`);
    };

    syncMobileWebViewport();
    window.addEventListener("resize", syncMobileWebViewport);
    window.visualViewport?.addEventListener("resize", syncMobileWebViewport);
    window.visualViewport?.addEventListener("scroll", syncMobileWebViewport);

    globalThis.storage = storage;
    globalThis.storageReady = initPrefStorage([
      "token",
      "refreshToken",
      "deviceId",
      "device_token",
      "currentuser",
      "usersMain",
      "userMain",
      "usermain",
      "messages",
      "unreadCounts",
      "blockedUsers",
      "blockedBy",
      "mutedUsers",
      "ismute",
      "customSounds",
      "mode",
      "ForAllSoundNotification",
      "otpRequestTime",
      "lastOtpRequestTime",
      "chatThemeColor",
      "chatUISettings",
      "appTheme",
      "incomingCall",
      "incoming_call_data",
      "incoming_call_offer",
      "calls",
      "privateKey",
      "admin_messages_cache"
    ]);

    await globalThis.storageReady;
    await getDeviceId();
    const savedTheme = globalThis.storage.getItem("appTheme") || "light";
    document.body.classList.toggle("dark-theme", savedTheme === "dark");

    const container = document.getElementById("root");
    const root = createRoot(container);

    root.render(
     
         <Router> 
        <MessageProvider> {/* Wrap the App with the MessageProvider */}
        <WebSocketProvider> {/* Wrap the App with the WebSocketProvider */}
          <App />
        </WebSocketProvider>
        </MessageProvider>
         </Router> 
    
    );
  } catch (e) {
    console.error("Error during initialization:", e);
  }
});
