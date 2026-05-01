# SBTM Translation Guide

## Translation Using AI Tools

### Can I Translate All Text Myself?

**Short Answer**: Yes, but with important caveats:

1. **AI-generated translations need human review** - Especially for:
   - Technical terminology
   - Safety-critical messages (emergency alerts)
   - Legal/compliance language
   - User-facing error messages

2. **French Canadian vs European French** - Ensure translations use Canadian French conventions

3. **Context matters** - AI may not understand transportation/education domain specifics

### Recommended Translation Workflow

## Option 1: Google Translate (Free, Basic Quality)

### Step-by-Step Process

1. **Extract English Text**
   ```bash
   # Navigate to translation directory
   cd /home/runner/work/SBTM/SBTM/apps/admin-dashboard/public/locales/en

   # Copy common.json content
   cat common.json
   ```

2. **Use Google Translate API** (Programmatic)
   ```bash
   # Install Google Cloud Translation client
   npm install @google-cloud/translate
   ```

   ```javascript
   // translate-script.js
   const {Translate} = require('@google-cloud/translate').v2;
   const fs = require('fs');

   const translate = new Translate();
   const targetLanguage = 'fr';

   async function translateJSON(inputFile, outputFile) {
     const english = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
     const french = {};

     for (const [key, value] of Object.entries(english)) {
       if (typeof value === 'string') {
         const [translation] = await translate.translate(value, targetLanguage);
         french[key] = translation;
       } else if (typeof value === 'object') {
         // Handle nested objects recursively
         french[key] = await translateObject(value);
       }
     }

     fs.writeFileSync(outputFile, JSON.stringify(french, null, 2));
   }
   ```

3. **Manual Review Required**
   - Check technical terms
   - Verify placeholder preservation ({{variable}})
   - Test in application context

**Pros**: Free, fast, easy to automate
**Cons**: Basic quality, may miss context, requires significant review

## Option 2: DeepL (Paid, Better Quality)

### Step-by-Step Process

1. **Sign Up for DeepL API**
   - Visit https://www.deepl.com/pro-api
   - Free tier: 500,000 characters/month
   - Paid: $5.49 per 1M characters

2. **Install DeepL Client**
   ```bash
   npm install deepl-node
   ```

3. **Translation Script**
   ```javascript
   // deepl-translate.js
   const deepl = require('deepl-node');
   const fs = require('fs');

   const authKey = process.env.DEEPL_API_KEY;
   const translator = new deepl.Translator(authKey);

   async function translateWithDeepL(inputFile, outputFile) {
     const english = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
     const french = {};

     for (const [key, value] of Object.entries(english)) {
       if (typeof value === 'string') {
         const result = await translator.translateText(
           value,
           'en',
           'fr-CA', // Canadian French
           {
             preserveFormatting: true,
             formality: 'more' // Formal tone
           }
         );
         french[key] = result.text;
       }
     }

     fs.writeFileSync(outputFile, JSON.stringify(french, null, 2));
   }
   ```

**Pros**: Higher quality, better context, preserves formatting
**Cons**: Costs money (though affordable), still needs review

## Option 3: ChatGPT/Claude (Best for Context-Aware Translation)

### Recommended Approach

1. **Prepare Context Document**
   Create a file with system context:
   ```markdown
   System: School Bus Transport Management System (SBTM)
   Domain: Educational transportation, student safety, fleet management
   Audience: School administrators, bus drivers, parents
   Tone: Formal (French: vouvoiement)
   Region: Canadian French
   ```

2. **Translation Prompt Template**
   ```
   You are a professional translator specializing in educational transportation systems.

   System Context:
   - SBTM is a school bus management system used in Canada
   - Users include school administrators, bus drivers, and parents
   - Safety and clarity are critical

   Translation Requirements:
   - Translate from English to Canadian French
   - Use formal tone (vouvoiement)
   - Preserve technical terms appropriately
   - Keep placeholders unchanged (e.g., {{studentName}}, {{busNumber}})
   - Maintain JSON structure
   - Use short forms where necessary for UI space constraints

   Technical Terminology:
   - Dashboard = "Tableau de bord"
   - Route = "Itinéraire" (for bus routes)
   - Driver = "Conducteur" (formal) or "Chauffeur"
   - Student = "Élève"
   - Alert = "Alerte"
   - Emergency = "Urgence"

   Please translate the following JSON content:

   ```json
   {
     "login": {
       "title": "Sign In",
       "email": "Email Address",
       "password": "Password",
       "submit": "Sign In",
       "error": "Invalid credentials"
     }
   }
   ```

   Provide the translation as valid JSON, maintaining the same structure.
   ```

3. **Batch Processing**
   - Translate 50-100 keys at a time
   - Provide domain context with each batch
   - Review and refine based on consistency

4. **Example ChatGPT Session**
   ```
   Prompt: "I'm building a school bus tracking system. I need to translate UI labels
   from English to Canadian French (formal tone). The system has dashboards for
   administrators, drivers, and parents. Here are 20 keys to translate. Please
   maintain JSON format and preserve any {{variables}}:"

   [Paste JSON excerpt]

   Follow-up: "Great! Can you ensure 'route' is consistently translated as
   'Itinéraire' throughout, and 'driver' as 'Conducteur'?"
   ```

**Pros**: Context-aware, can explain choices, interactive refinement
**Cons**: Manual process, rate limits, requires multiple sessions

## Option 4: Professional Translation Service

### When to Use Professional Translation

Use professionals for:
- Safety-critical messages (emergency alerts)
- Legal/compliance text
- Parent-facing communications
- Final quality review

### Recommended Services

1. **Gengo** (gengo.com)
   - Cost: ~$0.06-0.10 per word
   - Fast turnaround (24-48 hours)
   - Canadian French specialists available

2. **TextMaster** (textmaster.com)
   - Cost: ~$0.07-0.12 per word
   - Domain expertise available
   - Quality levels: Standard, Expert, Enterprise

3. **Local Translation Agencies**
   - Search for "Canadian French translation services"
   - Prefer agencies with education/transportation experience
   - Request samples before committing

### Preparing for Professional Translation

1. **Create Translation Brief**
   ```markdown
   Project: School Bus Transport Management System
   Source: English
   Target: Canadian French
   Tone: Formal
   Volume: ~10,000 words
   Domain: Educational transportation
   Deadline: 2 weeks

   Special Requirements:
   - Maintain technical terminology consistency
   - Preserve placeholders ({{variable}})
   - JSON format output
   - Glossary provided
   ```

2. **Provide Glossary**
   Export the terminology table from the implementation plan

3. **Context Screenshots**
   Share UI screenshots showing where text appears

## Hybrid Approach (Recommended)

### Best Balance of Cost and Quality

1. **Initial Translation**: Use ChatGPT/Claude
   - Translate all content with context
   - Ensure consistency
   - Fast and inexpensive

2. **Technical Review**: Internal French speaker
   - Review technical terminology
   - Check consistency across modules
   - Test in application

3. **Professional Review**: Hire translator for review only
   - ~2-4 hours ($200-400)
   - Focus on critical areas:
     - Emergency alerts
     - Error messages
     - Parent notifications
   - Provide feedback for corrections

4. **Native Speaker Testing**: Before deployment
   - Real users test in French
   - Collect feedback
   - Iterate on problematic translations

## Translation Workflow Tools

### Create Translation Helper Script

Save this as `scripts/translate.js`:

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

/**
 * Helper script for translation workflow
 * Usage:
 *   node scripts/translate.js extract en/common.json
 *   node scripts/translate.js validate fr/common.json
 *   node scripts/translate.js compare en/common.json fr/common.json
 */

const commands = {
  // Extract all English text as a flat list
  extract(file) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const extracted = [];

    function traverse(obj, prefix = '') {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'string') {
          extracted.push({ key: fullKey, text: value });
        } else if (typeof value === 'object') {
          traverse(value, fullKey);
        }
      }
    }

    traverse(data);
    console.log(JSON.stringify(extracted, null, 2));
  },

  // Validate translation file structure
  validate(file) {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      console.log('✅ Valid JSON structure');

      // Check for untranslated placeholders
      const issues = [];
      function check(obj, path = '') {
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'string') {
            // Check if value looks like English
            if (/^[A-Z][a-z]+\s[A-Z]/.test(value)) {
              issues.push(`${path}.${key}: Possibly untranslated`);
            }
          } else if (typeof value === 'object') {
            check(value, `${path}.${key}`);
          }
        }
      }

      check(data);
      if (issues.length > 0) {
        console.log('⚠️  Potential issues:');
        issues.forEach(issue => console.log('  -', issue));
      } else {
        console.log('✅ No obvious issues found');
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  },

  // Compare two files to find missing keys
  compare(englishFile, frenchFile) {
    const english = JSON.parse(fs.readFileSync(englishFile, 'utf8'));
    const french = JSON.parse(fs.readFileSync(frenchFile, 'utf8'));

    const enKeys = new Set();
    const frKeys = new Set();

    function getKeys(obj, prefix = '') {
      const keys = new Set();
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'string') {
          keys.add(fullKey);
        } else if (typeof value === 'object') {
          getKeys(value, fullKey).forEach(k => keys.add(k));
        }
      }
      return keys;
    }

    const enKeysList = Array.from(getKeys(english));
    const frKeysList = Array.from(getKeys(french));

    const missing = enKeysList.filter(k => !frKeysList.includes(k));
    const extra = frKeysList.filter(k => !enKeysList.includes(k));

    if (missing.length > 0) {
      console.log('❌ Missing in French:', missing);
    }
    if (extra.length > 0) {
      console.log('⚠️  Extra in French:', extra);
    }
    if (missing.length === 0 && extra.length === 0) {
      console.log('✅ Files have matching keys');
    }
  }
};

const [,, command, ...args] = process.argv;
if (commands[command]) {
  commands[command](...args);
} else {
  console.log('Usage: node translate.js <command> [args]');
  console.log('Commands:', Object.keys(commands).join(', '));
}
```

## Quality Assurance Checklist

Before committing translations:

- [ ] All keys present in both languages
- [ ] Placeholders preserved ({{variable}})
- [ ] JSON syntax valid
- [ ] No English text in French files
- [ ] Terminology consistent with glossary
- [ ] Tested in application UI
- [ ] Layout doesn't break (French is ~30% longer)
- [ ] Native speaker reviewed critical sections
- [ ] Formal tone maintained throughout
- [ ] Special characters render correctly (é, è, à, ç, etc.)

## Common Translation Pitfalls

### 1. Placeholder Handling
❌ Wrong: "Bonjour nom d'étudiant"
✅ Correct: "Bonjour {{studentName}}"

### 2. French Text Length
❌ Wrong: Short button with "Télécharger le rapport complet"
✅ Correct: Use "Télécharger" or adjust button width

### 3. Formal vs Informal
❌ Wrong: "Tu peux" (informal)
✅ Correct: "Vous pouvez" (formal)

### 4. Technical Terms
❌ Wrong: Translate "dashboard" as "planche de bord"
✅ Correct: Use established term "Tableau de bord"

### 5. Date/Time Formats
❌ Wrong: Keep "3:45 PM" format in French
✅ Correct: Use "15h45" (24-hour format)

## Cost Estimate

### DIY with AI Tools
- Time: 20-30 hours
- Cost: $0-50 (DeepL subscription)
- Quality: 70-80% (needs review)

### Hybrid Approach (Recommended)
- Time: 30-40 hours
- Cost: $200-500 (review only)
- Quality: 85-95%

### Full Professional Translation
- Time: 1-2 weeks
- Cost: $1000-2500
- Quality: 95-99%

## Recommended: Use ChatGPT/Claude with This Workflow

1. **Day 1-2**: Translate core modules (auth, navigation, dashboard)
2. **Day 3-5**: Translate feature modules (alerts, routes, students)
3. **Day 6-7**: Translate notifications and error messages
4. **Day 8-10**: Review, test, and refine
5. **Day 11-12**: Native speaker review of critical sections
6. **Day 13-14**: Final testing and corrections

### Example ChatGPT Workflow

**Session 1: Authentication Module**
```
I'm translating a school bus management system to Canadian French. Please translate
this authentication module, maintaining JSON structure and preserving {{placeholders}}.
Use formal tone (vouvoiement).

[Paste apps/admin-dashboard/public/locales/en/auth.json]

Requirements:
- "Dashboard" → "Tableau de bord"
- "Driver" → "Conducteur"
- "Sign In" → "Se connecter" (not "Connexion")
```

**Session 2: Notifications**
```
Continuing the school bus system translation. Now translating parent notification
templates. These are SMS and email messages about student safety. Please translate
to Canadian French, formal tone, keeping placeholders intact.

Context: Parents receive these when their child boards/leaves the bus.

[Paste notification templates]
```

Continue this pattern for each module, always providing context.

## Final Recommendation

**Start with ChatGPT/Claude for initial translation**, then:
1. Review yourself or with French-speaking team member
2. Test in application
3. Hire professional translator for 2-4 hour review of critical sections
4. Iterate based on feedback
5. Launch with pilot users for real-world feedback

This approach balances cost, speed, and quality effectively.
