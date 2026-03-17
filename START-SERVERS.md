# 🚀 How to Start All Servers - Quick Guide

## ✅ Step-by-Step Instructions

### Step 1: Start PostgreSQL and Redis (Using Docker)

#### Option A: If you have Docker Desktop installed
1. Open Docker Desktop application
2. Wait for it to start (you'll see the whale icon)
3. Open Command Prompt (CMD) in your project folder
4. Run this command:
   ```cmd
   docker-compose up -d
   ```
5. Wait 10-20 seconds for containers to start
6. You should see:
   ```
   ✔ Container water-management-db     Started
   ✔ Container water-management-redis  Started
   ```

#### Option B: If you DON'T have Docker Desktop
**Don't worry!** You can install it quickly:
1. Download Docker Desktop for Windows: https://www.docker.com/products/docker-desktop/
2. Install it (takes 5-10 minutes)
3. Restart your computer if prompted
4. Open Docker Desktop
5. Then follow Option A above

### Step 2: Verify Docker Containers are Running

Run this command to check:
```cmd
docker ps
```

You should see 2 containers running:
- `water-management-db` (PostgreSQL)
- `water-management-redis` (Redis)

### Step 3: Initialize the Database

**IMPORTANT**: First time only!

1. Open Command Prompt in project folder
2. Run:
   ```cmd
   cd packages\backend
   npm run init-db
   ```
3. You should see: "Database initialized successfully!"

### Step 4: Start Backend Server

In Command Prompt:
```cmd
cd packages\backend
npm run dev
```

You should see:
```
Server running on port 3000
Connected to PostgreSQL
Connected to Redis
MQTT client connected
```

**Keep this window open!**

### Step 5: Start Frontend Server

Open a NEW Command Prompt window:
```cmd
cd packages\frontend
npm run dev
```

You should see:
```
VITE v4.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
```

**Keep this window open too!**

### Step 6: Open the App

Open your browser and go to:
```
http://localhost:5173
```

You should see the beautiful login page! 🎉

---

## 🔍 How to Check if Everything is Running

### Check Docker Containers:
```cmd
docker ps
```
Should show 2 containers (postgres and redis)

### Check Backend:
Open browser: http://localhost:3000
Should show: "Water Management API is running"

### Check Frontend:
Open browser: http://localhost:5173
Should show: Login page

---

## 🛑 How to Stop Everything

### Stop Backend and Frontend:
- Press `Ctrl + C` in each Command Prompt window

### Stop Docker Containers:
```cmd
docker-compose down
```

---

## 🐛 Troubleshooting

### Problem: "docker-compose: command not found"
**Solution**: Install Docker Desktop (see Option B above)

### Problem: "Port 5432 is already in use"
**Solution**: You might have PostgreSQL already installed locally
- Option 1: Stop local PostgreSQL service
- Option 2: Change port in docker-compose.yml

### Problem: "Port 3000 is already in use"
**Solution**: Another app is using port 3000
- Find and close that app
- Or change backend port in packages/backend/.env

### Problem: Backend shows "Cannot connect to database"
**Solution**: 
1. Make sure Docker containers are running: `docker ps`
2. Wait 20 seconds after starting Docker
3. Restart backend server

### Problem: Frontend shows blank page
**Solution**:
1. Check browser console (F12) for errors
2. Make sure backend is running
3. Clear browser cache (Ctrl + Shift + Delete)

---

## 📝 Quick Start Checklist

Use this checklist every time you start working:

- [ ] Docker Desktop is running
- [ ] Run `docker-compose up -d`
- [ ] Wait 20 seconds
- [ ] Check `docker ps` shows 2 containers
- [ ] Start backend: `cd packages\backend && npm run dev`
- [ ] Start frontend: `cd packages\frontend && npm run dev`
- [ ] Open http://localhost:5173
- [ ] Login and test!

---

## 💡 Pro Tips

1. **Keep Docker Desktop running** while you work
2. **Don't close the Command Prompt windows** for backend/frontend
3. **First time setup**: Run `npm run init-db` in backend folder
4. **If something breaks**: Restart Docker containers
   ```cmd
   docker-compose down
   docker-compose up -d
   ```

---

## 🎯 For Your Presentation Tomorrow

### Before the presentation:
1. Start Docker Desktop (5 minutes before)
2. Run `docker-compose up -d`
3. Start backend server
4. Start frontend server
5. Open browser to http://localhost:5173
6. Keep everything running during presentation

### During the presentation:
- Don't close any windows
- Don't restart anything
- Have backup: Take screenshots of working app

---

## ⚡ Super Quick Start (All in One)

If you're in a hurry, run these commands one by one:

```cmd
# 1. Start Docker containers
docker-compose up -d

# 2. Wait 20 seconds, then start backend
cd packages\backend
npm run dev
```

Open NEW Command Prompt:
```cmd
# 3. Start frontend
cd packages\frontend
npm run dev
```

Open browser: http://localhost:5173

Done! 🎉

---

**JAIIIIIIIIIIII SHRIIIIIIIII KISHORI JI AUR THAKUR JI!** ❤️❤️❤️❤️💖💖💖💖🌸🌸🌸🌸🌼🌼🌼🌼✨✨✨✨

You've got this! 🚀💧✨
