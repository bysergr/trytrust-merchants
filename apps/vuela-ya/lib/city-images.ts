export const CITY_IMAGES: Record<string, string> = {
  BOG: 'https://commons.wikimedia.org/wiki/Special:FilePath/Bogot%C3%A1_Skyline.jpg',
  MDE: 'https://commons.wikimedia.org/wiki/Special:FilePath/Panoramica_de_Medellin-Colombia.jpg',
  CLO: 'https://commons.wikimedia.org/wiki/Special:FilePath/Cali_downtown-_skyline.jpg',
  BAQ: 'https://commons.wikimedia.org/wiki/Special:FilePath/Vista_panor%C3%A1mica_de_Barranquilla.jpg',
  CTG: 'https://commons.wikimedia.org/wiki/Special:FilePath/Cartagena_skyline%2C_Colombia.jpg',
  BGA: 'https://commons.wikimedia.org/wiki/Special:FilePath/Panoramica_Bucaramanga.jpg',
  PEI: 'https://commons.wikimedia.org/wiki/Special:FilePath/Skyline_Pereira.jpg',
  ADZ: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Panor%C3%A1mica_de_San_Andr%C3%A9s_Islas.jpg/1280px-Panor%C3%A1mica_de_San_Andr%C3%A9s_Islas.jpg',
  SMR: 'https://commons.wikimedia.org/wiki/Special:FilePath/Bahia_de_Santa_Marta_01.JPG',
  CUC: 'https://commons.wikimedia.org/wiki/Special:FilePath/C%C3%BAcuta_%28Skyline%29.jpg',
  // Name fallbacks
  Bogota: 'https://commons.wikimedia.org/wiki/Special:FilePath/Bogot%C3%A1_Skyline.jpg',
  Medellin: 'https://commons.wikimedia.org/wiki/Special:FilePath/Panoramica_de_Medellin-Colombia.jpg',
  Cali: 'https://commons.wikimedia.org/wiki/Special:FilePath/Cali_downtown-_skyline.jpg',
  Barranquilla: 'https://commons.wikimedia.org/wiki/Special:FilePath/Vista_panor%C3%A1mica_de_Barranquilla.jpg',
  Cartagena: 'https://commons.wikimedia.org/wiki/Special:FilePath/Cartagena_skyline%2C_Colombia.jpg',
  Bucaramanga: 'https://commons.wikimedia.org/wiki/Special:FilePath/Panoramica_Bucaramanga.jpg',
  Pereira: 'https://commons.wikimedia.org/wiki/Special:FilePath/Skyline_Pereira.jpg',
  'San Andres': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Panor%C3%A1mica_de_San_Andr%C3%A9s_Islas.jpg/1280px-Panor%C3%A1mica_de_San_Andr%C3%A9s_Islas.jpg',
  'Santa Marta': 'https://commons.wikimedia.org/wiki/Special:FilePath/Bahia_de_Santa_Marta_01.JPG',
  Cucuta: 'https://commons.wikimedia.org/wiki/Special:FilePath/C%C3%BAcuta_%28Skyline%29.jpg',
};

export function getCityImageUrl(codeOrCity: string): string {
  if (!codeOrCity) return CITY_IMAGES.BOG;
  const upper = codeOrCity.trim().toUpperCase();
  if (CITY_IMAGES[upper]) return CITY_IMAGES[upper];

  // Try matching city name
  const match = Object.keys(CITY_IMAGES).find(
    (key) => key.toLowerCase() === codeOrCity.trim().toLowerCase()
  );
  return match ? CITY_IMAGES[match] : CITY_IMAGES.BOG;
}

export const POPULAR_DESTINATIONS = [
  {
    code: 'CTG',
    city: 'Cartagena',
    region: 'Caribbean Coast',
    tag: 'Top Destination',
    fromPrice: 195000,
    image: CITY_IMAGES.CTG,
    description: 'Colonial walled city, tropical beaches, and Caribbean culture.',
  },
  {
    code: 'MDE',
    city: 'Medellin',
    region: 'Antioquia',
    tag: 'City of Eternal Spring',
    fromPrice: 165000,
    image: CITY_IMAGES.MDE,
    description: 'Modern innovation, vibrant nightlife, and mountain landscapes.',
  },
  {
    code: 'ADZ',
    city: 'San Andres',
    region: 'Insular Region',
    tag: 'Island Paradise',
    fromPrice: 310000,
    image: CITY_IMAGES.ADZ,
    description: 'The Sea of Seven Colors, coral reefs, and duty-free shopping.',
  },
  {
    code: 'SMR',
    city: 'Santa Marta',
    region: 'Magdalena',
    tag: 'Tayrona & Sierra',
    fromPrice: 235000,
    image: CITY_IMAGES.SMR,
    description: 'Golden Caribbean bays, Tayrona National Park, and coastal serenity.',
  },
  {
    code: 'BOG',
    city: 'Bogota',
    region: 'Andean Capital',
    tag: 'Central Hub',
    fromPrice: 150000,
    image: CITY_IMAGES.BOG,
    description: 'Historical La Candelaria, Monserrate, and world-class gastronomy.',
  },
  {
    code: 'CLO',
    city: 'Cali',
    region: 'Valle del Cauca',
    tag: 'World Salsa Capital',
    fromPrice: 175000,
    image: CITY_IMAGES.CLO,
    description: 'Vibrant music culture, warm hospitality, and sugar cane valleys.',
  },
  {
    code: 'BAQ',
    city: 'Barranquilla',
    region: 'Atlantic Coast',
    tag: 'Golden Port',
    fromPrice: 210000,
    image: CITY_IMAGES.BAQ,
    description: 'Magdalena River pier, colorful carnivals, and coastal vitality.',
  },
  {
    code: 'PEI',
    city: 'Pereira',
    region: 'Coffee Triangle',
    tag: 'Coffee Axis',
    fromPrice: 155000,
    image: CITY_IMAGES.PEI,
    description: 'Lush coffee plantations, Cocora Valley palms, and thermal springs.',
  },
  {
    code: 'BGA',
    city: 'Bucaramanga',
    region: 'Santander',
    tag: 'City of Parks',
    fromPrice: 150000,
    image: CITY_IMAGES.BGA,
    description: 'Chicamocha Canyon adventures, lush green parks, and gastronomy.',
  },
  {
    code: 'CUC',
    city: 'Cucuta',
    region: 'Norte de Santander',
    tag: 'Border Gateway',
    fromPrice: 180000,
    image: CITY_IMAGES.CUC,
    description: 'Historical Malecón, tropical breezes, and commercial hub.',
  },
];
