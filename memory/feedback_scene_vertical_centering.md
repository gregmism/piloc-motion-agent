---
name: Centrage vertical des scènes frame-based
description: Toujours justifyContent center sur les scènes — jamais flex-start + paddingTop manuel
type: feedback
---

Toujours utiliser `justifyContent: "center"` sur les scènes frame-based (`AbsoluteFill` avec `display: flex, flexDirection: column`). Ne jamais compenser avec `justifyContent: "flex-start"` + `paddingTop` fixe.

**Why:** Dans `02A - Campagnes`, la scène Dashboard utilisait `flex-start` + `paddingTop: 52` par crainte que le contenu ne tienne pas. Résultat : contenu collé en haut, grand vide en bas — incohérent avec toutes les autres scènes.

**How to apply:** Si le contenu semble trop grand pour tenir centré, réduire les `gap` ou les tailles de cartes — jamais changer le mode d'alignement vertical. Le flex center est la règle absolue pour toutes les scènes.
