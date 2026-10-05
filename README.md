# 🚌 YellowBird — Real-Time School Bus Tracking System

<div align="center">

[![React](https://img.shields.io/badge/React%2019-TypeScript-61DAFB?logo=react&logoColor=white)](#)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?logo=fastapi&logoColor=white)](#)
[![Android](https://img.shields.io/badge/Android-Capacitor%20APK-3DDC84?logo=android&logoColor=white)](#)
[![Electron](https://img.shields.io/badge/Desktop-Electron-47848F?logo=electron&logoColor=white)](#)
[![License](https://img.shields.io/badge/License-Proprietary-red)](#-license)

**A zero-hardware school bus tracking ecosystem — real-time GPS, Android app, Windows desktop, and parent alerts.**

</div>

---

## 📌 Project Overview

YellowBird is a full-stack SaaS platform that converts a driver's smartphone into a live GPS transmitter. Parents track the school bus in real-time, school admins manage the full fleet, and drivers operate with a single tap — no hardware device required.

**Live Demo:** https://yellow-bird-eosin.vercel.app  
**Android App:** [Download APK](https://yellow-bird-eosin.vercel.app/YellowBird.apk)

---

## 🎯 Problem Statement

Traditional school bus tracking depends on expensive GPS hardware (₹5,000–₹15,000 per bus), SIM subscriptions, and technicians. Parents have zero real-time visibility and rely entirely on phone calls to locate a bus.

---

## 🎯 Objectives

- Eliminate hardware cost — use the driver's existing smartphone as a GPS transmitter.
- Give parents a live map with ETA and proximity alerts for their child's bus stop.
- Provide school admins a central fleet management and roster dashboard.
- Deploy cross-platform: web browser, Android APK, and Windows desktop app.

---

## ✨ Key Features

| Role | Core Features |
|---|---|
| **Driver** | 1-tap trip start, live GPS streaming, trip-lock logout guard, auto trip recovery |
| **Parent** | Live bus map, real-time ETA, 500m proximity alert, direct driver call button |
| **School Admin** | Fleet dashboard, Excel bulk upload, route & stop builder, student-bus assignment |
| **Super Admin** | Multi-school management, global fleet analytics |

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, TailwindCSS, Framer Motion, TanStack Query |
| **Maps** | Leaflet / React-Leaflet |
| **Backend** | FastAPI (Python), SQLAlchemy 2.0 Async, native WebSockets |
| **Database** | PostgreSQL + asyncpg (production), SQLite (local dev) |
| **Mobile** | Capacitor 8 — Android APK |
| **Desktop** | Electron — Windows app |
| **Auth** | JWT (python-jose), bcrypt (Passlib) |
| **Deployment** | Vercel (frontend), Render (backend) |

---

## 💡 Why These Technologies?

- **FastAPI + WebSockets**: Async Python handles GPS streaming and REST in one server with zero polling latency.
- **React 19 + TanStack Query**: Automatic server-state caching and real-time invalidation without complex state management.
- **Capacitor**: Wraps the React web app as a native Android APK — one codebase, no separate mobile development.
- **Electron**: Packages the admin portal as a Windows desktop executable for school reception desks.
- **SQLAlchemy Savepoints**: Crash-safe Excel batch uploads — duplicate rows are skipped, not rejected.

---

## ⚙️ How It Works

```
Driver taps "Start Trip"
  → Smartphone GPS streams coordinates over WebSocket every 2–3 seconds
      → Backend calculates Haversine distance to each pickup stop
          → Parent app receives live location + dynamic ETA
              → Proximity alert fires when bus is < 500m from student's stop
Driver taps "End Trip"
  → Bus disappears from all parent maps
  → Trip is saved to database with full GPS breadcrumb trail
```

**Key safety mechanisms:**
- Driver **cannot log out** during an active trip — button is physically locked with warning.
- App crash or refresh → trip **auto-recovers** from server state on relaunch.
- One driver account = one active GPS session (no duplicate streams).

---

## 🏗️ System Architecture

```
┌──────────────────────┐   WebSocket (GPS payload)   ┌─────────────────────────┐
│   Driver Mobile App  │ ─────────────────────────►  │  FastAPI Backend Server  │
│   Capacitor + Geo    │                             │  WebSocket Manager       │
└──────────────────────┘                             │  Haversine Geo Engine    │
                                                     │  SQLAlchemy Async ORM    │
┌──────────────────────┐   WebSocket (live location) │       PostgreSQL         │
│   Parent Mobile App  │ ◄───────────────────────── └─────────────────────────┘
│   Leaflet Map + ETA  │                                         ▲ REST API
└──────────────────────┘                                         │
                                                                 │
┌──────────────────────┐   WebSocket (fleet broadcast)           │
│   Admin Dashboard    │ ◄───────────────────────────────────────┘
│   Electron / Web     │
└──────────────────────┘
```

---

## 📂 Project Structure

```
YellowBird/
├── backend/                    # FastAPI Python server
│   ├── app/
│   │   ├── api/routes/         # REST + WebSocket endpoints (auth, tracking, parents...)
│   │   ├── core/               # Config, database, security, Haversine routing
│   │   ├── models/             # SQLAlchemy ORM models (user, bus, trip, student...)
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   └── websockets/         # WebSocket ConnectionManager
│   └── requirements.txt
│
├── frontend/                   # React 19 + TypeScript web/mobile app
│   ├── src/
│   │   ├── pages/              # Driver, Parent, Admin, Auth pages
│   │   ├── stores/             # Zustand state (auth, active trip)
│   │   ├── components/         # Reusable layout and UI components
│   │   └── lib/                # Axios API client, constants, utilities
│   └── android/                # Capacitor Android Studio project
│
├── electron/                   # Windows desktop admin portal
├── docker/                     # Docker Compose for containerized deployment
├── YellowBird-final.apk        # Pre-built Android APK (8 MB)
└── .env.example                # Environment variable template
```

---

## 🚀 Installation & Setup

### Prerequisites
Node.js 18+, Python 3.11+, Git

### 1. Backend
```bash
cd backend
python -m venv venv && venv\Scripts\activate    # Windows
pip install -r requirements.txt
cp ../.env.example ../.env                       # Edit with your values
uvicorn app.main:app --reload --host 0.0.0.0
```
API: http://localhost:8000 | Swagger: http://localhost:8000/docs

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
App: http://localhost:5173

### 3. Android APK
```bash
cd frontend
npm run build
npx cap sync android
# Open android/ in Android Studio → Build → Generate Signed/Debug APK
```

---

## 🔑 Environment Variables

Copy `.env.example` → `.env` and fill in:

```env
DATABASE_URL=sqlite+aiosqlite:///./transport.db   # or PostgreSQL URL
JWT_SECRET_KEY=your-secure-random-key
SMTP_USER=your@gmail.com
SMTP_PASSWORD=your-gmail-app-password
FRONTEND_URL=http://localhost:5173
```

> ⚠️ Never commit `.env` to Git — excluded via `.gitignore`.

---

## 🌐 Deployment

| Component | Platform | Notes |
|---|---|---|
| Backend API | **Render** | Auto-deploys from GitHub `main`. Configure env vars in Render dashboard. |
| Frontend Web | **Vercel** | Auto-deploys from GitHub `main`. Set `VITE_API_URL` in Vercel dashboard. |
| Database | **PostgreSQL** | Managed on Render or Supabase with SSL. |
| Android App | **Direct APK** | [Download](https://yellow-bird-eosin.vercel.app/YellowBird.apk) — no Play Store needed. |
| Windows Desktop | **Electron** | Run `Create-Desktop-Shortcut.bat` on any Windows PC. |

---

## 🔌 API Documentation

Swagger UI: `http://localhost:8000/docs` (auto-generated from FastAPI).

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/login` | Authenticate and receive JWT token |
| POST | `/api/v1/tracking/trips/start` | Driver starts a trip |
| POST | `/api/v1/tracking/trips/{id}/end` | Driver ends a trip |
| WS | `/api/v1/tracking/ws/driver/{bus_id}` | Driver GPS telemetry stream |
| WS | `/api/v1/tracking/ws/track/{bus_id}` | Parent live bus tracking |
| WS | `/api/v1/tracking/ws/track_all` | Admin fleet-wide broadcast |
| POST | `/api/v1/parents/upload` | Bulk import parents via Excel |
| POST | `/api/v1/students/upload` | Bulk import students via Excel |

---

## 🧩 Challenges Faced

| Challenge | Solution Applied |
|---|---|
| Excel upload failing on duplicate emails | SQLAlchemy nested savepoints per row — duplicates skipped, batch never aborts |
| bcrypt hashing 70 passwords blocking async event loop | In-memory hash cache — each unique password hashed only once |
| Driver accidentally logging out mid-trip | Logout button disabled while `isTracking` is true; requires confirmation |
| Admin portal showing parent/driver screens on shared PCs | Electron boot-time session isolation — clears non-admin tokens on launch |
| Android bottom navigation hiding driver UI | Added `pb-24` bottom padding to clear Android gesture navigation bar |

---

## 🔮 Future Improvements

- [ ] Firebase push notifications when the app is running in the background
- [ ] Google Play Store release
- [ ] Route deviation alert (notification when bus leaves the planned path)
- [ ] Daily automated trip summary report emailed to school admins
- [ ] App interface in Marathi and Hindi for local school staff
- [ ] SaaS subscription billing and school onboarding self-service portal

---

## 👨‍💻 Contributors

| Name | Role |
|---|---|
| **Sanket Zinjurke** | Sole Developer, System Architect & Legal Owner |
| Contact | sanketzinjurke83@gmail.com |

---

## 📄 License

**Copyright © 2024–2026 Sanket Zinjurke. All Rights Reserved.**

This software is strictly proprietary. No permission is granted to copy, modify, distribute, or resell any part of this codebase without express written authorization from the owner.

Violation is subject to prosecution under:
- **Indian Copyright Act, 1957** (Sections 51, 63, 63B)
- **IT Act, 2000** (Sections 43, 65, 66)
- **Berne Convention** (180+ member countries)

📧 Licensing: **sanketzinjurke83@gmail.com**

---

## 🏁 Conclusion

YellowBird proves that a production-grade school transportation tracking system requires zero hardware investment. A driver's smartphone, a FastAPI WebSocket server, and a React frontend together deliver real-time bus tracking, fleet management, and parent proximity alerts — fully deployable for free on Render and Vercel.

---

<div align="center">
  <sub>Built with Sanket Zinjurke ❤️ for safer, smarter school transportation.</sub>
</div>
