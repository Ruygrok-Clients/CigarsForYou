/**
 * One-off Firestore migration:
 * - Creates brandStories documents from the former static brand pack
 * - Fills empty product copy/spec fields
 * - Renames description -> extendedDescription when extended is empty
 * - Links products to a brand story when the category name matches
 * - Removes obsolete tagline, brandHistory, and description fields
 *
 * Does not overwrite fields that already have a value.
 *
 * Usage: node scripts/migrate-brand-stories.js
 */
import { execSync } from 'child_process';

const PROJECT_ID = 'cigarsforyou-ea835';
const ROOT = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const DEFAULT_NOTES = [
  'Aromatic Cuban cedar wood and sweet cream',
  'Roasted espresso bean with background cocoa undertones',
  'Subtle toasted spice and smooth leather finish',
  'Perfect construction delivering a rich, even combustion line'
];

const DEFAULT_SPECS = {
  vitola: 'Robusto / Corona',
  factoryName: 'Hermosos No.4',
  ringGauge: 50,
  length: '124 mm (4.8 inches)',
  strength: 'Medium to Full',
  wrapper: 'Vuelta Abajo Sun-Grown Cuban Leaf',
  filler: 'Vuelta Abajo Aged Filler Tobacco',
  binder: 'Cuban Natural Leaf',
  smokingTime: '45 - 60 minutes'
};

const BRANDS = [
  {
    name: 'Cohiba',
    subtitle: 'The Apex of Habanos Mastery',
    founded: '1966',
    origin: 'Havana, Cuba (Pinar del Río Tobacco)',
    factory: 'El Laguito Factory, Havana',
    description: `Cohiba is the flagship brand of Habanos and was created in 1966 for President Fidel Castro himself. Crafted at the mysterious and world-renowned El Laguito factory in Havana, Cohiba cigars initially served exclusively as diplomatic gifts for foreign dignitaries, heads of state, and ambassadors before being released to the international luxury market in 1982.

What sets Cohiba apart from all other Cuban brands is the unique triple-fermentation process. The leaves used for Cohiba represent the "selection of the selection" from the finest vegas (fields) in San Juan y Martínez and San Luis in the Vuelta Abajo zone. Uniquely, the Seco and Ligero filler leaves undergo an additional third fermentation in wooden barrels, imparting Cohiba's legendary silky smoothness, delicate aroma, and unparalleled depth of flavor.`,
    highlights: [
      'Exclusive triple-fermented filler leaves in cedar barrels',
      'Hand-crafted exclusively by master torcedores at El Laguito',
      'Leaves sourced strictly from top-tier Vuelta Abajo Vegas'
    ]
  },
  {
    name: 'Montecristo',
    subtitle: 'The Golden Standard of Cuban Tobacco',
    founded: '1935',
    origin: 'Pinar del Río, Cuba',
    factory: 'H. Upmann Factory, Havana',
    description: `Montecristo is perhaps the most famous and best-loved Cuban cigar brand in the world. Founded in 1935 by Alonso Menéndez, the brand takes its iconic name from Alexandre Dumas' celebrated novel "The Count of Monte Cristo," which was a favorite story read aloud by the lectors to the factory's torcedores (cigar rollers) on the rolling floor.

The brand's distinctive triangular logo with crossed swords and a fleur-de-lis symbolizes tradition, bravery, and perfection. Montecristo cigars are renowned for their perfectly balanced medium-to-full body, featuring signature aromatic notes of dark roasted espresso, rich cocoa, toasted almonds, and sweet Cuban cedar.`,
    highlights: [
      "Named after Dumas' literary masterpiece read on the rolling floor",
      'The benchmark against which all other torpedo vitolas are judged',
      'Blended from specially selected Vuelta Abajo tobacco leaves'
    ]
  },
  {
    name: 'Partagas',
    subtitle: 'Full-Bodied Richness & Earthy Power',
    founded: '1845',
    origin: 'Havana, Cuba',
    factory: 'Real Fábrica de Tabacos Partagás, Havana',
    description: `Founded in 1845 by Don Jaime Partagás y Ravelo, Partagás is one of the oldest and most legendary cigar brands in Havana. Located originally in the heart of Havana behind the Capitolio building, the grand Partagás factory became a symbol of Cuban cigar heritage.

Partagás cigars are immediately recognizable by their rich, full-bodied strength and intense, earthy flavor profile. Blended from tobacco leaves selected from the Vuelta Abajo region, Partagás delivers robust notes of dark pepper, rich leather, heavy earth, and underlying natural sweetness that appeal to seasoned aficionados seeking uncompromising flavor intensity.`,
    highlights: [
      "Founded in 1845, one of Cuba's oldest active cigar houses",
      'Famous for intense, full-bodied earth and pepper character',
      'Historic factory located in central Havana'
    ]
  },
  {
    name: 'Romeo y Julieta',
    subtitle: 'Timeless Romance & Balanced Elegance',
    founded: '1875',
    origin: 'Havana, Cuba',
    factory: 'La Corona Factory, Havana',
    description: `Established in 1875 by Inocencio Alvarez and Manin García, Romeo y Julieta rose to global prominence under the visionary guidance of Pepín Rodríguez in the early 20th century. Named after William Shakespeare's tragic romantic play, the brand became a favorite of royalty and world leaders.

Sir Winston Churchill was undoubtedly the brand's most illustrious devotee; during his visit to Havana in 1946, his name was immortalized on Romeo y Julieta's classic 7-inch by 47 ring gauge vitola, which remains famous worldwide today as the "Churchill." Romeo y Julieta is celebrated for its smooth, medium-bodied profile brimming with floral, cedar, nutty, and subtle spice notes.`,
    highlights: [
      "Inspired Shakespeare's iconic lovers and loved by Winston Churchill",
      'Creator of the legendary 7-inch Churchill vitola shape',
      'Harmonious medium-bodied blend of Vuelta Abajo filler & binder'
    ]
  },
  {
    name: 'Hoyo De Monterrey',
    subtitle: 'Silky Smoothness & Aromatic Sophistication',
    founded: '1865',
    origin: 'San Juan y Martínez, Vuelta Abajo, Cuba',
    factory: 'La Corona Factory, Havana',
    description: `Hoyo de Monterrey owes its origin to the fertile plantation bought by Don José Gener in 1860 in the heart of San Juan y Martínez, one of the premier tobacco-growing districts in Cuba's Vuelta Abajo region. "Hoyo" literally means "hole" or low-lying fertile valley, referencing the moisture-rich, nutrient-dense soil along the riverbanks.

Officially registered in 1865, Hoyo de Monterrey offers an elegant, delicate alternative for connoisseurs who prefer a complex, light-to-medium-bodied cigar. Characterized by silky creaminess, subtle cedar, white pepper, and cinnamon notes, Hoyo de Monterrey cigars are acclaimed for their flawless draw and refined aromatic delicacy.`,
    highlights: [
      'Originates from the legendary fertile riverbed fields of San Juan y Martínez',
      'Light-to-medium strength with unmatched creamy aromatic subtlety',
      'Home to the iconic Epicure No.2, world favorite Robusto'
    ]
  },
  {
    name: 'H. Upmann',
    subtitle: 'German Precision Meets Cuban Terroir',
    founded: '1844',
    origin: 'Havana, Cuba',
    factory: 'H. Upmann Factory, Havana',
    description: `H. Upmann was established in 1844 by German banker Herman Upmann, who traveled to Havana to set up a bank branch and fell hopelessly in love with Cuban cigars. Upmann created the brand to send exclusive cigars back to directors and valued clients in Europe, packing them in cedar boxes stamped with gold medal awards won at international exhibitions.

H. Upmann cigars are famously associated with President John F. Kennedy, who ordered his press secretary Pierre Salinger to purchase 1,200 H. Upmann Petit Coronas hours before signing the Cuban trade embargo in 1962. H. Upmann cigars are light-to-medium in strength, offering refined herbal, roasted coffee, and subtle leather nuances.`,
    highlights: [
      'Pioneered gold-stamped cedar box packaging in 1844',
      'Famous personal favorite of US President John F. Kennedy',
      'Elegant light-to-medium profile with toasted nut & herbal notes'
    ]
  },
  {
    name: 'Trinidad',
    subtitle: 'Exclusive Diplomatic Craftsmanship',
    founded: '1969',
    origin: 'Pinar del Río, Cuba',
    factory: 'Francisco Donatién Factory, Pinar del Río',
    description: `Named after the UNESCO World Heritage city of La Santísima Trinidad on Cuba's southern coast, Trinidad cigars were created in 1969 at El Laguito as exclusive gifts for high-ranking foreign diplomats, second only to Cohiba.

For decades, Trinidad was shrouded in secrecy and mystery until its official public debut in 1998. Recognized by their distinctive pigtail cap (perilla) on many vitolas, Trinidad cigars feature a medium-bodied blend filled with rich creamy oak, subtle nutmeg, freshly ground coffee, and sweet vanilla spice.`,
    highlights: [
      'Created in 1969 as exclusive diplomatic gifts',
      'Distinguished by traditional hand-twisted pigtail caps',
      'Medium-bodied luxury blend with complex vanilla & wood notes'
    ]
  },
  {
    name: 'Bolivar',
    subtitle: 'Robust Strength Dedicated to the Liberator',
    founded: '1902',
    origin: 'Havana, Cuba',
    factory: 'Partagás Factory, Havana',
    description: `Founded in 1902 by José F. Rocha, Bolivar was named in honor of General Simón Bolívar, the heroic liberator who freed South America from Spanish rule. In line with the powerful figure whose portrait adorns every band and box, Bolivar cigars are among the strongest and most full-bodied in Havana.

Crafted with high proportions of potent Ligero tobacco leaves from the Vuelta Abajo region, Bolivar delivers deep, intense flavors of rich earth, dark espresso beans, heavy spice, and aged leather. It is a brand revered by experienced smokers seeking full strength and rich complexity.`,
    highlights: [
      'Named after South American Liberator General Simón Bolívar',
      'Renowned as one of the most potent, full-bodied Cuban brands',
      'High proportion of Vuelta Abajo Ligero leaves for rich intensity'
    ]
  }
];

function normalizeName(value) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function text(value) {
  return { stringValue: value };
}

function strings(values) {
  return {
    arrayValue: {
      values: values.map((item) => ({ stringValue: item }))
    }
  };
}

function readString(field) {
  return field?.stringValue || '';
}

function readStrings(field) {
  return (field?.arrayValue?.values || []).map((item) => item.stringValue || '').filter(Boolean);
}

function docId(document) {
  return document.name.split('/').pop();
}

async function listCollection(token, collectionId) {
  const docs = [];
  let pageToken = '';
  do {
    const url = pageToken
      ? `${ROOT}/${collectionId}?pageSize=100&pageToken=${encodeURIComponent(pageToken)}`
      : `${ROOT}/${collectionId}?pageSize=100`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`List ${collectionId} failed ${res.status}: ${await res.text()}`);
    const data = await res.json();
    docs.push(...(data.documents || []));
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return docs;
}

async function createStory(token, brand) {
  const res = await fetch(`${ROOT}/brandStories`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fields: {
        name: text(brand.name),
        title: text(`${brand.name}: ${brand.subtitle}`),
        factory: text(brand.factory),
        origin: text(brand.origin),
        founded: text(brand.founded),
        description: text(brand.description),
        highlights: strings(brand.highlights)
      }
    })
  });
  if (!res.ok) throw new Error(`Create brand story ${brand.name} failed ${res.status}: ${await res.text()}`);
  return res.json();
}

function isCigar(fields) {
  const category = readString(fields.category);
  return !category || category === 'cigars';
}

function generatedExtended(fields) {
  const brand = readString(fields.brand) || 'This';
  const name = readString(fields.name) || 'cigar';
  return `The ${brand} ${name} is a quintessential expression of authentic Cuban tobacco craftsmanship. Hand-rolled by master torcedores in Havana using 100% long-filler tobacco grown in the world-renowned Vuelta Abajo zone, this vitola exemplifies the rich heritage and artistry of Cuban cigar making.

From the first light, it opens with refined notes of toasted cedar and rich cocoa, evolving gracefully into a complex, medium-to-full-bodied smoked character with nuances of roasted nuts, subtle leather, and sweet spice. The draw is smooth and voluminous, producing dense, aromatic smoke and a pristine white ash structure.

Whether selected for a celebratory occasion or added to your personal humidor aging collection, the ${name} offers an unforgettable luxury smoking ritual for discerning cigar connoisseurs.`;
}

function specsAreEmpty(field) {
  const map = field?.mapValue?.fields || {};
  return !Object.values(map).some((value) => readString(value) || value?.integerValue || value?.doubleValue);
}

function specsField() {
  return {
    mapValue: {
      fields: {
        vitola: text(DEFAULT_SPECS.vitola),
        factoryName: text(DEFAULT_SPECS.factoryName),
        ringGauge: { integerValue: String(DEFAULT_SPECS.ringGauge) },
        length: text(DEFAULT_SPECS.length),
        strength: text(DEFAULT_SPECS.strength),
        wrapper: text(DEFAULT_SPECS.wrapper),
        filler: text(DEFAULT_SPECS.filler),
        binder: text(DEFAULT_SPECS.binder),
        smokingTime: text(DEFAULT_SPECS.smokingTime)
      }
    }
  };
}

async function patchDocument(token, documentName, fields, mask) {
  const params = mask.map((path) => `updateMask.fieldPaths=${encodeURIComponent(path)}`).join('&');
  const res = await fetch(`https://firestore.googleapis.com/v1/${documentName}?${params}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields })
  });
  if (!res.ok) throw new Error(`Patch failed ${res.status}: ${await res.text()}`);
}

async function run() {
  const token = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
  const existingStories = await listCollection(token, 'brandStories');
  const storiesByName = new Map();
  existingStories.forEach((document) => {
    const name = readString(document.fields?.name);
    if (name) storiesByName.set(normalizeName(name), { id: docId(document), name });
  });

  let createdStories = 0;
  for (const brand of BRANDS) {
    const key = normalizeName(brand.name);
    if (storiesByName.has(key)) continue;
    const created = await createStory(token, brand);
    storiesByName.set(key, { id: docId(created), name: brand.name });
    createdStories += 1;
  }

  const products = await listCollection(token, 'products');
  let updatedProducts = 0;
  for (const product of products) {
    const fields = product.fields || {};
    const next = {};
    const mask = [];
    const cigar = isCigar(fields);
    const strength = readString(fields.specifications?.mapValue?.fields?.strength) || (cigar ? DEFAULT_SPECS.strength : '');
    const origin = readString(fields.origin) || (cigar ? 'Cuban' : '');

    if (!readString(fields.shortDescription).trim()) {
      const short = cigar
        ? `${origin || 'Cuban'} Hand-Rolled Vitola • ${strength || DEFAULT_SPECS.strength} Body`
        : `${readString(fields.brand)} ${readString(fields.name)}`.trim();
      if (short) {
        next.shortDescription = text(short);
        mask.push('shortDescription');
      }
    }

    if (!readString(fields.extendedDescription).trim()) {
      const fromDescription = readString(fields.description).trim();
      const extended = fromDescription || (cigar ? generatedExtended(fields) : `${readString(fields.brand)} ${readString(fields.name)}`.trim());
      if (extended) {
        next.extendedDescription = text(extended);
        mask.push('extendedDescription');
      }
    }

    if (fields.description) mask.push('description');
    if (fields.tagline) mask.push('tagline');
    if (fields.brandHistory) mask.push('brandHistory');

    if (cigar && readStrings(fields.tastingNotes).length === 0) {
      next.tastingNotes = strings(DEFAULT_NOTES);
      mask.push('tastingNotes');
    }

    if (cigar && specsAreEmpty(fields.specifications)) {
      next.specifications = specsField();
      mask.push('specifications');
    }

    if (!readString(fields.brandStoryId).trim()) {
      const match = storiesByName.get(normalizeName(readString(fields.brand)));
      if (match) {
        next.brandStoryId = text(match.id);
        next.brandStoryName = text(match.name);
        mask.push('brandStoryId', 'brandStoryName');
      }
    }

    if (mask.length === 0) continue;
    await patchDocument(token, product.name, next, mask);
    updatedProducts += 1;
  }

  console.log(`Brand stories created: ${createdStories}`);
  console.log(`Products updated: ${updatedProducts}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
