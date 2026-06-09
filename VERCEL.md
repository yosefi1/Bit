# פריסה ל-Vercel — צעד אחר צעד (Deploy קודם)

## שלב 1 — Deploy (בלי DB, בלי Values מיוחדים)

במסך Import:
- השאר הכל כמו שזה
- **Environment Variables** — אפשר להשאיר ריק (או רק `NEXTAUTH_SECRET` = `abc123temp`)
- לחץ **Deploy**

ה-build יעבור גם בלי `DATABASE_URL`. האתר עדיין לא יעבוד עד שלב 3.

---

## שלב 2 — חיבור Postgres דרך Vercel (לא דרך neon.tech)

1. נכנס לפרויקט **bit** ב-Vercel (אחרי ה-Deploy)
2. למעלה: **Storage**
3. **Create Database** → בחר **Neon** (או Postgres)
4. אם יש לך חשבון Neon — **Connect** / **Link existing account**
5. תן שם למסד → **Create** / **Connect**

Vercel **יוסיף אוטומטית** את `DATABASE_URL` (לפעמים גם `POSTGRES_URL`).

---

## שלב 3 — Redeploy

**Deployments** → על ה-Deploy האחרון → **⋯** → **Redeploy**

עכשיו ה-build ייצור את הטבלאות במסד.

---

## שלב 4 — משתנים + Seed

**Settings → Environment Variables** — הוסף:

| Key | Value |
|-----|--------|
| `NEXTAUTH_SECRET` | מחרוזת ארוכה אקראית |
| `NEXTAUTH_URL` | כתובת האתר (למשל `https://bit-xxx.vercel.app`) |
| `BIT_PHONE` | מספר הביט שלך |
| `SEED_ADMIN_PASSWORD` | סיסמת admin |

**Redeploy** שוב.

Seed (פעם אחת, מהמחשב):
```powershell
cd C:\Projects\BIT
$env:DATABASE_URL="..."   # העתק מ-Vercel → Settings → Environment Variables
npm run db:seed
```

---

## שלב 5 — כניסה

`https://YOUR-APP.vercel.app` → `admin` / הסיסמה

---

## שאלות נפוצות

**אין לי Add Project ב-Neon?**  
לא צריך. הכל דרך **Vercel → Storage → Neon**.

**Deploy נכשל?**  
ודא שהקוד האחרון נדחף (Redeploy). build חדש עובר גם בלי DB.

**Storage לא מופיע?**  
רק **אחרי** שהפרויקט נוצר (אחרי Deploy ראשון). לא במסך Import.
