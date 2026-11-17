# Spécification de sécurité Firestore — Ariary 50/30/20

## 1. Invariants de données et d'accès

1. **Isolation stricte par propriétaire (PII & données financières)** : Aucun utilisateur ne peut lire, lister, créer, modifier ou supprimer les documents d'un autre utilisateur sous `/users/{userId}` et ses sous-collections (`transactions`, `goals`, `reminders`, `categories`).
2. **Vérification d'identité et d'e-mail** : Seuls les utilisateurs authentifiés via Firebase Auth avec un e-mail vérifié (`request.auth.token.email_verified == true`) peuvent accéder à leurs données.
3. **Master Gate sur les sous-collections** : Toute opération unitaire (`get`, `create`, `update`, `delete`) sur une sous-collection vérifie l'existence du document parent `/users/{userId}` via `exists(...)`.
4. **Intégrité temporelle serveur** : Les champs `createdAt` et `updatedAt` doivent être égaux à `request.time` lors de la création ; lors d'une mise à jour, `createdAt` et `uid` sont immuables et `updatedAt == request.time`.
5. **Contrôle strict des clés et bornes** : Aucun champ fantôme n'est toléré (`keys().hasOnly(...)` et `affectedKeys().hasOnly(...)`), chaque chaîne possède une limite de taille stricte, et chaque montant financier est borné (`amount > 0`).
6. **Requêtes `list` sécurisées** : Chaque règle `allow list` évalue `request.auth.uid == userId && resource.data.uid == request.auth.uid` sans appel `get()` ou `exists()` coûteux.

## 2. « Dirty Dozen » — 12 charges malveillantes devant recevoir `PERMISSION_DENIED`

1. **Lecture inter-utilisateurs** : Utilisateur B (`uid_B`) tente `get` sur `/users/uid_A`.
2. **Listage inter-utilisateurs** : Utilisateur B tente `list` sur `/users/uid_A/transactions`.
3. **E-mail non vérifié** : Utilisateur A avec `email_verified: false` tente de créer `/users/uid_A`.
4. **Usurpation d'UID à la création** : Utilisateur A tente de créer `/users/uid_A/transactions/tx1` avec `uid: "uid_B"`.
5. **Champ fantôme (Shadow Write)** : Utilisateur A tente d'injecter `isAdmin: true` ou `verified: true` dans `/users/uid_A`.
6. **Falsification d'horodatage** : Utilisateur A tente de créer un objectif avec `createdAt` client antidaté au lieu de `request.time`.
7. **Modification d'un champ immuable** : Utilisateur A tente de modifier `uid` ou `createdAt` lors d'un `update` sur un rappel.
8. **Empoisonnement d'identifiant (ID Poisoning)** : Utilisateur A tente de créer `/users/uid_A/goals/bad$id..hack` ou un ID > 128 caractères.
9. **Montant négatif ou nul** : Utilisateur A tente de créer une transaction avec `amount: -5000` ou `amount: 0`.
10. **Répartition 50/30/20 invalide** : Utilisateur A tente de mettre à jour `/users/uid_A` avec `splitNeeds: 80, splitWants: 30, splitSavings: 20` (total != 100) ou `splitNeeds: -10`.
11. **Dépassement de taille (Denial of Wallet)** : Utilisateur A tente d'écrire un champ `note` de 5 000 caractères sur un rappel de paiement.
12. **Couleur hexadécimale invalide** : Utilisateur A tente de créer une catégorie personnalisée avec `color: "javascript:alert(1)"`.
