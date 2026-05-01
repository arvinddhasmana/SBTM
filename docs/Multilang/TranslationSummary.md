# Translation Summary & Understanding Guide

## Overview

I've translated **all major Admin Dashboard pages and notification templates** from English to French (Canadian) with a **formal tone** (vouvoiement - using "vous"). This document helps you understand the translations and the patterns used.

## Translation Philosophy

### 1. **Formal Tone (Vouvoiement)**
All translations use the formal "vous" form:
- ❌ "Tu peux" (informal)
- ✅ "Vous pouvez" (formal)

This is appropriate for professional communication with parents, administrators, and all users.

### 2. **Consistent Terminology**
Key terms are translated consistently across all files:

| English | French | Context |
|---------|--------|---------|
| Dashboard | Tableau de bord | Main interface |
| Route | Itinéraire | Bus route |
| Driver | Conducteur | Bus driver |
| Student | Élève | School student |
| Parent | Parent/Tuteur | Guardian |
| Bus | Autobus | Vehicle |
| Alert | Alerte | Notification/warning |
| Emergency | Urgence | Critical situation |
| Boarding | Embarquement | Getting on bus |
| Alighting | Débarquement | Getting off bus |
| Schedule | Horaire | Timetable |
| Compliance | Conformité | Regulatory adherence |
| Inspection | Inspection | Safety check |
| School Board | Conseil scolaire | School district |

### 3. **Short Forms for Space-Constrained UI**
For buttons, mobile UI, and SMS:
- "Config alertes" instead of "Configuration des alertes"
- "Actualiser" instead of "Actualiser les données"
- "Voir détails" instead of "Voir les détails complets"

## Files Translated

### ✅ Admin Dashboard (apps/admin-dashboard/public/locales/)

#### 1. **common.json** - Navigation & UI Elements
**Purpose**: Core UI elements used across all pages

**Key Translations**:
- Navigation menu (15 items): Dashboard, Alertes, Itinéraires, etc.
- Common actions: Enregistrer, Annuler, Supprimer, Modifier
- App branding: "Tableau de bord administrateur OSTA"

**Example**:
```json
English: "Dashboard" → French: "Tableau de bord"
English: "Save" → French: "Enregistrer"
English: "Loading..." → French: "Chargement..."
```

#### 2. **auth.json** - Authentication
**Purpose**: Login page and authentication errors

**Key Translations**:
- Form labels: "Adresse courriel", "Mot de passe"
- Error messages with formal tone
- "Se connecter" (Sign In) - using infinitive form

**Example**:
```json
English: "Invalid credentials" → French: "Identifiants invalides"
English: "Sign in to your account" → French: "Connectez-vous à votre compte"
```

#### 3. **dashboard.json** - Main Dashboard
**Purpose**: Dashboard metrics, cards, and overview

**Key Translations**:
- Metrics: "Itinéraires actifs", "Élèves présents aujourd'hui"
- Status indicators: "Opérationnel", "Critique", "Hors ligne"
- Welcome message: "Bon retour, {{name}}"

**Example**:
```json
English: "Active Routes" → French: "Itinéraires actifs"
English: "Fleet Utilization" → French: "Utilisation de la flotte"
```

#### 4. **alerts.json** - Alert Management
**Purpose**: Emergency and operational alerts

**Key Translations**:
- Alert types: "Urgence", "Panne", "Accident", "Retard"
- Severity levels: "Critique", "Élevée", "Moyenne", "Faible"
- Actions: "Acquitter", "Résoudre", "Escalader"

**Example**:
```json
English: "Emergency" → French: "Urgence"
English: "Acknowledge alert" → French: "Acquitter l'alerte"
English: "Resolved" → French: "Résolue"
```

**Note**: Status terms use feminine form when referring to "alerte" (feminine noun):
- "Résolue" (not "Résolu")
- "Acquittée" (not "Acquitté")

#### 5. **routes.json** - Route Management
**Purpose**: Bus route planning and optimization

**Key Translations**:
- Route types: "Matin (AM)", "Après-midi (PM)"
- Actions: "Assigner véhicule", "Optimiser l'itinéraire"
- Stop details: "Arrêt", "Heure d'arrivée", "Séquence"

**Example**:
```json
English: "Route Optimization" → French: "Optimisation d'itinéraire"
English: "Assign Vehicle" → French: "Assigner véhicule"
English: "Time Saved" → French: "Temps économisé"
```

#### 6. **students.json** - Student Management
**Purpose**: Student enrollment and tracking

**Key Translations**:
- Actions: "Inscrire élève", "Importer élèves"
- Status: "Actif", "Retiré", "Suspendu"
- Presence: "Embarqué", "Débarqué", "Absent"

**Example**:
```json
English: "Enroll Student" → French: "Inscrire élève"
English: "Morning Route" → French: "Itinéraire matin"
English: "Presence History" → French: "Historique présence"
```

#### 7. **compliance.json** - Compliance Management
**Purpose**: Driver and vehicle compliance tracking

**Key Translations**:
- Documents: "Permis de conduire", "Certificat médical"
- Inspection types: "Pré-trajet", "Post-trajet", "Périodique"
- Status: "Valide", "Expire bientôt", "Expiré"

**Example**:
```json
English: "Driver's License" → French: "Permis de conduire"
English: "Expiring Soon" → French: "Expire bientôt"
English: "Pre-Trip Inspection" → French: "Inspection pré-trajet"
```

### ✅ Notification Templates (services/notification-service/locales/)

#### 8. **notifications.json** - Email & SMS Templates
**Purpose**: Parent notifications via email and SMS

**Key Features**:
- Full email templates with formal salutation: "Cher {{parentName}}"
- Concise SMS versions (respecting 160 character limit)
- All placeholders preserved: {{studentName}}, {{busNumber}}, etc.

**Email Templates**:
1. **Boarding** (Embarquement)
   ```
   English: "Your child {{studentName}} has boarded bus {{busNumber}}"
   French: "Votre enfant {{studentName}} est monté dans l'autobus {{busNumber}}"
   ```

2. **Alighting** (Débarquement)
   ```
   English: "has left the bus"
   French: "est descendu de l'autobus"
   ```

3. **Emergency** (Urgence)
   ```
   English: "URGENT: Emergency Alert"
   French: "URGENT : Alerte d'urgence"

   Note: Uses capital letters and "URGENT" to convey severity
   ```

4. **Delay** (Retard)
   ```
   English: "Bus {{busNumber}} Delayed"
   French: "Autobus {{busNumber}} en retard"
   ```

5. **Route Change** (Modification d'itinéraire)
   ```
   English: "Route Change Notice"
   French: "Avis de modification d'itinéraire"
   ```

6. **Absence** (Absence)
   ```
   English: "Absence Confirmation"
   French: "Confirmation d'absence"
   ```

**SMS Templates** (Shortened):
All SMS messages use abbreviated forms while maintaining clarity:
- "Bus" not "Autobus" (saves characters)
- "Arrivée" instead of "Arrivée prévue"
- Time format: "15h45" (French 24-hour format)

## Translation Patterns & Rules

### Placeholder Preservation
✅ **CORRECT**: All {{variables}} are preserved exactly:
```json
"Welcome back, {{name}}" → "Bon retour, {{name}}"
"Bus {{busNumber}}" → "Autobus {{busNumber}}"
```

❌ **INCORRECT**: Never translate placeholder names:
```json
// WRONG: "Autobus {{numéroAutobus}}"
// RIGHT: "Autobus {{busNumber}}"
```

### Gender Agreement
French nouns have gender, affecting adjectives and past participles:

**Feminine nouns** (la/une):
- "une alerte" → "alerte résolue" (not "résolu")
- "une route" → "route optimisée" (not "optimisé")
- "une inspection" → "inspection planifiée" (not "planifié")

**Masculine nouns** (le/un):
- "un élève" → "élève inscrit"
- "un véhicule" → "véhicule assigné"
- "un itinéraire" → "itinéraire modifié"

### Number Formatting
French uses different number separators:
- English: 1,234.56 (comma separator, period decimal)
- French: 1 234,56 (space separator, comma decimal)

**In code**: Use `Intl.NumberFormat` with 'fr-CA' locale (already implemented in formatters)

### Date & Time Formatting
**Dates**:
- English: January 15, 2024
- French: 15 janvier 2024 (day first, lowercase month)

**Times**:
- English: 3:45 PM (12-hour with AM/PM)
- French: 15h45 (24-hour with 'h' separator)

**In code**: Use `formatDate()` and `formatTime()` functions from `libs/i18n/src/formatters.ts`

### Formal vs. Informal Commands
All commands use formal imperative (vous form):
```json
English: "Click here" → French: "Cliquez ici" (not "Clique")
English: "Enter your email" → French: "Saisissez votre courriel" (not "Saisis")
```

## Special Cases & Notes

### 1. **"Email" vs. "Courriel"**
In Canadian French, "courriel" is preferred over "email":
```json
"Email Address" → "Adresse courriel" (not "Adresse e-mail")
```

### 2. **SMS Character Limits**
French SMS messages are approximately 15-20% longer than English. Strategies used:
- Abbreviations where acceptable: "min" for "minutes"
- Omit articles when clear: "Bus retardé" not "Le bus est retardé"
- Use 24-hour time: "15h45" saves characters vs. "3:45 PM"

### 3. **Emergency Language**
Emergency messages use urgent, direct language:
- "URGENT :" at the start (colon with space in French)
- Imperative commands: "Appeler" (Call)
- Clear, short sentences

### 4. **Politeness Markers**
Even in formal tone, French includes politeness markers:
- "Veuillez" (Please) for formal requests
- "Nous nous excusons" (We apologize) for service issues
- "Cher/Chère" (Dear) in communications

### 5. **Technical Terms**
Some technical terms remain similar to English but with French spelling:
- "GPS" → remains "GPS"
- "SMS" → remains "SMS"
- "Email" → becomes "Courriel"
- "Admin" → can remain "Admin" or become "Administrateur"

## Testing the Translations

### How to Test:
1. **Language Switcher**: Click the EN/FR toggle
2. **Check Layout**: French text is ~30% longer - ensure no overflow
3. **Test Placeholders**: Verify {{variables}} are replaced correctly
4. **Number Formatting**: Check dates, times, and numbers display correctly
5. **SMS Length**: Ensure SMS messages fit within 160 characters

### Common Issues to Watch:
- **Button Text Overflow**: French button text may not fit
  - Solution: Use shorter alternatives or adjust button width
- **Table Column Headers**: Longer French headers may cause wrapping
  - Solution: Use abbreviated forms or adjust column width
- **Placeholder Replacement**: Ensure dynamic values insert correctly
  - Solution: Test with actual data, not just translation keys

## Next Steps

### What's Left to Translate:
1. **Driver App** (React Native):
   - Login, route selection, active route, emergency button
   - Estimated: ~100 strings

2. **Parent Dashboard** (Web):
   - Login, tracking, notifications, absence reporting
   - Estimated: ~80 strings

3. **Additional Admin Pages**:
   - Videos, Settings, specific configuration pages
   - Estimated: ~50 strings

### Implementation Status:
- ✅ Translation files created (230+ strings)
- ⏳ Component updates in progress
- ⏳ Testing and layout fixes pending

## Translation Quality Notes

All translations follow:
- **Canadian French conventions** (not European French)
- **Formal tone** throughout (vouvoiement)
- **Education/transportation domain** terminology
- **Consistent key terms** across all modules
- **Preserved placeholders** for dynamic content
- **Appropriate context** for safety-critical messages

**Professional Review Recommended For**:
- Emergency alert messages (safety-critical)
- Legal/compliance text
- Parent-facing email templates

**Acceptable As-Is For**:
- UI labels and navigation
- Dashboard metrics
- Administrative functions
- Form fields

---

**Questions or Issues?**
If any translation seems unclear or inappropriate for your context, please let me know the specific key and I can provide alternatives or explanations.
