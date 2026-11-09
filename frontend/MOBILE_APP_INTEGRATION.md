# YellowBird Mobile App — Integration Notes

This document describes the shared Android/mobile frontend in this branch. It deliberately does not change the FastAPI backend, database, authentication implementation, Admin Portal, or deployment configuration.

## App architecture

- One React 19 + TypeScript + Vite frontend wrapped by Capacitor 8 for Android.
- One shared login form. The existing backend login response supplies the role; the app routes `driver` to the Driver workspace and `parent` to the Parent workspace.
- Admin accounts are directed to the separate Admin Portal. There is no role picker in the mobile login.
- Parent and Driver screens share the same codebase and Android package.
- The app uses the existing Zustand stores, Axios API client, WebSocket manager, React Query and Leaflet map components.

## Configure the API origin

Create `frontend/.env` from `frontend/.env.example`.

- Local browser development: leave `VITE_API_URL` empty. Vite proxies `/api` and `/ws` to the local FastAPI server configured in `vite.config.ts`.
- Android APK / production web build: set `VITE_API_URL` to the HTTPS origin of the FastAPI deployment, without `/api/v1` at the end. The API client adds `/api/v1`; the WebSocket client converts HTTPS to WSS.
- Do not put JWT secrets, SMTP credentials, database credentials or other server secrets in this frontend variable.

Example:

```env
VITE_API_URL=https://your-api.example.com
```

## Existing backend contracts used by the app

| Feature | Existing request / channel |
|---|---|
| Login | `POST /api/v1/auth/login` |
| Parent child and bus assignments | `GET /api/v1/parents/me/bus-info` |
| Parent live bus updates | `WS /api/v1/tracking/ws/track/{bus_id}` |
| Parent notification feed | `GET /api/v1/notifications` |
| Driver profile | `GET /api/v1/drivers/me` |
| Driver vehicle / route details | Existing `GET /api/v1/drivers/me/connections` and `GET /api/v1/buses/{bus_id}` usage |
| Driver trip start | Existing trip-store integration with `POST /api/v1/tracking/trips/start` |
| Driver trip end | Existing trip-store integration with `POST /api/v1/tracking/trips/{trip_id}/end` |
| Driver GPS stream | `WS /api/v1/tracking/ws/driver/{bus_id}?token={JWT}` |

The app intentionally uses the assigned pickup stop as the parent's map reference. It does not request the parent's GPS location. The parent map shows a live bus marker only when it receives a live WebSocket update; it does not animate an old database coordinate as if it were live.

ETA is displayed only if the live backend payload supplies an ETA field. The frontend does not invent a route ETA from straight-line distance.

## What still depends on backend / deployment work

These are integration requirements, not frontend features that can be made real by UI code alone:

1. **Subscriber WebSocket authorization:** the current parent subscriber socket path has no token parameter in the existing client. The backend audit also found that the subscriber WebSocket endpoint does not visibly enforce authentication or parent-to-bus authorization. Secure this server-side before production use.
2. **Passenger pickup/drop-off confirmation:** the mobile source currently has passenger read APIs, but no verified write endpoint for confirming pickup or drop-off. Passenger list remains informational until the backend contract is provided.
3. **Push notifications:** local in-app/native notifications can be shown after the user grants permission. True remote push delivery while the app is backgrounded requires Firebase project configuration, Android `google-services.json`, FCM registration, and a backend push sender. Those are not created here.
4. **Notification preferences:** the eight parent alert preferences currently persist on the device. A backend preference endpoint is needed to synchronize them across devices and drive remote push delivery.
5. **ETA / route progress:** the UI consumes route progress when it is included in live GPS messages. Server-calculated ETA should be added to the response contract if required.
6. **Offline recovery / geofence auto-end:** this needs authoritative school coordinates, stable GPS checks and backend idempotency. Do not simulate a successful trip end in the client.

## Driver workflow

- Driver opens the Bus workspace and reviews the assigned trip before starting.
- Tapping Start Trip opens a review sheet; the backend trip-start request is sent only after Confirm & Start.
- Location permission is requested only when the driver confirms a trip start.
- Existing trip-store logic owns GPS transmission and active-trip recovery.
- Ending a trip still requires backend confirmation; a client-side success state is not shown before the API succeeds.

## Parent workflow

- Home reads the signed-in parent's linked children and assigned bus/route/driver information.
- Tracking selects a child when multiple children are linked and uses that child's assigned pickup stop.
- The bus is marked LIVE only while live GPS updates arrive. Otherwise the screen clearly says NOT LIVE.
- Alerts read the backend notification feed.
- Eight alert toggles are stored locally on this device; they are not yet synchronized to the server.

## Android build

From `frontend/`:

```bash
npm install
npm run build
npx cap sync android
npx cap open android
```

Build and sign the APK from Android Studio. Before field testing, confirm the API origin, HTTPS/WSS availability, Android location permission behavior, and the backend WebSocket security requirements above.

## Scope preserved

This branch changes the mobile frontend and frontend documentation/configuration only. It does not modify `backend/`, the database, the authentication implementation, `admin.html`, the Admin Portal source, or production deployment settings.
