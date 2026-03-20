# DustyCards

A production-ready Pokémon TCG collection tracker with real-time pricing from the PokéWallet API.

## Features

- **Collection Management** — Track singles and sealed product with condition, language, quantity, and purchase price
- **Live Pricing** — Market prices from TCGPlayer and CardMarket normalized into one unified model
- **Dashboard** — Portfolio value, P&L, charts, and top movers
- **Smart Search** — Debounced search with Singles/Sealed/All category filtering
- **Binder View** — Visual card grid that looks and feels like a real binder
- **List View** — Sortable, filterable table for power users
- **Settings** — Price source, currency, card size, and theme preferences

## Tech Stack

**Backend**: Node.js + Express
**Frontend**: React + Vite + TailwindCSS + Zustand + TanStack Query + Recharts

## Getting Started

### Prerequisites

- Node.js 18+
- PokéWallet API key

### Installation

```bash
# Clone and install all dependencies
npm run install:all

# Set up environment
cp .env.example .env
# Edit .env and add your POKEWALLET_API_KEY
```

### Development

```bash
# Run both backend and frontend
npm run dev

# Backend only (port 3001)
npm run dev:backend

# Frontend only (port 5173)
npm run dev:frontend
```

### Production

```bash
cd frontend && npm run build
cd backend && npm start
```

## Project Structure

```
DustyCards/
├── backend/          Express API server
│   └── src/
│       ├── routes/   API route handlers
│       ├── services/ PokéWallet client + cache
│       ├── middleware/
│       ├── utils/    Normalization + classification
│       └── data/     JSON persistence (collection, settings)
└── frontend/         React SPA
    └── src/
        ├── api/      Axios API client
        ├── hooks/    TanStack Query hooks
        ├── store/    Zustand global state
        ├── components/
        └── pages/
```

## Data Model

Collection items are stored in `backend/src/data/collection.json` with this shape:

```json
{
  "id": "uuid",
  "pokewallet_card_id": "string",
  "name": "string",
  "set_name": "string",
  "set_code": "string",
  "number": "string|null",
  "image_url": "string",
  "quantity": 1,
  "condition": "NM|LP|MP|HP|DMG",
  "language": "EN|JP|DE|FR|ES|IT|PT|KO|ZH",
  "purchase_price": 0.00,
  "purchase_date": "ISO date",
  "notes": "",
  "variant": "string",
  "category": "single|sealed",
  "product_type": "string|null",
  "created_at": "ISO date",
  "updated_at": "ISO date"
}
```
