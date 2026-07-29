LAN Pairing (mobile -> PC)

Overview
- The PC runs a local Aries server (HTTP) exposing pairing and conversation endpoints.
- The Android app pairs by requesting a short 6-digit code from the PC, scanning or entering it, then receiving a device token.
- The mobile uses the token for subsequent requests to append messages and fetch messages.

Flow
1. On PC: POST /v1/pair/start { device_name } -> { code, expires_at }
2. On mobile: user enters code + PC IP, POST /v1/pair/confirm { code } -> { device_token }
3. Mobile uses Authorization: Bearer <device_token> when POSTing messages to /v1/conversations/:id/messages
4. Mobile fetches messages via GET /v1/conversations/:id/messages?after=

Security
- Tokens are UUIDs and kept secret. For LAN dev use, HTTP is acceptable but HTTPS is recommended for real networks.
- Pair codes expire after 5 minutes.

Notes
- This implementation uses a file-based storage adapter (.data/) for Milestone 1. It is modular and can be swapped for SQL later.
