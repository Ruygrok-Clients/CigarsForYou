import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

let db;
try {
  const serviceAccountPath = join(process.cwd(), 'serviceAccountKey.json');
  if (existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    initializeApp({
      credential: cert(serviceAccount),
      projectId: 'cigarsforyou-ea835'
    });
  } else {
    initializeApp({ projectId: 'cigarsforyou-ea835' });
  }
  db = getFirestore();
} catch (e) {
  console.log('Using default project initialization for cigarsforyou-ea835');
}

const POSTS = [
  {
    slug: 'store-cuban-cigars-australian-climate',
    title: 'How to store Cuban cigars in an Australian climate',
    excerpt: 'Coastal humidity and inland heat pull a humidor in opposite directions. Habanos, S.A. keeps finished cigars at 16°C to 18°C and 65 to 70 percent relative humidity.',
    imageUrl: '/news/australian-humidor.jpeg',
    publishedAt: '2026-09-12',
    readMinutes: 5,
    body: `A Cuban cigar is finished when it leaves the factory, but it is not finished ageing. What happens in the box at home decides whether it smokes clean or tastes flat. Australian weather makes that harder than a temperate cellar: summer heat on the coast, dry inland winters, and air-conditioning that strips moisture out of a room overnight. The cigars in the [Cuban cigar catalogue](/shop) leave the humidor on that basis.

## A stable range, not a perfect number

Aim for 16°C to 18°C and 65 to 70 percent relative humidity, the range [Habanos, S.A. publishes for keeping Habanos](https://www.habanos.com/en/keeping-habanos/). The exact point inside that band matters less than staying there. A swing from a hot car to a cold study dries the wrapper, then re-wets it, and the leaf cracks.

Keep the humidor off a west-facing sill and away from a split-system vent. If the room itself runs hot, a wine fridge set above typical wine temperatures is more reliable than adding more humidification packs.

## What to do when the season turns

In a humid summer, open the lid less often and watch for a soft, spongy feel or a musty smell. Those are signs the box is too wet, not that the cigars need “airing.” In a dry winter, rotate the cigars so the ones against the wall are not the ones that dry first.

A Spanish cedar lining buffers small swings. It does not replace a hygrometer. Check the reading once a week, not once a day, and give the box a fortnight after you fill it before you judge the first cigar.`
  },
  {
    slug: 'cohiba-vs-montecristo-first-box',
    title: 'Cohiba vs Montecristo: choosing your first box',
    excerpt: 'Cohiba is the ceremony. Montecristo is the everyday Cuban most smokers actually finish. The first box should be the one you will open, not the one you will display.',
    imageUrl: '/news/cohiba-montecristo.jpeg',
    publishedAt: '2026-09-18',
    readMinutes: 4,
    body: `Both names sit at the centre of the Cuban catalogue, and both are easy to buy for the wrong reason. [Cohiba](/shop/cohiba) carries the reputation. [Montecristo](/shop/montecristo) carries the volume. A first box is a better teacher if you pick the cigar you will actually smoke through.

## What each house is built for

Cohiba is rolled from the top leaves of the plant and is meant to be rich, creamy, and slow. It rewards a quiet hour and a cigar that has rested. Montecristo is broader: the [No. 4](/product/montecristo-no-4) is the short, reliable smoke; the [No. 2](/product/montecristo-montecristo-no-2) is the figurado people recognise from a distance. Neither is a beginner cigar in strength, but Montecristo is easier to compare across sizes because the blend stays familiar.

## How to choose without collecting both

If you smoke one cigar a week, start with a smaller Montecristo format so the box turns over while the rest of it is still in good condition. If you already know you like a fuller, longer smoke and you are buying for a specific occasion, Cohiba is the one to open for that occasion — not the one to leave sealed on a shelf “for later.”

Buy the size you will finish. An unfinished cigar teaches you less than a modest one smoked to the band.`
  },
  {
    slug: 'what-box-pressed-really-means',
    title: 'What “box-pressed” really means',
    excerpt: 'A box-pressed cigar is square because the box pressed it, not because the roller shaped it that way. The draw and the burn change with that pressure.',
    imageUrl: '/news/box-pressed.jpeg',
    publishedAt: '2026-09-24',
    readMinutes: 3,
    body: `“Box-pressed” sounds like a style, the way a torpedo or a robusto is a style. It is really a storage result. Round cigars packed tightly into a dress box settle into square shoulders. The roller did not intend a square cigar. The cabinet did. You can see both shapes in the [Cuban cigar catalogue](/shop).

## What the press changes

Pressure squeezes a little air out of the bunch. Many smokers find the draw a touch firmer and the burn a touch slower than the same blend in a round format. The flavour does not become a different cigar, but the smoke can feel denser because less air is travelling with it.

## What it does not mean

It is not a mark of extra age by itself, and it is not a defect. A soft corner is normal. A cracked wrapper at the edge is not — that is damage from a box that was packed too dry, or from a cigar that was forced back into a round shape.

Leave a box-pressed cigar in its square shape. Rolling it between your fingers to “round it out” is how wrappers split.`
  },
  {
    slug: 'pairing-cubans-with-coffee-and-whisky',
    title: 'Pairing Cubans with coffee and whisky',
    excerpt: 'A Cuban does not need a drink, but coffee and whisky are the two that usually help rather than cover the leaf. Match strength to strength, and leave the ice out.',
    imageUrl: '/news/pairing.jpeg',
    publishedAt: '2026-09-28',
    readMinutes: 4,
    body: `The point of a pairing is to leave the cigar audible. A sweet cocktail or a heavily peated whisky will talk over a mild Cuban and make a stronger one taste like smoke and nothing else. Coffee and a straightforward whisky are easier to keep in proportion. Start from a size you already know in the [cigar catalogue](/shop).

## Coffee

Espresso and a short, fuller cigar — a robusto or a petit robusto, such as [Cohiba Robustos](/product/cohiba-robustos) — sit well together because both are concentrated. A longer, creamier cigar is happier with a filter coffee or a long black that is not bitter. Drink the coffee while it is hot. A cold cup next to a warm cigar tastes thin and makes the cigar seem harsh by comparison.

Sugar is optional. Milk softens both sides and is fine if that is how you already take coffee. It is not required to “balance” the cigar.

## Whisky

Choose a whisky you would drink without the cigar: a Highland or a Speyside before an Islay. Add a drop of water if you would anyway. Ice numbs the leaf and waters the glass as it melts, so the pairing moves under you halfway through the cigar.

Take the drink between puffs, not during them. You are comparing two finishes, not mixing them in the mouth.`
  },
  {
    slug: 'reading-the-band-genuine-cubans',
    title: 'Reading the band: spotting genuine Cubans',
    excerpt: 'The band is a clue, not a certificate. Paper, print, and how the cigar sits under it tell you more than a logo you have seen on a poster.',
    imageUrl: '/news/cigar-band.jpeg',
    publishedAt: '2026-10-02',
    readMinutes: 4,
    body: `A genuine [Habanos](https://www.habanos.com/en/) band is printed carefully, but it is still a printed paper ring on a handmade cigar. Counterfeits copy the logo first and get the paper, the glue, and the fit wrong. Looking only at the brand name is how fakes pass a glance. Buy a format you can name from the [cigar catalogue](/shop) rather than a loose stick with only a familiar logo.

## What to look at before the logo

The paper should feel like paper, not like a glossy sticker. Print is sharp, including the small type, and the colours sit flat rather than raised like a cheap foil transfer. The band should sit evenly. A band that is twisted, bubbled with glue, or so tight it cuts the wrapper is a warning, whatever the name says.

The cigar underneath matters more. Wrapper colour should be even for that box, veins should look like leaf rather than printed lines, and the cap should be finished, not a blunt cut with a blob of glue.

## What a band cannot prove

A correct-looking band on a single cigar bought loose is weaker evidence than the same band inside a sealed dress box with matching stamps. If the price is far below the rest of the market, the band is not the part that will save the purchase.

When in doubt, buy from a seller who can name the box and the format, and keep the cigar in the humidor long enough to smoke it properly rather than judging it on the ring alone.`
  }
];

function firestoreValue(value) {
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return { integerValue: String(value) };
  return { stringValue: String(value) };
}

async function seedViaRest(patchBodyOnly) {
  console.log(patchBodyOnly ? 'Patching news bodies with gcloud access token...' : 'Admin credentials cannot write. Seeding with gcloud access token...');
  const token = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
  const now = new Date().toISOString();
  const base = 'https://firestore.googleapis.com/v1/projects/cigarsforyou-ea835/databases/(default)/documents/newsPosts';
  let count = 0;

  for (const post of POSTS) {
    const data = patchBodyOnly
      ? { body: post.body, excerpt: post.excerpt, updatedAt: now }
      : { ...post, active: true, createdAt: now, updatedAt: now };
    const fields = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, firestoreValue(value)]));
    const mask = Object.keys(fields).map((key) => `updateMask.fieldPaths=${encodeURIComponent(key)}`).join('&');
    const res = await fetch(`${base}/${post.slug}?${mask}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields })
    });
    if (!res.ok) {
      throw new Error(`Failed to seed ${post.slug}: ${await res.text()}`);
    }
    count += 1;
    console.log(`${patchBodyOnly ? 'Patched' : 'Seeded'} ${post.slug}`);
  }

  console.log(`Successfully ${patchBodyOnly ? 'patched' : 'seeded'} ${count} news posts.`);
}

async function seedNews() {
  const patchBodyOnly = process.argv.includes('--patch-body');
  if (!db) {
    await seedViaRest(patchBodyOnly);
    return;
  }

  const now = new Date().toISOString();
  const postsRef = db.collection('newsPosts');

  try {
    for (const post of POSTS) {
      const payload = patchBodyOnly
        ? { body: post.body, excerpt: post.excerpt, updatedAt: now }
        : { ...post, active: true, createdAt: now, updatedAt: now };
      await postsRef.doc(post.slug).set(payload, { merge: true });
      console.log(`${patchBodyOnly ? 'Patched' : 'Seeded'} ${post.slug}`);
    }
    console.log(`Successfully ${patchBodyOnly ? 'patched' : 'seeded'} ${POSTS.length} news posts.`);
  } catch (err) {
    const denied = err && (err.code === 7 || String(err.message || '').includes('PERMISSION_DENIED'));
    if (!denied) throw err;
    await seedViaRest(patchBodyOnly);
  }
}

seedNews().catch((err) => {
  console.error(err);
  process.exit(1);
});
