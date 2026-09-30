# RideTogether 

> Real-Time Group Ride Coordination Platform

RideTogether is a full-stack web application designed for group motorcyclists and cyclists traveling together. It solves the critical problem of group separation, unexpected stops, route deviations, and emergencies by providing real-time rider tracking on a shared map, live status broadcasting, and separation alerts.

---

## 📌 Problem Statement
During group rides, members frequently get separated due to traffic, differing riding paces, refueling stops, mechanical issues, or wrong turns. Riders behind or ahead often lack visibility into what happened to their group members, creating safety risks and coordination delays.

## 💡 Solution
RideTogether provides a real-time group ride coordination workspace:
- **Shared Live Map**: See all group members' precise live GPS locations on a unified map.
- **Rider Status Broadcasting**: Instantly notify the group if you are refueling, taking a break, or facing an emergency.
- **Automated Separation & Prolonged Stop Alerts**: Detect when a rider has fallen too far behind or stopped unexpectedly using geospatial algorithms.
- **Quick Assistance & Navigation**: One-click direct phone call or Google Maps navigation to a specific rider's latest location.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React.js, Vite, Tailwind CSS, React Router DOM, Axios, Socket.IO Client |
| **Backend** | Node.js, Express.js, Socket.IO Server |
| **Database** | MongoDB, Mongoose ORM |
| **Authentication** | JWT (JSON Web Tokens), bcryptjs, HTTP-Only Cookies |
| **Maps & Location** | Google Maps JavaScript API, Browser Geolocation API |
| **Realtime** | Socket.IO (WebSockets / Fallback Polling) |

---

## 🏗️ Architecture & System Design
![Uploading diagram (2).png…]()


```
                             +-----------------------------------+
                             |          Browser Client           |
                             |  React + Vite + Tailwind + Maps   |
                             +-----------------+-----------------+
                                               |
                       +-----------------------+-----------------------+
                       |                                               |
                REST (HTTP/HTTPS)                               Socket.IO (WSS/WS)
             Auth, Rides, History                             Realtime GPS & Status
                       |                                               |
                       v                                               v
             +-------------------+                           +-------------------+
             |   Express Server  |                           |  Socket.IO Server |
             +---------+---------+                           +---------+---------+
                       |                                               |
                       | Mongoose ORM                                  | Ride Rooms
                       v                                               v
             +-------------------+                           +-------------------+
             | MongoDB Database  |                           | Live Memory State |
             +-------------------+                           +-------------------+
```

---

## 🔒 Location Privacy & Security
- Real-time GPS location updates are **only** broadcast to authenticated members of that specific ride's Socket.IO room (`ride:<rideId>`).
- Sensitive environment variables (MongoDB credentials, JWT Secret) are strictly kept on the server.
- High-frequency GPS updates live in-memory and are **not** written to the database for every position tick, preventing DB performance degradation and privacy leakage.

---

## ⚡ Quick Start / Local Setup

### 1. Prerequisites
- Node.js (v18+ recommended)
- MongoDB running locally or a MongoDB Atlas URI

### 2. Environment Configuration
Copy template environment files for both client and server:

```bash
# Server environment
cp server/.env.example server/.env

# Client environment
cp client/.env.example client/.env
```

### 3. Install Dependencies
```bash
npm run install:all
```

### 4. Running Development Servers
To run both backend and frontend:
```bash
# Terminal 1: Backend Server (Port 5000)
npm run server:dev

# Terminal 2: Frontend App (Port 5173)
npm run client
```
