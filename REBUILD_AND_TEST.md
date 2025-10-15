# CRITICAL: Rebuild & Test Instructions

## The Problem You're Seeing

Looking at your browser console, the response still shows:
```json
"images": null
```

This means **the old code is still running in Docker** even after rebuild.

## Step-by-Step Fix

### 1. Stop Everything
```bash
docker-compose down
```

### 2. Force Rebuild (No Cache)
```bash
docker-compose build --no-cache server
```

### 3. Start It Up
```bash
docker-compose up -d
```

### 4. **CRITICAL: Check the Server Logs**

This is the most important step:
```bash
docker-compose logs -f server
```

**You MUST see this at startup:**
```
============================================================
🔧 SERVER VERSION 2.0 - FILTERING & IMAGES FIXED
============================================================
```

If you don't see that, the rebuild didn't work!

### 5. Test the Shop Page

With the logs still running (`docker-compose logs -f server`), open your browser and go to:
```
http://localhost:5173/shop
```

**You MUST see these logs in the terminal:**
```
████████████████████████████████████████████████████████████████████████████████
█ 🔥🔥🔥 NEW CODE RUNNING - VERSION 2.0 🔥🔥🔥
█ ProductController.listProducts v2.0 ACTIVE
█ Timestamp: 2025-10-14T...
████████████████████████████████████████████████████████████████████████████████
📥 Query params received: {
  "page": "1",
  "limit": "20"
}
🔧 Parsed options: {
  "page": 1,
  "limit": 20
}
🎯 Category filter: NONE
🔨 ProductQueryBuilder.build v2.0
   WHERE conditions: [ ... ]
   Params: [ ... ]
   📝 Generated SQL includes images subquery: YES
📦 ProductService.getProducts v2.0
✅ Products returned: 2
📦 First product sample:
   - ID: 3
   - Name: Test prod
   - Images field type: object
   - Images value: []
   - Has categories: ["accessories"]
████████████████████████████████████████████████████████████████████████████████
```

### 6. Click on "Accessories" Category

You should see MORE logs appear showing:
```
🎯 Category filter: accessories
```

## What the Logs Tell You

### ✅ If You See "VERSION 2.0" Messages:
- The new code IS running
- Images will be an **array** (either `[]` empty or with image objects)
- If images is `[]`, that's correct - you just need to upload images
- Category filtering IS working

### ❌ If You DON'T See "VERSION 2.0" Messages:
- Old code is still running
- Docker didn't rebuild properly
- Try these nuclear options:
  ```bash
  # Stop everything
  docker-compose down
  
  # Remove the container
  docker rm simfab-facelift-server-1
  
  # Remove the image
  docker rmi simfab-facelift-server
  
  # Rebuild from scratch
  docker-compose build --no-cache server
  
  # Start
  docker-compose up -d
  
  # Watch logs
  docker-compose logs -f server
  ```

## Expected vs Actual

### OLD CODE (What you're seeing now):
```json
{
  "images": null  ❌
}
```

### NEW CODE (What you should see):
```json
{
  "images": []  ✅ (empty array if no images uploaded)
}
```

or

```json
{
  "images": [
    {
      "id": 1,
      "image_url": "/uploads/...",
      "is_primary": true
    }
  ]  ✅ (with images if uploaded)
}
```

## The Smoking Gun

The **Docker logs** are the smoking gun. If you don't see the big banner with fire emojis and "VERSION 2.0", then the container is still running old code no matter what you do in the browser.

**DO NOT TEST THE FRONTEND UNTIL YOU SEE THE VERSION 2.0 BANNER IN DOCKER LOGS!**

## Quick Test Command

After rebuild, run this to verify the version:
```bash
curl http://localhost:3001/ | jq .version
```

Should return:
```
"2.0.0 - FILTERING & IMAGES FIXED"
```

If it returns `"1.0.0"`, the rebuild failed.

