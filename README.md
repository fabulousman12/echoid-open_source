# EchoId - Open Source Secure Messaging Platform

EchoId is a privacy-focused, open-source messaging Project built for secure, real-time communication without tracking, analytics, or unnecessary data collection.

This repository contains the public application code for the EchoId client, shared as a foundation for learning, collaboration, and further development while keeping deployment-specific secrets and private configuration out of version control.

Learn more: https://echoidchat.online

---

## Overview

EchoId is designed for people who want modern messaging features without giving up control over their data. The app focuses on privacy-first communication, transparent development, and a lightweight user experience.

Unlike many messaging platforms, EchoId aims to minimize tracking and avoid bundling unnecessary data collection into the product experience.

This codebase is built primarily with Ionic React and Capacitor, which allows the app to target both web and mobile-oriented workflows from a shared frontend codebase.

---

## Features

- Real-time chat experience
- Privacy-first product direction
- Voice and video communication support
- WebSocket-based messaging flow
- Encryption-related client utilities
- Media handling and rendering
- Fast UI built with React and Ionic
- Open-source codebase for transparency and community improvement

---

## Why EchoId?

Most messaging apps optimize for engagement, growth metrics, and data visibility.

EchoId is built with a different mindset:

- Privacy-first architecture
- Reduced reliance on tracking and analytics
- Open-source transparency
- Built as a practical base for developers and privacy-conscious users
- Structured to keep sensitive deployment details outside the public repository

---

## Tech Stack

- Frontend: Ionic React + React 18
- Mobile runtime: Capacitor
- Build tool: Vite
- Language mix: TypeScript and JavaScript
- Real-time communication: WebSocket client logic
- Media and calling: WebRTC-related communication flows
- State and UI tooling: Zustand, Ionic UI, Material UI
- Testing: Vitest and Cypress

---

## What This Repository Includes

- Application source code
- Chat interface and state management
- Media display and interaction logic
- Client-side real-time communication logic
- Encryption-related client utilities
- Local plugin source such as `ionic-thumbnail`
- Test, lint, and build configuration

---

## What Is Intentionally Not Tracked

Some files are intentionally excluded because they are local, generated, private, or tied to a specific deployment:

- `.env` and other local environment files
- `src/data.ts` and other private config variants
- Firebase service configuration files
- Android and iOS native project folders
- Generated release output, screenshots, and crash logs

This keeps the public repository focused on reusable application logic while helping prevent accidental leaks of secrets or deployment-specific setup.

---

## Usage Limitations

Some files required for full platform behavior are intentionally not included in this public repository.

At the moment, that means the project can be tested most reliably through the web version. Certain Android-native behaviors are not fully reproducible here, including:

- App dead-state message handling
- Floating window overlays
- Other Android platform-specific integrations

If you contribute features that affect both web and Android behavior, please make sure the Android-side implementation is considered in addition to the web implementation.

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/fabulousman12/echoid.git
cd echoid
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create local configuration files

Copy the example environment and data files:

```bash
cp .env.example .env
cp src/data.example.ts src/data.ts
```

Then fill in the values in your local `.env` and `src/data.ts`.

### 4. Start the development server

```bash
npm run dev
```

---

## Android Native Helper Files

If you add Android support with Capacitor, also copy the Java helper files from:

`src/additatinalfiles/swipe`

into:

`android/app/src/main/java/<your-package>/`

This includes files such as:

- `MainActivity.java`
- `MyApplication.java`
- `MyFirebaseMessagingService.java`
- `PushyMessagingService.java`
- `NotificationHelper.java`
- `AppLifecycleTracker.java`
- `Constants.java`
- `AuthBridgePlugin.java`

If your package name is not `com.swipe`, update the package declarations and imports before building.

---
# Versions 
Java <= 19
Gradle = 8.2.1
## Separate Plugin Requirement

This app also depends on the separate thumbnail plugin package:

`https://github.com/fabulousman12/ionic-thumnail`

Download or install that package before using thumbnail-related features.

Example:

```bash
npm install github:fabulousman12/ionic-thumnail
npx cap sync
```

---
## Available Scripts

```bash
npm run dev
npm run build
npm run preview
npm run test.unit
npm run test.e2e
npm run lint
```

---

## Notes on Local Configuration

- `.env.example` contains placeholder environment variables
- `src/data.example.ts` contains a public-safe example config
- Your real `src/data.ts` should remain local and is ignored by git
- If you need Firebase, Android, or iOS platform files, you will need to provide your own project-specific versions locally

---

## Contributing

Contributions are welcome.

If you want to improve the project, fix bugs, clean up rough edges, or expand missing pieces, feel free to open an issue or submit a pull request. Keeping changes focused, deterministic, and easy to review is especially helpful for this codebase.

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the basic workflow if available in your local checkout.

---

## Open Code, Protected Brand

The source code in this repository is open under the license in [`LICENSE`](./LICENSE).

The EchoId name, logo, artwork, package identity, and related branding are not automatically granted for unrestricted commercial or promotional reuse. If you fork this project, use your own branding unless you have explicit permission.

---

## Project Context

This project was built primarily as a real-world learning and development effort. Some areas may still reflect rapid iteration, experiments, or unfinished cleanup. Improvements to clarity, maintainability, reliability, and developer onboarding are all valuable.

---

🚀 Product Hunt: https://www.producthunt.com/p/echoid
📦 APK: https://github.com/fabulousman12/Echoid_apk/releases  

📝 Dev.to: https://dev.to/jit_chakraborty_4222410eb/i-built-echoid-a-privacy-focused-messaging-app-with-encrypted-chat-and-voice-calls-2ang

## Development Journey

EchoId started as my first serious mobile project, and the beginning was rough.

Getting the base working, including SQLite message storage, user sync, and a basic chat flow, took around 6 months. Since this was my first Android app, I underestimated the complexity and ended up going through multiple rewrites along the way.

Things changed once I started using tools like Codex and Stitch. The development process became much faster and smoother, especially for repetitive work and larger structural changes.

Right now, EchoId supports:

- E2E messaging
- Group chats
- Voice and video calling with WebRTC
- Temporary chat rooms with user-controlled deletion
- Push delivery with FCM

The goal is to build something privacy-focused while learning real-time systems deeply through actual implementation.

I am still figuring out what really matters to users versus what is just overengineering. Honest feedback is genuinely welcome, especially around what feels unnecessary, what feels missing, and what should be improved first.

---

## License

This project is licensed under the MIT License. See [`LICENSE`](./LICENSE).
