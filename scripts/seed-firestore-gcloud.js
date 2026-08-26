import { execSync } from 'child_process';

const RAW_CATALOG = [
  // Cohiba
  { brand: 'Cohiba', name: 'Black Supremo', price: 53, stock: 100 },
  { brand: 'Cohiba', name: 'Cuban Selection Piramides', price: 699, stock: 100 },
  { brand: 'Cohiba', name: 'Cuban Selection Robustos', price: 639, stock: 100 },
  { brand: 'Cohiba', name: 'Esplendidos', price: 199, stock: 100 },
  { brand: 'Cohiba', name: 'Maduro 5 Secretos', price: 85, stock: 100 },
  { brand: 'Cohiba', name: 'Magicos Maduro 5', price: 239, stock: 100 },
  { brand: 'Cohiba', name: 'Mini Pack of 10', price: 48, stock: 100 },
  { brand: 'Cohiba', name: 'Piramides Extra', price: 249, stock: 100 },
  { brand: 'Cohiba', name: 'Robustos', price: 127, stock: 100 },
  { brand: 'Cohiba', name: 'Short Singles', price: 8, stock: 100 },
  { brand: 'Cohiba', name: 'Siglo I', price: 51, stock: 100 },
  { brand: 'Cohiba', name: 'Siglo II', price: 87, stock: 100 },
  { brand: 'Cohiba', name: 'Siglo III', price: 103, stock: 100 },
  { brand: 'Cohiba', name: 'Siglo IV', price: 124, stock: 100 },
  { brand: 'Cohiba', name: 'Siglo VI', price: 189, stock: 100 },
  { brand: 'Cohiba', name: 'White Club 20 Cigarillo', price: 119, stock: 100 },
  { brand: 'Cohiba', name: 'Club 10 White Cigarillo', price: 53, stock: 0 },
  { brand: 'Cohiba', name: 'Cuban Selection Petit Robustos', price: 649, stock: 0 },
  { brand: 'Cohiba', name: 'Talisman 2017 Limited Edition', price: 465, stock: 0 },

  // Partagas
  { brand: 'Partagas', name: 'Box of 25: Serie D No.4', price: 1499, stock: 100 },
  { brand: 'Partagas', name: 'Chicos Pack of 5', price: 51, stock: 100 },
  { brand: 'Partagas', name: 'Club 20', price: 99, stock: 100 },
  { brand: 'Partagas', name: 'Lusitanias', price: 116, stock: 100 },
  { brand: 'Partagas', name: 'Mille Fleurs', price: 38, stock: 100 },
  { brand: 'Partagas', name: 'Serie D No.4', price: 62, stock: 100 },
  { brand: 'Partagas', name: 'Serie D No.6', price: 44, stock: 100 },
  { brand: 'Partagas', name: 'Serie E No. 2', price: 78, stock: 100 },
  { brand: 'Partagas', name: 'Serie P No.2', price: 72, stock: 100 },
  { brand: 'Partagas', name: 'Super Partagas', price: 40, stock: 100 },
  { brand: 'Partagas', name: 'Capitols Tin of 5', price: 189, stock: 0 },
  { brand: 'Partagas', name: 'Habaneros', price: 27, stock: 0 },
  { brand: 'Partagas', name: 'Petit Coronas Especiales', price: 29, stock: 0 },
  { brand: 'Partagas', name: 'Puritos Pack of 5', price: 51, stock: 0 },
  { brand: 'Partagas', name: 'Shorts', price: 28, stock: 0 },

  // Romeo y Julieta
  { brand: 'Romeo y Julieta', name: 'Box of 25: No.1 Tube', price: 1040, stock: 100 },
  { brand: 'Romeo y Julieta', name: 'Box of 25: No.2 Tube', price: 950, stock: 100 },
  { brand: 'Romeo y Julieta', name: 'Churchills', price: 89, stock: 100 },
  { brand: 'Romeo y Julieta', name: 'Linea de Oro Dianas', price: 108, stock: 100 },
  { brand: 'Romeo y Julieta', name: 'Mille Fleurs', price: 37, stock: 100 },
  { brand: 'Romeo y Julieta', name: 'No.1', price: 43, stock: 100 },
  { brand: 'Romeo y Julieta', name: 'No.2', price: 41, stock: 100 },
  { brand: 'Romeo y Julieta', name: 'No.3', price: 39, stock: 100 },
  { brand: 'Romeo y Julieta', name: 'Petit Churchills', price: 50, stock: 100 },
  { brand: 'Romeo y Julieta', name: 'Petit Royales A/T', price: 38, stock: 100 },
  { brand: 'Romeo y Julieta', name: 'Puritos Pack of 5', price: 49, stock: 100 },
  { brand: 'Romeo y Julieta', name: 'Short Churchills', price: 66, stock: 100 },
  { brand: 'Romeo y Julieta', name: 'Wide Churchills', price: 73, stock: 100 },

  // Hoyo De Monterrey
  { brand: 'Hoyo De Monterrey', name: 'Epicure Especial', price: 66, stock: 100 },
  { brand: 'Hoyo De Monterrey', name: 'Epicure No.1', price: 59, stock: 100 },
  { brand: 'Hoyo De Monterrey', name: 'Epicure No.2', price: 65, stock: 100 },
  { brand: 'Hoyo De Monterrey', name: 'Le Hoyo de Rio Seco', price: 72, stock: 100 },
  { brand: 'Hoyo De Monterrey', name: 'Le Hoyo De San Juan', price: 70, stock: 100 },
  { brand: 'Hoyo De Monterrey', name: 'Le Hoyo Du Depute', price: 32, stock: 100 },
  { brand: 'Hoyo De Monterrey', name: 'Le Hoyo Du Maire', price: 25, stock: 100 },
  { brand: 'Hoyo De Monterrey', name: 'Petit Robustos', price: 46, stock: 100 },
  { brand: 'Hoyo De Monterrey', name: 'Epicure De Luxe', price: 57, stock: 0 },

  // H. Upmann
  { brand: 'H. Upmann', name: 'Connoisseur No.1', price: 56, stock: 100 },
  { brand: 'H. Upmann', name: 'Half Corona', price: 33, stock: 100 },
  { brand: 'H. Upmann', name: 'Magnum 50', price: 69, stock: 100 },
  { brand: 'H. Upmann', name: 'H. Upmann No.2', price: 86, stock: 0 },
  { brand: 'H. Upmann', name: 'Coronas Major Tube', price: 34, stock: 0 },
  { brand: 'H. Upmann', name: 'Magnum 54', price: 74, stock: 0 },

  // Punch
  { brand: 'Punch', name: '48 LCDH', price: 63, stock: 100 },
  { brand: 'Punch', name: 'Mini Reserva Tin of 20', price: 97, stock: 100 },
  { brand: 'Punch', name: 'Punch', price: 48, stock: 100 },
  { brand: 'Punch', name: 'Coronations Tube', price: 31, stock: 0 },
  { brand: 'Punch', name: 'Double Corona', price: 129, stock: 0 },

  // Montecristo
  { brand: 'Montecristo', name: 'Montecristo No.2', price: 76, stock: 100 },
  { brand: 'Montecristo', name: 'Box of 25: No.4', price: 950, stock: 100 },
  { brand: 'Montecristo', name: 'Club 20', price: 102, stock: 100 },
  { brand: 'Montecristo', name: 'Double Edmundo', price: 86, stock: 100 },
  { brand: 'Montecristo', name: 'Edmundo', price: 64, stock: 100 },
  { brand: 'Montecristo', name: 'Especial No.2', price: 50, stock: 100 },
  { brand: 'Montecristo', name: 'Junior', price: 33, stock: 100 },
  { brand: 'Montecristo', name: 'Linea 1935 Leyenda', price: 157, stock: 100 },
  { brand: 'Montecristo', name: 'No.3', price: 48, stock: 100 },
  { brand: 'Montecristo', name: 'No.4', price: 45, stock: 100 },
  { brand: 'Montecristo', name: 'No.5', price: 34, stock: 100 },
  { brand: 'Montecristo', name: 'Open Eagle', price: 98, stock: 100 },
  { brand: 'Montecristo', name: 'Open Master Tubos', price: 62, stock: 100 },
  { brand: 'Montecristo', name: 'Petit Edmundo', price: 52, stock: 100 },
  { brand: 'Montecristo', name: 'Petit No.2', price: 58, stock: 100 },
  { brand: 'Montecristo', name: 'Shorts Pack of 10', price: 77, stock: 100 },
  { brand: 'Montecristo', name: 'Shorts Singles', price: 9, stock: 100 },
  { brand: 'Montecristo', name: 'Wide Edmundo', price: 81, stock: 100 },
  { brand: 'Montecristo', name: 'Linea Maestra Pack of 3', price: 899, stock: 0 },
  { brand: 'Montecristo', name: 'No.1', price: 56, stock: 0 },
  { brand: 'Montecristo', name: 'Puritos', price: 11, stock: 0 }
];

const BRAND_IMAGE_MAP = {
  'Cohiba': 'https://firebasestorage.googleapis.com/v0/b/cigarsforyou-ea835.firebasestorage.app/o/brands%2Fcohiba.png?alt=media',
  'Partagas': 'https://firebasestorage.googleapis.com/v0/b/cigarsforyou-ea835.firebasestorage.app/o/brands%2Fpartagas.png?alt=media',
  'Romeo y Julieta': 'https://firebasestorage.googleapis.com/v0/b/cigarsforyou-ea835.firebasestorage.app/o/brands%2Fromeo-y-julieta.png?alt=media',
  'Hoyo De Monterrey': 'https://firebasestorage.googleapis.com/v0/b/cigarsforyou-ea835.firebasestorage.app/o/brands%2Fhoyo-de-monterrey.png?alt=media',
  'H. Upmann': 'https://firebasestorage.googleapis.com/v0/b/cigarsforyou-ea835.firebasestorage.app/o/brands%2Fh-upmann.png?alt=media',
  'Punch': 'https://firebasestorage.googleapis.com/v0/b/cigarsforyou-ea835.firebasestorage.app/o/brands%2Fpunch.png?alt=media',
  'Montecristo': 'https://firebasestorage.googleapis.com/v0/b/cigarsforyou-ea835.firebasestorage.app/o/brands%2Fmontecristo.png?alt=media'
};

function generateSlug(brand, name) {
  return `${brand.toLowerCase()}-${name.toLowerCase()}`
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function run() {
  console.log('Obtaining access token from gcloud CLI...');
  const token = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();

  const projectId = 'cigarsforyou-ea835';
  const firestoreEndpoint = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products`;

  console.log(`Pushing ${RAW_CATALOG.length} products to Firestore via Google Cloud REST API...`);
  let successCount = 0;

  for (const item of RAW_CATALOG) {
    const slug = generateSlug(item.brand, item.name);
    const imageUrl = BRAND_IMAGE_MAP[item.brand] || '';
    const description = `Premium hand-rolled ${item.brand} ${item.name} Cuban cigar. Freshly preserved in humidor humidity pouches.`;

    const docBody = {
      fields: {
        name: { stringValue: item.name },
        brand: { stringValue: item.brand },
        slug: { stringValue: slug },
        price: { integerValue: item.price },
        currency: { stringValue: 'AUD' },
        stock: { integerValue: item.stock },
        imageUrl: { stringValue: imageUrl },
        category: { stringValue: 'cigars' },
        origin: { stringValue: 'Cuban' },
        active: { booleanValue: true },
        description: { stringValue: description }
      }
    };

    const url = `${firestoreEndpoint}/${slug}?updateMask.fieldPaths=name&updateMask.fieldPaths=brand&updateMask.fieldPaths=slug&updateMask.fieldPaths=price&updateMask.fieldPaths=currency&updateMask.fieldPaths=stock&updateMask.fieldPaths=imageUrl&updateMask.fieldPaths=category&updateMask.fieldPaths=origin&updateMask.fieldPaths=active&updateMask.fieldPaths=description`;

    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(docBody)
    });

    if (res.ok) {
      successCount++;
    } else {
      const errText = await res.text();
      console.error(`Failed to push ${slug}:`, errText);
    }
  }

  console.log(`Done! Successfully pushed ${successCount} / ${RAW_CATALOG.length} products to Firestore.`);
}

run().catch(console.error);
