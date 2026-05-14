# Draft report: retry-delay-plan-kit

## Verdict

GO local confirmé, mais pas à promouvoir tant que la file npm reste chargée. Le brouillon a passé deux lectures utilisateur avancé et une passe robustesse; l'angle "plan inspectable plutôt qu'exécuteur de retry" est assez clair pour une promotion ultérieure.

## Candidat abandonné

- Package signal: `@ide/backoff`.
- Version: `1.0.0`.
- Dernière publication de version: 2019-08-24.
- Dernière modification registre: 2022-04-05.
- Description npm: computes truncated exponential backoff intervals with jitter.
- Taille: 6 fichiers, environ 5.8 kB unpacked.
- Licence: MIT.

## Score anti-emballement

- Usage actuel vérifié: 2/2. La page npm indexée affiche environ 472k à 586k téléchargements hebdomadaires selon les captures, et `npm search` affichait aussi plus de 2M téléchargements sur un horizon plus large.
- Abandon ou maintenance faible: 2/2. Une seule version publiée en 2019, dist-tag inchangé.
- Scope livrable en 1 journée: 2/2. Générer un plan de délais de retry est un coeur fonctionnel très petit.
- Douleur utilisateur visible: 2/2. Les retries sont difficiles à tester et auditer quand le calcul est caché dans une boucle ou un timer.
- Différenciation non triviale: 2/2. Le draft produit un plan inspectable avec diagnostics et jitter déterministe.

Score total: 10/10.

## Différenciation en 1 journée

`retry-delay-plan-kit` produit des plans de délais inspectables et déterministes avec seed de jitter, issues de validation et parsing `Retry-After`, pour tester ou afficher une stratégie avant toute exécution de retry.

Ce n'est pas seulement "TypeScript + API moderne": la différence visible est la sortie structurée, reproductible et auditables en moins de 30 secondes.

## Concurrents vérifiés

- `backo2`: très ancien, simple calcul de backoff, dernière version 2014.
- `retry`: très utilisé, dernière publication de version 2022, orienté opération de retry Node-style.
- `exponential-backoff`: maintenu récemment, orienté exécution d'une fonction avec retry.
- `fetch-retry`: maintenu, spécialisé dans le wrapping de `fetch`.

Raison du GO malgré les concurrents: le draft ne cherche pas à remplacer un exécuteur de retry. Il isole le calcul d'un plan déterministe, validable et affichable. Le scope est plus petit que les leaders maintenus.

## Nom retenu

`retry-delay-plan-kit`.

Justification: nom descriptif, lisible dans une liste npm/GitHub, cohérent avec le suffixe `*-kit`, et explicite sur le problème résolu: planifier des délais de retry. Il évite toute confusion directe avec `@ide/backoff`, `backo2`, `retry` ou `exponential-backoff`.

Vérification nom: `npm view retry-delay-plan-kit name` retourne 404 au moment du run.

## Compatibilité navigateur

Le coeur utilise uniquement JavaScript standard: nombres, chaînes, tableaux et `Date.parse`. Aucune dépendance runtime, aucun `fs`, `path`, `node:*`, `Buffer`, `process`, module natif ou accès réseau implicite.

## CLI

Pas de CLI dans ce brouillon. Le besoin naturel est une API pure embarquée dans une application, un test, une UI ou un outil de monitoring. Une CLI ajouterait peu de valeur et introduirait une surface Node séparée inutile.

## API proposée

- `createRetryDelayPlan(options)`: retourne `{ steps, totalDelayMs, issues }`.
- `retryDelaySteps(options)`: raccourci pour obtenir seulement les étapes.
- `parseRetryAfterDelay(value, now?)`: parse un header HTTP `Retry-After`.

Types exportés:

- `RetryDelayOptions`
- `RetryDelayJitter`
- `RetryDelayStep`
- `RetryDelayIssue`
- `RetryDelayIssueCode`
- `RetryDelayPlan`

## Risques et limites

- Les téléchargements élevés peuvent venir de dépendances transitives historiques plutôt que d'une demande humaine active.
- Les stratégies avancées comme decorrelated jitter ou budgets par deadline ne sont pas incluses.
- Le package ne fournit pas d'exécuteur de retry: c'est volontaire, mais le README doit rester clair.
- Le champ `engines.node >=20` concerne le packaging et les tests; le coeur reste browser-friendly.
- Le brouillon protège maintenant les entrées `attempts` non fiables avec `maxAttempts`; conserver ce garde-fou si la lib est promue.

## Passes utilisateur avancé

### Passe 1: configuration issue d'une UI ou d'un fichier YAML

Scénario: un outil interne affiche à l'avance le planning de retry d'un import ou d'un appel API. Le plan structuré est utile car il expose chaque délai, le total et les diagnostics sans lancer de timer. Point corrigé pendant la passe: ajout de `maxAttempts` pour éviter qu'une config utilisateur énorme ne génère un tableau dangereux.

### Passe 2: tests d'un client HTTP avec `Retry-After`

Scénario: un client veut fusionner une stratégie locale et un header HTTP `Retry-After`. `parseRetryAfterDelay` couvre les deux formats standard utiles, delta-seconds et HTTP-date, et renvoie `undefined` pour les valeurs invalides. La séparation entre parsing de header et génération de plan reste simple à comprendre.

## Passe robustesse

- `attempts` invalide ou non fini: diagnostic `invalid_attempts`, fallback conservateur.
- `attempts` trop grand: cap via `maxAttempts` et diagnostic `attempts_exceeded_max`.
- `maxAttempts` invalide: diagnostic `invalid_max_attempts`, fallback à `1_000`.
- `baseDelayMs`, `factor`, `maxDelayMs` invalides: diagnostics stables et fallback.
- Jitter déterministe par seed, donc testable et reproductible.

## Ce qui manque avant publication

- Relecture humaine finale du positionnement face à `retry`, `exponential-backoff` et `backo2`.
- Décision sur l'ajout éventuel de `decorrelated` jitter.
- Vérification npm fraîche des téléchargements et de la disponibilité du nom.
- Ajout des fichiers qualité complets si promotion: `CONTRIBUTING.md`, `SECURITY.md`, workflow CI, badges README et démo portfolio.

## État du Git local du brouillon

Le brouillon a maintenant son Git local dans `/Users/guillaumepapinutti/Developer/ExperienceAlpha/draft-libs/retry-delay-plan-kit/`.

## Validations

- `npm install`: OK, avec 4 vulnérabilités modérées de dépendances de dev signalées par `npm audit`.
- `npm run typecheck`: OK.
- `npm test`: OK, 8 tests passés.
- `npm run build`: OK.
- `env npm_config_cache=/private/tmp/retry-delay-plan-kit-npm-cache npm pack --dry-run`: OK, tarball prévu `retry-delay-plan-kit-0.1.0.tgz`, 8 fichiers, environ 9.9 kB packed.

## Verdict humain recommandé

Garder comme candidat de promotion. Publier seulement quand la file npm est moins chargée, après ajout du gabarit complet des vraies libs et CI verte.
