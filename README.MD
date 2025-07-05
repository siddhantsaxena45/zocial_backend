
# 🧿 Zocial - MERN Instagram Clone

Zocial is a full-stack social media application inspired by Instagram. Built using the **MERN** stack (MongoDB, Express.js, React.js, Node.js), it supports user authentication (email/password + Google), post creation, likes, comments, bookmarks, messaging, and real-time video calls.

## ✨ Features

- 🔐 **Authentication**
  - Google Login (OAuth 2.0)
  - Email and password registration
  - JWT-based secure sessions with HTTP-only cookies

- 📸 **Posts**
  - Create, delete posts
  - Like/unlike, comment, and bookmark posts
  - Image uploads with **Cloudinary**
  - Image compression with **sharp**

- 🧑‍💻 **User**
  - Follow/unfollow users
  - Profile and posts/bookmarks
  - Real-time profile updates

- 💬 **Chat**
  - Real-time messaging (Socket.IO)
  - Per-user seen/unseen message states
  - Notification badges for new messages

- 📞 **Video Call**
  - Real-time 1:1 calling via **WebRTC + Socket.IO**
  - Incoming call screen, auto-reject on timeout

## 🧱 Tech Stack

### Frontend (Client)
- React.js (Vite)
- Redux Toolkit
- Axios
- Tailwind CSS
- Google Identity Services

### Backend (Server)
- Node.js + Express.js
- MongoDB + Mongoose
- Cloudinary (image upload)
- Sharp (image optimization)
- Socket.IO (chat & video calling)
- JWT + Bcrypt (auth)




## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- MongoDB Atlas account
- Cloudinary account (for image uploads)
- Google Cloud OAuth 2.0 credentials

---

### 1️⃣ Clone the repo

```
git clone https://github.com/siddhantsaxena45/zocial_backend.git
cd zocial-clone
````

### 2️⃣ Backend Setup

```
cd server
npm install
```

#### Create `.env` file inside `/server`:

```env
PORT=8000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

```bash
npm run dev
```

---

### 3️⃣ Frontend Setup

```bash
cd ../client
npm install
```

#### Create `.env` file inside `/client`:

```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_BACKEND_URL=https://your-backend-url.onrender.com
```

```bash
npm run dev
```

---

## 🌐 Deployment

### Frontend: [Vercel](https://vercel.com/)

* Deploy `/client` folder

### Backend: [Render](https://render.com/)

* Deploy `/server` folder with build command: `npm install`
* Add environment variables

> ⚠️ Ensure CORS and Cookies are properly configured for HTTPS with:

```js
credentials: true,
origin: ["https://zocial.vercel.app"]
```

And in cookies:

```js
res.cookie("token", token, {
  httpOnly: true,
  secure: true,
  sameSite: "None",
  ...
})
```

---



