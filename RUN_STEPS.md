# Step-by-Step: Run and Test Changes (PowerShell)

## ✅ Step 1: Navigate to Backend and Install Dependencies

```powershell
cd backend
pnpm install
```

**Expected Output**: Dependencies installed successfully

---

## ✅ Step 2: Run Database Migration

Create migration for new models (AutoSpinOrder, UserPreferences):

```powershell
pnpm prisma migrate dev --name add_autospin_and_preferences
```

**Expected Output**: 
- Migration file created
- Migration applied to database
- Prisma Client generated

**If migration fails**, check:
- PostgreSQL is running
- DATABASE_URL in `.env` is correct
- Database exists

**Alternative**: If you need to reset database (⚠️ deletes all data):
```powershell
pnpm prisma migrate reset
```

---

## ✅ Step 3: Verify Migration

Open Prisma Studio to check new tables:

```powershell
pnpm prisma studio
```

**Check for**:
- `AutoSpinOrder` table
- `UserPreferences` table

Press `Ctrl+C` to close Prisma Studio when done.

---

## ✅ Step 4: Generate Prisma Client (if needed)

```powershell
pnpm prisma generate
```

This should have run automatically during migration, but run it if you see type errors.

---

## ✅ Step 5: Start Development Server

```powershell
pnpm run dev
```

**Expected Output**:
```
[Nest] INFO Starting Nest application...
[Nest] INFO Application successfully started on port 3000
```

**If port is in use**, check `.env` file for `PORT` setting or change it.

---

## ✅ Step 6: Verify Server is Running

Open browser or use PowerShell:

```powershell
# Check health endpoint
Invoke-WebRequest -Uri http://localhost:3000/health

# Or open Swagger documentation
Start-Process http://localhost:3000/api
```

**Verify new endpoints in Swagger**:
- `/autospin` - AutoSpin controller
- `/suggestions` - Suggestions controller  
- `/chat` - Chat controller
- `/preferences` - Preferences controller
- `/bets/cancel/:betId` - Cancel bet endpoint

---

## ✅ Step 7: Test Authentication

**Get JWT Token** (you'll need this for all protected endpoints):

```powershell
# Register (if needed)
$body = @{
    username = "testuser"
    password = "password123"
    email = "test@example.com"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3000/auth/register -Method Post -Body $body -ContentType "application/json"

# Login
$loginBody = @{
    username = "testuser"
    password = "password123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri http://localhost:3000/auth/login -Method Post -Body $loginBody -ContentType "application/json"
$token = $response.access_token
Write-Host "Token: $token"  # Save this token
```

---

## ✅ Step 8: Test New Features

### A. Test Preferences (Flexible Timing)

```powershell
$headers = @{
    Authorization = "Bearer $token"
}

# Get preferences
Invoke-RestMethod -Uri http://localhost:3000/preferences -Method Get -Headers $headers

# Update preferences
$prefsBody = @{
    preferredRoundDuration = 300  # 5 minutes
    autoSpinEnabled = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3000/preferences -Method Put -Headers $headers -Body $prefsBody -ContentType "application/json"
```

### B. Test Auto-Spin Orders

```powershell
$autoSpinBody = @{
    market = "OUTER"
    selection = "BUY"
    amountUsd = 10
    roundsRemaining = 5
} | ConvertTo-Json

# Create auto-spin order (Premium required)
Invoke-RestMethod -Uri http://localhost:3000/autospin -Method Post -Headers $headers -Body $autoSpinBody -ContentType "application/json"

# Get user's orders
Invoke-RestMethod -Uri http://localhost:3000/autospin -Method Get -Headers $headers
```

### C. Test Suggestions

```powershell
# Get suggestions for current round (needs at least 3 bets)
Invoke-RestMethod -Uri http://localhost:3000/suggestions/current -Method Get -Headers $headers
```

### D. Test Chat

```powershell
$chatBody = @{
    content = "Hello everyone!"
    roomType = "GENERAL"
} | ConvertTo-Json

# Send message
Invoke-RestMethod -Uri http://localhost:3000/chat -Method Post -Headers $headers -Body $chatBody -ContentType "application/json"

# Get messages
Invoke-RestMethod -Uri http://localhost:3000/chat/GENERAL -Method Get -Headers $headers
```

---

## ✅ Step 9: Test Premium Features

**Make user premium** (in database or via API):

```sql
-- Run in PostgreSQL or Prisma Studio
UPDATE "User" SET "premium" = true, "premiumExpiresAt" = '2025-12-31' WHERE "username" = 'testuser';
```

Then test:
- ✅ Auto-spin orders (should work now)
- ✅ Cancel bets
- ✅ Flexible timing
- ✅ Premium chatroom

---

## ✅ Step 10: Test Settlement (0-0 Tie)

1. Wait for a round to open (or manually trigger)
2. Place some bets so one layer has 0-0 (no bets on either side)
3. Let round settle
4. Check that Indecision wins if any layer is 0-0

---

## 🐛 Troubleshooting

### Migration Issues
```powershell
# Check Prisma connection
pnpm prisma db pull

# Validate schema
pnpm prisma validate

# Format schema
pnpm prisma format
```

### Type Errors
```powershell
# Regenerate Prisma client
pnpm prisma generate

# Rebuild
pnpm run build
```

### Port Already in Use
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process (replace PID)
taskkill /PID <process-id> /F

# Or change port in .env
```

### Clear Cache
```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Force pnpm-lock.yaml
pnpm install
```

---

## ✅ Quick Verification Checklist

After setup, verify:

- [ ] `pnpm install` completed without errors
- [ ] Migration created successfully
- [ ] `AutoSpinOrder` and `UserPreferences` tables exist in database
- [ ] Server starts without errors
- [ ] Swagger shows new endpoints
- [ ] Can authenticate and get JWT token
- [ ] Can create preferences
- [ ] Can create auto-spin order (if premium)
- [ ] Can get suggestions
- [ ] Can send chat messages

---

## 📝 Next Steps

Once everything is tested:

```powershell
# Commit changes
git add .
git commit -m "feat: implement premium features - autospin, suggestions, chat, flexible timing"

# Push to remote
git push -u origin japhet
```

---

**You're all set! 🎉**

For detailed API testing, use Postman or Insomnia with the Swagger documentation at `http://localhost:3000/api`

