# פריסה ל-Vercel — 5 שלבים

## 1. Storage → Postgres
ב-Vercel: **Storage → Create Database → Postgres**

## 2. Import + Environment Variables
Import את `yosefi1/Bit`. הוסף:

| משתנה | מאיפה |
|--------|--------|
| `DATABASE_URL` | מ-Storage (Pooled / Prisma) |
| `DIRECT_URL` | מ-Storage (Direct / Non-pooled) |
| `NEXTAUTH_SECRET` | מחרוזת אקראית ארוכה |
| `NEXTAUTH_URL` | `https://YOUR-APP.vercel.app` |
| `BIT_PHONE` | מספר הביט שלך |
| `SEED_ADMIN_PASSWORD` | סיסמת מנהל |

## 3. Deploy
לחץ **Deploy** וחכה.

## 4. Seed (פעם אחת)
מהמחשב שלך:

```powershell
cd C:\Projects\BIT
$env:DATABASE_URL="..."   # אותו connection string מ-Vercel
$env:DIRECT_URL="..."
npm run db:seed
```

## 5. כניסה
`https://YOUR-APP.vercel.app` → `admin` / הסיסמה שהגדרת

---

**בדיקת ביט:** רק מהטלפון, אחרי שדיווח מאושר.
