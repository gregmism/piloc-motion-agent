---
name: Video Registry
description: Tracks all video IDs, variants, and filenames — used to assign the next available ID/variant
type: project
---

# Video Registry

Videos created before the ID convention (legacy, no ID assigned):
- `CampagnesDemo.tsx` — legacy
- `CampagnesYTDemo.tsx` — legacy
- `PaiementsEchelonnesLIDemo.tsx` — legacy
- `PaiementsEchelonnesYT2Demo.tsx` — legacy
- `UtilisateursDemo.tsx` — legacy

## New convention (from 2026-04-07)

Format: `{number}{variant} - {Name} - {YYYY-MM-DD}.tsx`

| ID | Variants | Name | Notes |
|----|----------|------|-------|
| 01 | A | Campagnes | Création (5 étapes) + Dashboard. YouTube 65s. Fichier : `01A - Campagnes - 2026-04-07.tsx` |
| 02 | A | Campagnes | Création (5 étapes) + Dashboard. YouTube 60s. Navy Flux. Fichier : `02A - Campagnes - 2026-04-08.tsx` |

**Next available ID: 03**

**How to apply:** When creating a new video, use the next available ID from this table and variant `A`. When producing a variant, increment the variant letter. Update this table after every new file.
