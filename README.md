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

---

# Core Features

## 3-Layer Posting System

- Identity-based posting
- Anonymous posting
- Public discovery feeds

---

## Messaging & Communication

- End-to-end encrypted messaging
- One-to-one and group chats
- Temporary chat rooms
- WebSocket realtime messaging
- Media sharing
- Status / story-style updates

---

## Calling & Realtime

- WebRTC voice calls
- WebRTC video calls
- Low-latency signaling
- Presence tracking

---

## Privacy & Security

- RSA + AES hybrid encryption
- Privacy-first architecture
- Minimal tracking philosophy
- Local-first data handling (where possible)

---

# Important Open Source Notes

This repository has been cleaned for public release.

## Removed (Not included in open source build)

- Google Play configuration
- LiveUpdate / deployment keys
- Firebase private configs
- Signing keys and certificates
- Production environment variables

## What works in open source mode

- UI and client application
- Core messaging logic
- Realtime structure (requires backend setup)
- Android project structure (Capacitor)

## What may not work without backend

- Push notifications
- Production authentication flows
- Live sync services
- Store deployment features

---

# Tech Stack

## Frontend
- React 18
- Ionic React
- TypeScript
- Tailwind CSS

## Mobile
- Capacitor

## Realtime
- WebSockets
- Redis Pub/Sub (server-side)

## Media
- WebRTC

## State
- Zustand

## Build Tools
- Vite
- Vitest
- Cypress

---

# Getting Started (Open Source Setup)

## 1. Clone

```bash
git clone https://github.com/fabulousman12/echoid.git
cd echoid
2. Install dependencies
npm install
3. Create local config
cp .env.example .env
cp src/data.example.ts src/data.ts

Production secrets are intentionally excluded.
4. Build it 

ionic build
npx cap sync

5. Run web app
    ionic serve
6. Run Android (optional)
npx cap add android
npx cap sync android
npx cap open android

Then build/run from Android Studio.
## Development Requirements

- Node.js 20+
- Java 17–19
- Android Studio Hedgehog or newer
- Gradle (wrapper included)

---

## Available Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run test.unit
npm run test.e2e
ionic build
ionic serve
```
## Contributing

Contributions are welcome.

### Focus Areas
- Messaging reliability
- Realtime performance
- Android stability
- WebRTC improvements
- Encryption flows
- UX refinement
- Architecture simplification

### Guidelines
- Keep pull requests small
- Keep changes focused on a single issue
- Ensure code is easy to review and test
- Avoid unrelated refactors in the same PR

---

## Branding Notice

This project is open source under the MIT License.

However, the following are not included for reuse in commercial forks or rebranded distributions:

- EchoId name
- Logo
- Branding assets
- Visual identity

These are reserved to prevent impersonation of the official EchoId project.

---

## Links

- Website: https://echoidchat.online  
- Product Hunt: https://www.producthunt.com/p/echoid  
- APK Releases: https://github.com/fabulousman12/Echoid_apk/releases  
- Dev Article: https://dev.to/jit_chakraborty_4222410eb/i-built-echoid-a-privacy-focused-messaging-app-with-encrypted-chat-and-voice-calls-2ang  
- Source Repo: https://github.com/fabulousman12/echoid-open_source  

---

## License

MIT License