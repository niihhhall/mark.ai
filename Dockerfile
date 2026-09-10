# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────
# Stage 1 — Build the React dashboard (mark-agent-front)
# Produces /fe/dist, which the backend serves at /admin/dashboard.
# ─────────────────────────────────────────────────────────────
FROM node:20-slim AS frontend
WORKDIR /fe

# Install deps first (better layer caching)
COPY mark-agent-front/package.json mark-agent-front/package-lock.json ./
RUN npm ci

COPY mark-agent-front/ ./

# Provide the public VITE_* build config so the build is self-contained on
# Render (the local .env.production is git-ignored and not in the build context).
# The anon key is a public, RLS-protected browser key — safe to bake in.
RUN printf 'VITE_SUPABASE_URL=https://rdlcnzyteplgvgjiqzyj.supabase.co\nVITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkbGNuenl0ZXBsZ3ZnamlxenlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MDc3ODAsImV4cCI6MjA5MTQ4Mzc4MH0.ZZcIECweulmir_bNZWioPHaypqJlol4MGnGzV0dh6rU\nVITE_API_URL=https://markeye-whatsapp-agent.onrender.com\n' > .env.production

RUN npm run build


# ─────────────────────────────────────────────────────────────
# Stage 2 — Python backend
# ─────────────────────────────────────────────────────────────
FROM python:3.11-slim

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Overlay the freshly built dashboard from the frontend stage.
COPY --from=frontend /fe/dist ./mark-agent-front/dist

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
