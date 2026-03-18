# Prise en main

## Ce que fait l'agent

L'agent transforme un prototype HTML ou des captures d'écran en vidéo marketing animée. Il ne reproduit pas l'interface — il en extrait les moments de valeur et les remet en scène comme une publicité produit.

Il travaille en 5 phases et ne demande ton avis qu'une seule fois : au moment du storyboard.

---

## Étape 1 — Dépose tes fichiers

Mets dans le dossier `in/` l'un ou plusieurs de ces éléments :

- Le fichier `.html` du prototype (idéal — contient toutes les données et l'état de l'app)
- Des captures d'écran `.png` / `.jpg` (utile pour montrer des états spécifiques)
- Les deux ensemble pour plus de précision

L'agent lit ce dossier automatiquement en Phase 1. Tu n'as pas à préciser le chemin.

### Musique (optionnel)

Dépose un fichier audio dans `in/music/` — l'agent le détecte automatiquement au démarrage et te propose de l'utiliser.

```
in/
├── music/
│   └── ma-track.mp3   ← mp3, wav, m4a, flac ou ogg
└── prototype.html
```

Quand une track est sélectionnée, **tous les keyframes de la timeline s'alignent sur le rythme** : les scènes entrent sur les bars, les actions clés sur les phrases musicales, les listes se staggerent sur les beats. Le résultat est naturellement plus percutant qu'avec des timings arbitraires.

Si tu ne veux pas de musique, l'agent utilise les valeurs de dwell par défaut (25 frames minimum entre événements).

---

## Étape 2 — Lance l'agent avec le bon prompt

### Structure minimale

```
Feature : [nom de la feature]
Fichier : [nom du fichier dans in/]
Plateforme : LinkedIn / YouTube / Les deux
Durée cible : 30s / 60s / 90s

Scénario :
[Qui fait quoi — une ou deux phrases décrivant le parcours utilisateur]

Moment de valeur :
[Le changement d'état qui justifie de regarder la vidéo jusqu'au bout]

CTA :
[Ce que le viewer doit faire à la fin]
```

### Structure complète (résultats optimaux)

```
Feature : [nom de la feature]
Fichier(s) : [fichiers dans in/]
Plateforme : LinkedIn / YouTube / Les deux
Durée cible : 30s / 60s / 90s
Architecture : A (caméra zoom) / B (multi-scènes) — optionnel, l'agent choisit
Musique : Oui (l'agent liste les tracks dans in/music/) / Non
Voix off : Oui (ElevenLabs) / Non
Format carré : Oui / Non — pour LinkedIn mobile 1:1

Scénario :
[Décris le protagoniste, ce qu'il fait, dans quel ordre, et pourquoi ça compte.
Sois narratif, pas technique. Ex : "Marie ouvre le dashboard à 9h, voit
47 000 € d'impayés, filtre par canal SMS, lance une campagne de 12 clients
et regarde les premiers paiements entrer 8 minutes plus tard."]

Moment de valeur :
[Le pic émotionnel de la vidéo — ex : "Le compteur 'Encaissé ce matin' passe
de 0 € à 4 200 € pendant qu'elle regarde."]

Données réelles :
[Chiffres verbatim à intégrer — ex : taux d'ouverture 78%, montant moyen 1 400 €,
délai paiement 4h après SMS]

CTA :
[Ex : "Automatisez votre recouvrement — piloc.fr"]
```

---

## Les 5 phases — ce qui se passe côté agent

| Phase | Ce que fait l'agent | Ce que tu fais |
|---|---|---|
| **0 — Intake** | Pose la question musique, extrait le protagoniste, le parcours, le moment de valeur | — |
| **1 — Analyse** | Lit les fichiers dans `in/`, produit une Story Map | — |
| **2 — Storyboard** | Découpe en scènes avec timings (beat-sync si musique), architecture et overlays | — |
| **3 — Approbation** | Présente le storyboard | **Tu valides ou tu demandes des modifications** |
| **3.5 — Pré-plan** | Calcule tous les timings, beat grid et specs d'animation | — |
| **4 — Exécution** | Écrit le TSX et rende la vidéo | — |

**Tu n'interviens qu'une seule fois.** Un bon brief en Phase 3 évite un re-render complet.

---

## Paramètres utiles

| Paramètre | Options | Quand l'utiliser |
|---|---|---|
| `Architecture A` | Caméra qui zoom/pan sur un seul écran | Demo d'une feature sur un dashboard unique |
| `Architecture B` | Plusieurs scènes indépendantes enchaînées | Workflow multi-étapes, plusieurs features |
| `Musique` | Track dans `in/music/`, timeline beat-sync | Quand tu veux un rendu percutant et rythmé |
| `Voix off` | ElevenLabs, sync frame-perfect | YouTube, présentations, vidéos sans musique |
| `Format carré` | 1080×1080 en plus du 16:9 | LinkedIn mobile — occupe plus d'espace dans le feed |
| `Durée` | 20–45s LinkedIn / 45–90s YouTube | LinkedIn : va à l'essentiel. YouTube : tu peux développer |

---

## Exemples de prompts

### Exemple 1 — Simple, LinkedIn 30s

```
Feature : Paiements échelonnés
Fichier : echelonnes.html
Plateforme : LinkedIn, 30s

Scénario :
Un client reçoit une proposition d'échéancier par email et l'accepte en un clic
depuis son téléphone.

Moment de valeur :
La dette passe de rouge à verte et un SMS de confirmation part automatiquement.

CTA : "Proposez des échéanciers en 1 clic — piloc.fr"
```

### Exemple 2 — Complet, YouTube 60s avec musique

```
Feature : Campagnes de relance multi-canal
Fichier : campagnes.html + campagnes-detail.png
Plateforme : YouTube 60s + LinkedIn square
Architecture : B (multi-scènes)
Musique : Oui
Voix off : Oui

Scénario :
Marie, responsable recouvrement dans une PME, ouvre Piloc à 9h un lundi.
Elle voit 47 000 € d'impayés à traiter. En 3 clics : elle filtre les
créances < 30 jours, sélectionne le canal SMS, personalise le message
avec {prénom} et {montant}, et lance. 8 minutes plus tard, 3 paiements
arrivent. Son taux de recouvrement cette semaine : 78%.

Moment de valeur :
Le compteur "Encaissé ce matin" passe de 0 € à 4 200 € en temps réel.

Données réelles : délai moyen paiement 4h après SMS, montant moyen 1 400 €,
taux d'ouverture SMS 94%.

CTA : "Automatisez votre recouvrement — piloc.fr"
```

---

## Conseils pour les meilleurs résultats

**Donne des données réelles.** Un vrai montant (`47 230 €`) est toujours plus percutant qu'un placeholder. L'agent les intègre verbatim.

**Décris des émotions et des actions, pas des effets.** Écris "elle voit la dette fondre en temps réel", pas "je veux un compteur animé". L'agent traduit en animation.

**Précise le moment de valeur.** C'est le pic autour duquel toute la vidéo est construite. Plus tu le décris précisément, plus le timing sera juste.

**Valide le storyboard avec soin.** Lis chaque scène et vérifie que l'histoire tient. C'est gratuit à modifier à cette étape — pas après le render.

**Ne décris pas de transitions.** L'agent gère ça. Concentre-toi sur l'histoire.
