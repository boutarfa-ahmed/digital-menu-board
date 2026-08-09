# Notes de sprint — GalaxyFood Digital Menu Board

## Daily check-in — dimanche 9 août 2026

### Statut
- **Sprint 6C (Layout Builder)** : terminé — T6.3 → T6.10 livrés et testés.
- **Sprint 6D (Polish minimal)** : terminé — T6.11, T6.12, T6.13.

### Avancement du jour (T6.11 – T6.13)

- **T6.11 — Validation UX publish** :
  - Backend : `validatePublishableLayout()` dans `backend/src/services/zone.service.js`, appelée par `POST /api/screens/:id/layout/publish` (400 + messages français).
  - Règles : ≥ 1 zone obligatoire ; zones de contenu (`menu`, `grid`, `list`, `carousel`) non vides ; zones `grid/list/carousel` avec `gridConfig` valide ; `grid` sans produit hors grille ni cellule en double ; pas de dépassement de capacité (`rows × cols`).
  - Frontend : `validateLayoutForPublish()` miroir dans `ScreenLayoutCanvas.jsx` — bannière « Publication bloquée » listant les issues, bouton Publier désactivé avec tooltip, chips inline « Zone vide » / « Grille saturée » sur le canvas.
  - Tests live : publish seed OK ; grille vidée → 400 « La zone « Pizzas » est vide » ; grille 1×2 avec 4 produits → 400 « hors grille » + « dépasse sa capacité ».

- **T6.12 — Confirmation + undo delete zone** :
  - `window.confirm` contextuel avec le nom de la zone (déjà en place, renforcé).
  - **Undo** : snapshot de la zone supprimée → notice verte avec bouton « Annuler » ; restauration via bulk `PUT /screens/:id/layout` (nouvelle zone au même emplacement, items conservés). `load()` purge l'undo obsolète.

- **T6.13 — Check-in + livraison** :
  - Ce fichier créé (modèle quotidien : Statut / Avancement / Serveurs / Règles / Prochaine étape).
  - Branches `feature/layout-builder` (livraison) et `dev` (cible d'intégration) créées depuis `main` ; tout le sprint committé ; PR ouverte `feature/layout-builder → dev`.

### Rappels serveurs & conventions
- Backend : `node src/server.js` (port 5000). Frontend : Vite 5173, proxy `/api` → 5000.
- Admin : `ahmed@galaxy.com` / `123456`. Re-login avant chaque série de tests (tokens expirants).
- Re-seed (`npm run seed`) après chaque test ; tuer le port (`fuser -k 5000/tcp`) avant redémarrage.
- Ids seed incrémentés à chaque seed — toujours naviguer via `GET /api/screens`.
- Lint frontend : 3 warnings préexistants `react(only-export-components)` (AuthContext/ThemeContext/SidebarContext) — ne pas corriger.

### Prochaine étape (candidats)
1. Client TV (digital signage) : écoute WebSocket `layout:published` + refetch + ping.
2. Recette manuelle UI complète du flux : ajout zone → assignation produits → saveDraft → publish.
