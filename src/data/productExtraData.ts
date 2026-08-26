import type { Product, ProductSpecification, PackagingOption } from '../types';

export interface AccessoryItem {
  id: string;
  name: string;
  brand: string;
  price: number;
  imageUrl: string;
  category: string;
  subtitle: string;
}

export const BRAND_HISTORIES: Record<string, {
  title: string;
  foundingYear: string;
  origin: string;
  factory: string;
  history: string;
  heritagePoints: string[];
}> = {
  Cohiba: {
    title: 'The Apex of Habanos Mastery',
    foundingYear: '1966',
    origin: 'Havana, Cuba (Pinar del Río Tobacco)',
    factory: 'El Laguito Factory, Havana',
    history: `Cohiba is the flagship brand of Habanos and was created in 1966 for President Fidel Castro himself. Crafted at the mysterious and world-renowned El Laguito factory in Havana, Cohiba cigars initially served exclusively as diplomatic gifts for foreign dignitaries, heads of state, and ambassadors before being released to the international luxury market in 1982.

What sets Cohiba apart from all other Cuban brands is the unique triple-fermentation process. The leaves used for Cohiba represent the "selection of the selection" from the finest vegas (fields) in San Juan y Martínez and San Luis in the Vuelta Abajo zone. Uniquely, the Seco and Ligero filler leaves undergo an additional third fermentation in wooden barrels, imparting Cohiba's legendary silky smoothness, delicate aroma, and unparalleled depth of flavor.`,
    heritagePoints: [
      'Exclusive triple-fermented filler leaves in cedar barrels',
      'Hand-crafted exclusively by master torcedores at El Laguito',
      'Leaves sourced strictly from top-tier Vuelta Abajo Vegas'
    ]
  },
  Montecristo: {
    title: 'The Golden Standard of Cuban Tobacco',
    foundingYear: '1935',
    origin: 'Pinar del Río, Cuba',
    factory: 'H. Upmann Factory, Havana',
    history: `Montecristo is perhaps the most famous and best-loved Cuban cigar brand in the world. Founded in 1935 by Alonso Menéndez, the brand takes its iconic name from Alexandre Dumas' celebrated novel "The Count of Monte Cristo," which was a favorite story read aloud by the lectors to the factory's torcedores (cigar rollers) on the rolling floor.

The brand's distinctive triangular logo with crossed swords and a fleur-de-lis symbolizes tradition, bravery, and perfection. Montecristo cigars are renowned for their perfectly balanced medium-to-full body, featuring signature aromatic notes of dark roasted espresso, rich cocoa, toasted almonds, and sweet Cuban cedar.`,
    heritagePoints: [
      'Named after Dumas\' literary masterpiece read on the rolling floor',
      'The benchmark against which all other torpedo vitolas are judged',
      'Blended from specially selected Vuelta Abajo tobacco leaves'
    ]
  },
  Partagás: {
    title: 'Full-Bodied Richness & Earthy Power',
    foundingYear: '1845',
    origin: 'Havana, Cuba',
    factory: 'Real Fábrica de Tabacos Partagás, Havana',
    history: `Founded in 1845 by Don Jaime Partagás y Ravelo, Partagás is one of the oldest and most legendary cigar brands in Havana. Located originally in the heart of Havana behind the Capitolio building, the grand Partagás factory became a symbol of Cuban cigar heritage.

Partagás cigars are immediately recognizable by their rich, full-bodied strength and intense, earthy flavor profile. Blended from tobacco leaves selected from the Vuelta Abajo region, Partagás delivers robust notes of dark pepper, rich leather, heavy earth, and underlying natural sweetness that appeal to seasoned aficionados seeking uncompromising flavor intensity.`,
    heritagePoints: [
      'Founded in 1845, one of Cuba\'s oldest active cigar houses',
      'Famous for intense, full-bodied earth and pepper character',
      'Historic factory located in central Havana'
    ]
  },
  'Romeo y Julieta': {
    title: 'Timeless Romance & Balanced Elegance',
    foundingYear: '1875',
    origin: 'Havana, Cuba',
    factory: 'La Corona Factory, Havana',
    history: `Established in 1875 by Inocencio Alvarez and Manin García, Romeo y Julieta rose to global prominence under the visionary guidance of Pepín Rodríguez in the early 20th century. Named after William Shakespeare's tragic romantic play, the brand became a favorite of royalty and world leaders.

Sir Winston Churchill was undoubtedly the brand's most illustrious devotee; during his visit to Havana in 1946, his name was immortalized on Romeo y Julieta's classic 7-inch by 47 ring gauge vitola, which remains famous worldwide today as the "Churchill." Romeo y Julieta is celebrated for its smooth, medium-bodied profile brimming with floral, cedar, nutty, and subtle spice notes.`,
    heritagePoints: [
      'Inspired Shakespeare\'s iconic lovers and loved by Winston Churchill',
      'Creator of the legendary 7-inch Churchill vitola shape',
      'Harmonious medium-bodied blend of Vuelta Abajo filler & binder'
    ]
  },
  'Hoyo De Monterrey': {
    title: 'Silky Smoothness & Aromatic Sophistication',
    foundingYear: '1865',
    origin: 'San Juan y Martínez, Vuelta Abajo, Cuba',
    factory: 'La Corona Factory, Havana',
    history: `Hoyo de Monterrey owes its origin to the fertile plantation bought by Don José Gener in 1860 in the heart of San Juan y Martínez, one of the premier tobacco-growing districts in Cuba\'s Vuelta Abajo region. "Hoyo" literally means "hole" or low-lying fertile valley, referencing the moisture-rich, nutrient-dense soil along the riverbanks.

Officially registered in 1865, Hoyo de Monterrey offers an elegant, delicate alternative for connoisseurs who prefer a complex, light-to-medium-bodied cigar. Characterized by silky creaminess, subtle cedar, white pepper, and cinnamon notes, Hoyo de Monterrey cigars are acclaimed for their flawless draw and refined aromatic delicacy.`,
    heritagePoints: [
      'Originates from the legendary fertile riverbed fields of San Juan y Martínez',
      'Light-to-medium strength with unmatched creamy aromatic subtlety',
      'Home to the iconic Epicure No.2, world favorite Robusto'
    ]
  },
  'H. Upmann': {
    title: 'German Precision Meets Cuban Terroir',
    foundingYear: '1844',
    origin: 'Havana, Cuba',
    factory: 'H. Upmann Factory, Havana',
    history: `H. Upmann was established in 1844 by German banker Herman Upmann, who traveled to Havana to set up a bank branch and fell hopelessly in love with Cuban cigars. Upmann created the brand to send exclusive cigars back to directors and valued clients in Europe, packing them in cedar boxes stamped with gold medal awards won at international exhibitions.

H. Upmann cigars are famously associated with President John F. Kennedy, who ordered his press secretary Pierre Salinger to purchase 1,200 H. Upmann Petit Coronas hours before signing the Cuban trade embargo in 1962. H. Upmann cigars are light-to-medium in strength, offering refined herbal, roasted coffee, and subtle leather nuances.`,
    heritagePoints: [
      'Pioneered gold-stamped cedar box packaging in 1844',
      'Famous personal favorite of US President John F. Kennedy',
      'Elegant light-to-medium profile with toasted nut & herbal notes'
    ]
  },
  Trinidad: {
    title: 'Exclusive Diplomatic Craftsmanship',
    foundingYear: '1969',
    origin: 'Pinar del Río, Cuba',
    factory: 'Francisco Donatién Factory, Pinar del Río',
    history: `Named after the UNESCO World Heritage city of La Santísima Trinidad on Cuba\'s southern coast, Trinidad cigars were created in 1969 at El Laguito as exclusive gifts for high-ranking foreign diplomats, second only to Cohiba.

For decades, Trinidad was shrouded in secrecy and mystery until its official public debut in 1998. Recognized by their distinctive pigtail cap (perilla) on many vitolas, Trinidad cigars feature a medium-bodied blend filled with rich creamy oak, subtle nutmeg, freshly ground coffee, and sweet vanilla spice.`,
    heritagePoints: [
      'Created in 1969 as exclusive diplomatic gifts',
      'Distinguished by traditional hand-twisted pigtail caps',
      'Medium-bodied luxury blend with complex vanilla & wood notes'
    ]
  },
  Bolivar: {
    title: 'Robust Strength Dedicated to the Liberator',
    foundingYear: '1902',
    origin: 'Havana, Cuba',
    factory: 'Partagás Factory, Havana',
    history: `Founded in 1902 by José F. Rocha, Bolivar was named in honor of General Simón Bolívar, the heroic liberator who freed South America from Spanish rule. In line with the powerful figure whose portrait adorns every band and box, Bolivar cigars are among the strongest and most full-bodied in Havana.

Crafted with high proportions of potent Ligero tobacco leaves from the Vuelta Abajo region, Bolivar delivers deep, intense flavors of rich earth, dark espresso beans, heavy spice, and aged leather. It is a brand revered by experienced smokers seeking full strength and rich complexity.`,
    heritagePoints: [
      'Named after South American Liberator General Simón Bolívar',
      'Renowned as one of the most potent, full-bodied Cuban brands',
      'High proportion of Vuelta Abajo Ligero leaves for rich intensity'
    ]
  }
};

export function getBrandHistory(brandName: string) {
  const brand = BRAND_HISTORIES[brandName];
  if (brand) return brand;

  // Dynamic fallback for any other brand
  return {
    title: `${brandName} Cigar Heritage`,
    foundingYear: 'Classic Heritage',
    origin: 'Vuelta Abajo, Cuba',
    factory: 'Havana Craft Workshops',
    history: `${brandName} represents a proud tradition of authentic Cuban cigar craftsmanship. Sourced from the world-famous Vuelta Abajo region in Pinar del Río, Cuba, each cigar is hand-rolled (totalmente a mano) by seasoned torcedores using age-old techniques passed down through generations.

The leaves undergo careful harvesting, curing, and aging processes to develop a smooth, balanced flavor profile with rich natural tobacco nuances, cedar aromas, and a rewarding finish.`,
    heritagePoints: [
      '100% hand-rolled Cuban tobacco (Totalmente a Mano)',
      'Leaves aged in cedar-lined curing humidor vaults',
      'Crafted from premier Vuelta Abajo harvest tobacco'
    ]
  };
}

export const FREQUENTLY_BOUGHT_ACCESSORIES: AccessoryItem[] = [
  {
    id: 'cutter-guillotine',
    name: 'Precision Double Guillotine Cigar Cutter',
    brand: 'CigarsForYou Craft',
    price: 35,
    imageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80',
    category: 'Accessory',
    subtitle: 'Self-sharpening dual surgical stainless steel blades up to 60 Ring Gauge.'
  },
  {
    id: 'lighter-triple-jet',
    name: 'Triple Jet Flame Torch Lighter with Punch',
    brand: 'CigarsForYou Craft',
    price: 49,
    imageUrl: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=400&q=80',
    category: 'Accessory',
    subtitle: 'Windproof high-altitude torch with built-in fold-out cigar punch tool.'
  },
  {
    id: 'boveda-humidity-pack',
    name: 'Boveda 69% 2-Way Humidity Control Pack (60g)',
    brand: 'Boveda',
    price: 12,
    imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    category: 'Humidification',
    subtitle: 'Maintains ideal 69% relative humidity in your humidor bag for up to 90 days.'
  }
];

export function getExtendedProductDetails(product: Product) {
  const brandHist = getBrandHistory(product.brand);

  const defaultPackaging: PackagingOption[] = [
    { id: 'single', name: 'Single Stick', priceMultiplier: 1, stock: product.stock },
    { id: 'box10', name: 'Box of 10', priceMultiplier: 9.5, stock: Math.floor(product.stock / 10) || 5 },
    { id: 'box25', name: 'Cabinet of 25', priceMultiplier: 23.5, stock: Math.floor(product.stock / 25) || 2 }
  ];

  const genericSpecs: ProductSpecification = {
    vitola: product.specifications?.vitola || 'Robusto / Corona',
    factoryName: product.specifications?.factoryName || 'Hermosos No.4',
    ringGauge: product.specifications?.ringGauge || 50,
    length: product.specifications?.length || '124 mm (4.8 inches)',
    strength: product.specifications?.strength || 'Medium to Full',
    wrapper: product.specifications?.wrapper || 'Vuelta Abajo Sun-Grown Cuban Leaf',
    filler: product.specifications?.filler || 'Vuelta Abajo Aged Filler Tobacco',
    binder: product.specifications?.binder || 'Cuban Natural Leaf',
    smokingTime: product.specifications?.smokingTime || '45 - 60 minutes'
  };

  const genericNotes = product.tastingNotes || [
    'Aromatic Cuban cedar wood and sweet cream',
    'Roasted espresso bean with background cocoa undertones',
    'Subtle toasted spice and smooth leather finish',
    'Perfect construction delivering a rich, even combustion line'
  ];

  const expandedDesc = product.extendedDescription || product.description || 
    `The ${product.brand} ${product.name} is a quintessential expression of authentic Cuban tobacco craftsmanship. Hand-rolled by master torcedores in Havana using 100% long-filler tobacco grown in the world-renowned Vuelta Abajo zone, this vitola exemplifies the rich heritage and artistry of Cuban cigar making.

From the first light, it opens with refined notes of toasted cedar and rich cocoa, evolving gracefully into a complex, medium-to-full-bodied smoked character with nuances of roasted nuts, subtle leather, and sweet spice. The draw is smooth and voluminous, producing dense, aromatic smoke and a pristine white ash structure.

Whether selected for a celebratory occasion or added to your personal humidor aging collection, the ${product.name} offers an unforgettable luxury smoking ritual for discerning cigar connoisseurs.`;

  const tagline = product.tagline || `${product.origin || 'Cuban'} Hand-Rolled Vitola • ${genericSpecs.strength} Body`;

  return {
    brandHist,
    packagingOptions: product.packagingOptions || defaultPackaging,
    specifications: genericSpecs,
    tastingNotes: genericNotes,
    expandedDesc,
    tagline
  };
}
