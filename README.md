# EchoId - Open Source Privacy-First Communication Platform (Public Beta)

EchoId is an open-source realtime communication platform focused on encrypted messaging, anonymous interaction, peer-to-peer communication, and privacy-first social communication without invasive tracking or unnecessary analytics.

This repository contains the public EchoId client codebase for learning, collaboration, contributions, experimentation, and self-hosted development while intentionally excluding deployment-specific secrets and sensitive configuration.

Learn more: https://echoidchat.online

---

# Overview

EchoId is built around a simple idea:

Modern communication platforms should not require invasive tracking, aggressive analytics, or turning users into behavioral data products.

The platform combines:

- Encrypted realtime messaging
- Anonymous interaction systems
- Public communication feeds
- Peer-to-peer voice/video communication
- Temporary chat systems
- Sync-aware realtime infrastructure

EchoId is designed to stay lightweight, direct, and realtime while still supporting modern communication workflows.

Unlike many communication platforms optimized mainly for engagement metrics, EchoId focuses on:

- Privacy-first communication
- Minimal data collection
- Realtime infrastructure
- Open-source transparency
- Practical performance
- Developer accessibility

The application is primarily built with Ionic React and Capacitor, allowing shared development across web and Android workflows.

---

# Core Features

## 3-Layer Posting System

EchoId includes a unique 3-layer communication and posting architecture:

- Identity-based posting
- Anonymous posting
- Public discovery communication feeds

This allows users to participate in communication differently depending on context instead of forcing every interaction through one rigid identity model.

---

## Messaging & Communication

- End-to-end encrypted messaging
- One-to-one chats
- Group chats
- Temporary chat rooms
- Realtime WebSocket messaging
- Message sync and unread tracking
- Media and file sharing
- Status / story-style communication
- Realtime feed interactions

---

## Calling & Realtime Infrastructure

- Peer-to-peer voice calls
- Peer-to-peer video calls
- WebRTC communication flows
- Low-latency signaling systems
- Presence and activity tracking
- Realtime synchronization

---

## Privacy & Security

- RSA + AES hybrid encryption
- Privacy-first architecture
- Minimal tracking philosophy
- Reduced analytics dependency
- Local-first handling in multiple flows
- Session-aware authentication systems

---

# Why EchoId?

Most modern communication platforms optimize heavily for:

- Engagement metrics
- User retention analytics
- Advertising visibility
- Behavioral profiling
- Platform lock-in

EchoId is intentionally built differently.

The project focuses on:

- Privacy-first communication
- Open-source transparency
- Minimal unnecessary data collection
- Realtime communication systems
- Lightweight architecture
- Developer-friendly extensibility

The goal is not to create another analytics-heavy social platform.

The goal is to explore what a modern privacy-focused realtime communication platform can look like.

---

# Tech Stack

## Frontend

- React 18
- Ionic React
- Tailwind CSS
- TypeScript + JavaScript

## Mobile Runtime

- Capacitor

## Realtime Infrastructure

- WebSocket-based communication
- Redis Pub/Sub event propagation
- Sync-aware realtime systems

## Calling & Media

- WebRTC peer-to-peer communication
- Media rendering and upload handling

## State & UI

- Zustand
- Ionic UI
- Material UI

## Build & Testing

- Vite
- Vitest
- Cypress

---

# What This Repository Includes

- EchoId client application source code
- Realtime messaging logic
- Feed and posting systems
- Chat and group communication flows
- Encryption-related client utilities
- Media interaction and rendering systems
- Local persistence flows
- Build, test, and lint configuration

---

# What Is Intentionally Not Tracked

Some files are intentionally excluded because they are deployment-specific, generated, sensitive, or local-only.

This includes:

- `.env` files
- Private configuration files
- Firebase service configuration
- Android and iOS native folders
- Signing keys and certificates
- Generated release artifacts
- Internal deployment infrastructure

The goal is to keep the repository safe for public collaboration while preventing accidental exposure of secrets or private infrastructure details.

---

# Usage Limitations

Some platform-specific functionality is intentionally not fully reproducible from the public repository alone.

This especially affects certain Android-native integrations such as:

- Dead-state push handling
- Floating overlay systems
- Native lifecycle integrations
- Some background notification behavior

The web version remains the easiest environment for public testing and contribution work.

If you contribute features affecting Android-native flows, please ensure the native implementation path is also considered.

---

# Getting Started

## 1. Clone the Repository

```bash
git clone https://github.com/fabulousman12/echoid.git
cd echoid
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Create Local Configuration Files

Copy the example files:

```bash
cp .env.example .env
cp src/data.example.ts src/data.ts
```

Then fill in your local configuration values.

---

## 4. Install Thumbnail Plugin

The thumbnail plugin is now publicly available as a separate package.

Install it before using thumbnail-related functionality:

```bash
npm install github:fabulousman12/ionic-thumnail
npx cap sync
```

Plugin repository:

https://github.com/fabulousman12/ionic-thumnail

---

## 5. Start Development Server

```bash
npm run dev
```

---

# Android Native Helper Files

If you are adding Android support with Capacitor, also copy the helper files from:

```txt
src/additatinalfiles/swipe
```

into:

```txt
android/app/src/main/java/<your-package>/
```

This includes files such as:

- MainActivity.java
- MyApplication.java
- MyFirebaseMessagingService.java
- PushyMessagingService.java
- NotificationHelper.java
- AppLifecycleTracker.java
- Constants.java
- AuthBridgePlugin.java

If your package name differs from `com.swipe`, update package declarations and imports before building.

---

## Development Environment

Recommended versions for local development:

```txt
Node.js: 20+
Java: 17 - 19
Gradle: 8.2.1
Android Gradle Plugin: 8.2.x
Android Studio: Hedgehog or newer
```

The repository already includes the Gradle wrapper configuration, so Gradle versions should sync automatically when opening the Android project in Android Studio.
---

# Available Scripts

```bash
npm run dev
npm run build
npm run preview
npm run test.unit
npm run test.e2e
npm run lint
```

---

# Notes on Local Configuration

- `.env.example` contains placeholder environment variables
- `src/data.example.ts` contains public-safe configuration examples
- Your actual `src/data.ts` should remain local
- Firebase, Android, and iOS-specific files must be configured locally

---

# Contributing

Contributions are welcome.

You can help by:

- Fixing bugs
- Improving architecture
- Cleaning up legacy flows
- Improving Android compatibility
- Optimizing realtime behavior
- Improving encryption workflows
- Improving documentation
- Improving onboarding for contributors

Focused and deterministic pull requests are easier to review and merge.

See:

```txt
CONTRIBUTING.md
```

if available in your checkout.

---

# Open Code, Protected Brand

The source code is open under the license in:

```txt
LICENSE
```

However:

- The EchoId name
- Logos
- Artwork
- Branding assets
- Visual identity

are not automatically granted for unrestricted commercial reuse.

If you fork the project publicly, use your own branding unless explicit permission is granted.

---

# Project Context

EchoId started primarily as a real-world learning project exploring:

- Realtime systems
- Messaging infrastructure
- WebRTC communication
- Sync systems
- Mobile platform behavior
- Encryption flows
- Realtime social communication

Some parts of the codebase may still reflect rapid iteration, unfinished cleanup, experimentation, or architectural evolution.

Improvements to maintainability, clarity, reliability, and onboarding are all valuable.

---

# Development Journey

EchoId started as my first serious mobile and realtime communication project.

The early versions were rough.

Building reliable messaging, SQLite persistence, sync systems, WebRTC flows, and realtime communication infrastructure took multiple rewrites and several months of experimentation.

Things accelerated heavily once AI-assisted development tools like Codex and Stitch became part of the workflow, especially for repetitive structural work and refactors.

Today EchoId supports:

- End-to-end encrypted messaging
- Group chats
- WebRTC voice/video calling
- Temporary chat rooms
- Realtime feeds
- Anonymous posting
- 3-layer communication architecture
- Push delivery systems
- Sync-aware communication

The project is still evolving heavily.

The goal is not perfection.

The goal is learning deeply by building actual realtime systems at scale instead of endlessly theorizing about them.

Honest feedback is genuinely valuable, especially around:

- Overengineering
- Missing functionality
- UX friction
- Realtime reliability
- Privacy tradeoffs
- Architecture decisions

---

# Links

🌐 Website: https://echoidchat.online

🚀 Product Hunt:
https://www.producthunt.com/p/echoid

📦 APK Releases:
https://github.com/fabulousman12/Echoid_apk/releases

📝 Dev.to Article:
https://dev.to/jit_chakraborty_4222410eb/i-built-echoid-a-privacy-focused-messaging-app-with-encrypted-chat-and-voice-calls-2ang

💻 Open Source Repository:
https://github.com/fabulousman12/echoid-open_source

---

# License

This project is licensed under the MIT License.

See:

```txt
LICENSE
```