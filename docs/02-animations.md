# Animations disponibles

Toutes les vidéos utilisent le style **Dark Navy** : fond `#0E1029`, cartes blanches flottantes, typographie blanche avec accent bleu mist `#9DB8EE`.

Les animations ci-dessous sont les briques que l'agent peut combiner librement. Tu peux en demander certaines explicitement dans ton prompt, ou laisser l'agent choisir selon le scénario.

---

## Texte

### Kinetic Title
Le titre entre en glissant depuis le bas (`translateY 18→0`) avec un fondu simultané. Quand il y a deux lignes, la seconde arrive avec un décalage de 10 frames — effet de cascade élégant. La ligne d'accent est colorée en bleu mist.

**Utilisation :** Ouverture Hero, scène CTA finale, introduction d'une section.
**Comment le demander :** "Titre d'ouverture impactant" ou "Hero avec titre en deux lignes".

---

### Count-Up (KPI)
Un nombre part de zéro et s'incrémente jusqu'à sa valeur réelle. L'animation suit une courbe spring — elle accélère puis se stabilise naturellement, comme un compteur mécanique. Tous les KPIs d'un même dashboard apparaissent en même temps (pas en stagger) pour simuler un chargement d'état cohérent.

**Utilisation :** Dashboard d'ouverture, résultats chiffrés, métriques de performance.
**Comment le demander :** "Les KPIs qui comptent jusqu'à leur valeur" ou donne simplement les chiffres réels dans ton prompt.

---

### Color Lerp sur nombre
La couleur d'un chiffre transite progressivement pendant qu'il change de valeur — typiquement rouge → vert pour montrer une résolution. La transition est interpolée frame par frame, pas un simple clignotement.

**Utilisation :** Solde qui passe de négatif à positif, score de risque qui s'améliore, montant recouvré.
**Comment le demander :** "Le montant passe du rouge au vert quand il est payé".

---

### Typewriter
Le texte se tape caractère par caractère à une vitesse paramétrable. L'effet simule une saisie humaine sans être trop lent. Utilisé pour les champs de formulaire, les messages, les emails — jamais pour les titres.

**Utilisation :** Composition d'un message SMS ou email, remplissage d'un champ de recherche, personnalisation d'un template.
**Comment le demander :** "Le message se tape dans le champ" ou "L'agent écrit le nom du client".

---

### Variable Pill
Dans un template de message, les variables `{prénom}`, `{montant}`, `{date}` s'insèrent sous forme de tags colorés qui pop avec un spring. L'effet montre visuellement la personnalisation automatique.

**Utilisation :** Éditeur de templates SMS/email, scène de personnalisation.
**Comment le demander :** "Montre la personnalisation du message avec les variables".

---

### Scene Headline
Titre de scène qui slide depuis le bas au début d'une section et disparaît en fondu à la sortie. Typiquement en majuscules, fondu blanc sur fond navy.

**Utilisation :** Transition entre deux features, introduction d'une étape du workflow.
**Comment le demander :** "Un titre qui annonce chaque section".

---

## Cartes & layout

### Card Spring-In
Une carte apparaît avec un léger rebond spring (`scale 0.95 → 1.02 → 1`) accompagné d'un fondu. L'effet donne l'impression que la carte surgit de la page plutôt que d'apparaître platement.

**Utilisation :** Panneau de détail, modal réimaginée, résultat d'une action.
**Comment le demander :** "Une carte qui apparaît après le clic".

---

### Stagger Reveal
Les éléments d'une liste apparaissent un par un avec un décalage de 8 à 12 frames entre chaque. Le résultat est une cascade fluide de haut en bas. Le stagger s'applique aussi bien à des lignes de tableau qu'à des pills ou des cartes.

**Utilisation :** Tableau de créances, liste de clients, pills de fonctionnalités.
**Comment le demander :** "Les lignes du tableau apparaissent l'une après l'autre".

---

### Row Highlight
Une ligne de tableau s'illumine — sa couleur de fond transite vers une teinte dorée ou bleue pour attirer l'attention dessus. L'animation se fait en deux temps : montée de la couleur puis maintien.

**Utilisation :** Mise en avant d'une créance critique, sélection d'un client, focus sur un résultat.
**Comment le demander :** "La ligne du client en retard se met en avant" ou "L'agent clique sur une ligne et elle s'illumine".

---

### Badge Flip
Un badge de statut change d'état avec un spring-pop : il disparaît légèrement (`scale 0.85`) puis revient en avant (`scale 1.05`) avant de se stabiliser. La couleur de fond change simultanément (ex. orange → vert).

**Utilisation :** Passage "En attente" → "Payé", "Actif" → "Clôturé", "Risque" → "Résolu".
**Comment le demander :** "Le statut bascule de En attente à Payé".

---

### Progress Bar
Une barre de progression se remplit sur une durée paramétrable. Elle peut représenter un taux de complétion, un scoring de risque, ou un objectif de recouvrement. La progression suit une courbe d'accélération naturelle.

**Utilisation :** Score de solvabilité, avancement d'une campagne, taux de recouvrement.
**Comment le demander :** "Une barre qui montre le taux de recouvrement atteint".

---

### Selection Cards 2×2
Au lieu d'un dropdown, les choix sont présentés sous forme de cartes disposées en grille. Elles s'affichent en stagger, puis l'une d'elles se sélectionne avec un spring-pop et un changement de couleur de bordure.

**Utilisation :** Sélection d'un canal (SMS, email, courrier), choix d'un template, sélection d'un segment.
**Comment le demander :** "Montre le choix du canal de communication".

---

### Card Pop (state transition)
Transition entre deux états d'une même carte via un cross-fade d'opacité. La version "avant" disparaît pendant que la version "après" apparaît. Pas de 3D, pas de flip — juste une substitution propre.

**Utilisation :** Avant/après d'un paiement, état d'un dossier avant et après traitement.
**Comment le demander :** "Montre la carte avant et après le paiement".

---

## Navigation & interaction simulée

### Cursor Click
Un curseur circulaire semi-transparent se déplace vers une cible précise avec une trajectoire spring, clique (animation de contraction + ripple), puis disparaît. Ses coordonnées sont calculées mathématiquement depuis le layout — le curseur atterrit exactement sur l'élément ciblé.

**Utilisation :** Toute interaction utilisateur : clic sur un bouton, sélection d'une ligne, ouverture d'un panel.
**Comment le demander :** "L'agent clique sur le bouton Lancer la campagne".

---

### Multi-Click Cursor
Enchaînement de plusieurs clics sur des cibles successives. Le curseur se déplace de cible en cible avec des pauses intermédiaires pour laisser le temps à l'UI de réagir. Idéal pour montrer un workflow complet.

**Utilisation :** Workflow en 3 étapes, navigation entre plusieurs éléments.
**Comment le demander :** "L'agent sélectionne 3 clients puis clique sur Envoyer".

---

### Emphasis Ring
Un anneau circulaire pulsé apparaît autour d'un élément pour attirer l'attention dessus. L'anneau grossit progressivement (`scale 1 → 1.4`) et diminue en opacité simultanément — comme un sonar.

**Utilisation :** Mise en avant d'un KPI clé, d'un montant important, d'un badge.
**Comment le demander :** "Met en avant le montant total recouvré".

---

### Button Click + Confirmation
Un bouton s'enfonce visuellement (`scale 0.96`) au moment du clic, puis son label change (ex. "Envoyer" → "Envoyé ✓") avec un spring-pop. Le changement de label donne un retour visuel immédiat de l'action.

**Utilisation :** Envoi d'une campagne, validation d'un paiement, confirmation d'une action.
**Comment le demander :** "Le bouton Envoyer se transforme en confirmation".

---

## Transitions de scènes

### Fade In / Out
Fondu enchaîné classique entre deux scènes. Discret, universel, adapté à toutes les transitions.

### Slide
La scène suivante entre par la droite ou le bas pendant que la précédente sort de l'autre côté. Donne un sentiment de progression dans un workflow.

### Camera Zoom (Architecture A)
La caméra zoom progressivement sur une zone précise de l'interface — par exemple, passer d'une vue globale du dashboard à un détail de ligne. La transition est fluide et spring-animée.

**Utilisation :** Mise en avant d'un élément dans un dashboard dense.

### Camera Pan (Architecture A)
Translation de la vue vers une autre zone sans zoom — glissement horizontal ou vertical pour révéler une partie cachée de l'interface.

---

## Données & visualisation

### SVG Line Chart
Une courbe se trace progressivement de gauche à droite via `evolvePath()`. Les données viennent du HTML. La courbe peut représenter une tendance historique ou une projection.

**Utilisation :** Historique des paiements, courbe de recouvrement, évolution d'un encours.
**Comment le demander :** "Une courbe qui montre l'évolution des paiements sur 6 mois".

---

### State Machine / Lifecycle
Représentation visuelle du cycle de vie d'un objet (créance, dossier, client) avec transitions entre états. Chaque état est un nœud visuel, les transitions sont animées avec des flèches et des changements de couleur.

**Utilisation :** Parcours d'une créance de "Émise" à "Clôturée", lifecycle d'un dossier de recouvrement.
**Comment le demander :** "Montre les étapes du cycle de vie d'une créance".

---

## Hero & CTA

### Hero Scene
Scène d'ouverture sur fond navy : le logo Piloc entre en spring, suivi d'un chip de catégorie, puis d'un titre en deux lignes. Durée typique : 3 secondes. La scène CTA finale reprend exactement la même structure — effet bouclé.

### Preview Cycling
Un aperçu de message (SMS ou email) cicle entre plusieurs destinataires — le prénom et le montant changent à chaque cycle, montrant la personnalisation à grande échelle.

**Utilisation :** Scène de personnalisation dans une campagne de relance.
**Comment le demander :** "Montre le message envoyé à plusieurs clients différents".

---

## Audio (voix off)

Disponible sur demande. Une voix ElevenLabs par scène, synchronisée frame par frame avec l'animation via `<Sequence>`. Le texte de chaque scène est calé précisément sur les événements visuels.

**Voix disponible sans abonnement :** Adam (neutre, professionnel).
**Format :** Un fichier MP3 par scène, stocké dans `remotion/public/voiceover/`.

**Comment le demander :** Ajoute "Voix off : Oui" dans ton prompt.

> Note : L'audio est désactivé par défaut sur LinkedIn (85% des vues sont en sourdine). Recommandé pour YouTube uniquement, sauf si tu as une bonne raison de l'activer sur LinkedIn.

---

## Formats de sortie

| Format | Dimensions | Usage |
|---|---|---|
| LinkedIn 16:9 | 1920 × 1080 | Post LinkedIn standard |
| LinkedIn 1:1 | 1080 × 1080 | Mobile LinkedIn — prend plus de place dans le feed |
| YouTube 16:9 | 1920 × 1080 | Vidéo YouTube standard |
| YouTube Shorts | 1080 × 1920 | Format vertical, séquence courte |

LinkedIn produit automatiquement les deux formats (16:9 + 1:1) dans le même render.
