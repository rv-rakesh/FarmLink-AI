# FarmLink AI

Agricultural marketplace that connects farmers with verified bulk buyers. AI recommends a fair price band (Prophet + mandi history), matches nearby demand, simulates pickup routing, and holds payment in escrow until delivery.

## Quick start

### Backend (Flask)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python app.py
```

API: http://localhost:5000  
If MongoDB is not running, the app uses **mongomock** automatically.

Demo logins (seeded on first start):

| Role | Phone | Password |
| --- | --- | --- |
| Farmer | 9876540001 | Farm@123 |
| Buyer | 9000000001 | Buyer@123 |
| Admin | 9999999999 | Admin@123 |

### Frontend (Vite + React)

```bash
cd frontend
npm install
npm run dev
```

UI: http://localhost:5173

### Tests

```bash
cd backend
pytest -q
```

`npm run build` in `frontend/` must succeed with no compile errors.

## Flow

1. Farmer lists a crop (web form, Voice IVR simulator, or SMS simulator).
2. AI shows Prophet forecast + clamped min/max band; farmer sets ask inside the band.
3. Greedy matching allocates quantity to nearby verified buyers (splits if needed).
4. Confirm match → escrow hold → visual pickup route → delivery → release payment.
5. Admin dashboard shows GMV, escrow flags, and GSTIN approval queue.

Voice and SMS screens are labeled **simulators** (Bhashini/Twilio and MSG91 stubs).
