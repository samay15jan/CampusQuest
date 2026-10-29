Understood. Keep the README minimal and make the actual game state machine the source of truth.

# CampusQuest

CampusQuest is a campus-based territory control game where two factions compete to capture and defend physical locations across campus.

Players solve riddles to unlock territories, receive resonators, physically deploy them, and work together to control territory.

## Core Gameplay

```text
RIDDLE
  ↓
RESONATOR
  ↓
DEPLOY
  ↓
3 / 3 RESONATORS
  ↓
CONTROLLED
  ↓
ATTACK / DEFEND
```

A territory requires **3 active resonators from 3 players** to become controlled.

### Territory States

```text
NEUTRAL / RECLAIMABLE
        │
        ▼
     CONTROLLED
        │
        ├── ATTACK
        │     ↓
        │   DESTROY
        │     ↓
        │  RECLAIMABLE
        │
        └── DEFENSE
              ↓
         LOCK TERRITORY
```

A controlled territory belongs to a faction. Opposing players can attack its resonators. Defenders can lock the territory when the required owners confirm their control.

## Tech Stack

- React + Vite
- JavaScript
- Firebase Authentication
- MapLibre GL
- PWA
- Geolocation / device orientation

## Setup

```bash
npm install
npm run dev
```

Create `.env`:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_STORAGE_BUCKET=
```

Do not commit `.env`.

## Project Status

CampusQuest is currently in development.

Current focus:

- Authentication
- Mobile-first UI
- Campus map
- Territory state machine
- Riddle → Resonator → Deployment flow
- Faction control
- Attack / defense mechanics

## Factions

Two factions compete for control:

**RED** vs **BLUE**

The objective is simple: **capture, control, defend, and reclaim territory across the campus.**


## Database Backup & Demo Seeding

CampusQuest uses PostgreSQL 16 running in Docker. The database is persisted using the `pgdata` Docker volume.

### Backup

Create a compressed PostgreSQL backup on the server:

```bash
mkdir -p ~/backups/campusquest

docker exec campusquest-postgres \
  pg_dump -U campus -d campusquest -Fc \
  > ~/backups/campusquest/campusquest_$(date +%F_%H-%M-%S).dump
```

Store a copy outside the server to protect against server or disk failure.

### Restore

Restore the backup into a separate database for testing:

```bash
docker exec campusquest-postgres \
  createdb -U campus -T template0 campusquest_restore

cat campusquest_YYYY-MM-DD_HH-MM-SS.dump | \
docker exec -i campusquest-postgres \
  pg_restore -U campus -d campusquest_restore
```

Replace the backup filename with the actual file name.

### Demo Data

The `seed_demo_data.sql` script adds mock gameplay activity for existing onboarded users, including XP ledger entries, daily riddles, resonator deployments, and activity feed events.

Transfer the script to the server using SCP:

```bash
scp -i ~/.ssh/YOUR_SSH_KEY \
  Downloads/seed_demo_data.sql \
  USER@SERVER_IP:~/
```

Execute it against the intended database:

```bash
docker exec -i campusquest-postgres \
  psql -U campus -d campusquest_restore \
  -v ON_ERROR_STOP=1 < ~/seed_demo_data.sql
```

**Note:** Run demo seeds against a restored or staging database first. The script may modify existing event and portal state. Back up the database before applying changes to production.