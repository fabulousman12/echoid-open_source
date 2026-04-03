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
const production = false
if (production) {
  // Silence noisy console output in production builds without changing app logic.
  console.log = () => {};
  console.debug = () => {};
  console.info = () => {};
}
window.addEventListener("DOMContentLoaded", async () => {
  try {
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
      <React.StrictMode>
         <Router> 
        <MessageProvider> {/* Wrap the App with the MessageProvider */}
        <WebSocketProvider> {/* Wrap the App with the WebSocketProvider */}
          <App />
        </WebSocketProvider>
        </MessageProvider>
         </Router> 
      </React.StrictMode>
    );
  } catch (e) {
    console.error("Error during initialization:", e);
  }
});
