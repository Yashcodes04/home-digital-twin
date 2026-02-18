# ⚡ Quick Start Guide

Get your Digital Twin Warehouse running in **5 minutes**!

---

## 🎯 What You'll Get

After following this guide:
- ✅ Backend API running on port 8000
- ✅ Frontend serving on port 3000
- ✅ 6 Schneider Electric products in database
- ✅ Ready-to-use 3D warehouse interface

---

## 📋 Prerequisites Checklist

Before starting, make sure you have:
- [ ] Python 3.9+ installed (`python --version`)
- [ ] PostgreSQL 14+ installed (`psql --version`)
- [ ] Git installed (`git --version`)
- [ ] Terminal/Command Line access

---

## 🚀 5-Minute Setup

### Step 1: Install PostgreSQL (if not installed)

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Windows:**
Download from: https://www.postgresql.org/download/windows/

**Ubuntu:**
```bash
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

---

### Step 2: Create Database

```bash
# Access PostgreSQL
psql postgres

# Or on Windows:
psql -U postgres
```

**Copy & paste these commands:**
```sql
CREATE DATABASE digital_twin;
CREATE USER dtuser WITH PASSWORD 'dtpassword123';
GRANT ALL PRIVILEGES ON DATABASE digital_twin TO dtuser;
\c digital_twin
GRANT ALL ON SCHEMA public TO dtuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO dtuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO dtuser;
\q
```

---

### Step 3: Clone & Setup Backend

```bash
# Clone repository
git clone https://github.com/yourusername/digital-twin-warehouse.git
cd digital-twin-warehouse/backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOL
DATABASE_URL=postgresql://dtuser:dtpassword123@localhost:5432/digital_twin
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=True
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
EOL

# Start backend
python main.py
```

**You should see:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

✅ **Backend is running!**

---

### Step 4: Seed Demo Data

**Open NEW terminal** (keep backend running):

```bash
curl -X POST http://localhost:8000/seed-data/
```

**Response:**
```json
{
  "message": "Demo data seeded successfully",
  "products_created": 6
}
```

✅ **Product catalog loaded!**

---

### Step 5: Start Frontend

**In the NEW terminal:**

```bash
cd ../frontend

# Add your 3D model
# Place 'Changes.glb' file in this folder

# Start server
python -m http.server 3000
```

✅ **Frontend is running!**

---

### Step 6: Open Setup Wizard

**Browser:**
```
http://localhost:3000/index.html
```

**Fill in:**
1. Warehouse name: "My Warehouse"
2. Floors: Select 3
3. Click "Manual Placement"
4. Click "🚀 Launch Digital Twin"

✅ **You're done!** 🎉

---

## 🧪 Test It Works

### Test Backend
```bash
# List products
curl http://localhost:8000/products/

# Should return 6 Schneider Electric products
```

### Test Frontend
1. Open: `http://localhost:3000/warehouse.html`
2. You should see:
   - 3D warehouse environment
   - Device palette on left
   - Floor selector

### Test Drag & Drop
1. Drag "Galaxy VL" from left palette
2. Drop on 3D floor
3. Click the device
4. Info panel appears with serial number

✅ **Everything works!**

---

## 📁 Final File Structure

```
digital-twin-warehouse/
├── backend/
│   ├── main.py              ✅ Running
│   ├── venv/                ✅ Activated
│   └── .env                 ✅ Configured
└── frontend/
    ├── Changes.glb          ⚠️ Add your GLB file
    ├── index.html
    ├── warehouse.html
    ├── setup.js
    └── main.js
```

---

## 🔧 Common First-Time Issues

### Issue: "Permission denied for schema public"
**Fix:**
```bash
psql -U postgres -d digital_twin
```
```sql
GRANT ALL ON SCHEMA public TO dtuser;
\q
```

### Issue: "ModuleNotFoundError"
**Fix:**
```bash
# Make sure venv is activated
source venv/bin/activate  # macOS/Linux
venv\Scripts\activate     # Windows
pip install -r requirements.txt
```

### Issue: "Black screen in 3D view"
**Fix:**
- Add `Changes.glb` file to `frontend/` folder
- Check browser console (F12) for errors

---

## 🎯 Next Steps

Now that it's running:

1. **Add Devices**
   - Drag from palette
   - Upload Excel file

2. **Explore Features**
   - Click devices to inspect
   - Search by serial number
   - View datasheet table

3. **Read Full Documentation**
   - See README.md for complete guide
   - Check API docs: `http://localhost:8000/docs`


**🎉 Congratulations! Your Digital Twin Warehouse is live!**
