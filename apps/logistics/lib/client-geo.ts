// Pure client-side geocoding & coordinate estimation (Zero Node.js/DB dependencies)

export const BOGOTA_PRESET_LOCATIONS: Record<string, { lat: number; lng: number; name: string }> = {
  'el dorado': { lat: 4.7016, lng: -74.1469, name: 'Aeropuerto El Dorado (BOG)' },
  'aeropuerto': { lat: 4.7016, lng: -74.1469, name: 'Aeropuerto El Dorado' },
  'parque 93': { lat: 4.6768, lng: -74.0536, name: 'Parque de la 93 (Chicó)' },
  'chico': { lat: 4.6768, lng: -74.0536, name: 'Chicó Norte' },
  'zona t': { lat: 4.6669, lng: -74.0531, name: 'Zona T / Andino' },
  'zona rosa': { lat: 4.6669, lng: -74.0531, name: 'Zona Rosa' },
  'andino': { lat: 4.6669, lng: -74.0531, name: 'Centro Comercial Andino' },
  'chapinero': { lat: 4.6486, lng: -74.0628, name: 'Chapinero Alto' },
  'colpatria': { lat: 4.6144, lng: -74.0694, name: 'Torre Colpatria / Centro Internacional' },
  'centro internacional': { lat: 4.6144, lng: -74.0694, name: 'Centro Internacional' },
  'candelaria': { lat: 4.5981, lng: -74.0760, name: 'La Candelaria / Plaza de Bolívar' },
  'plaza bolivar': { lat: 4.5981, lng: -74.0760, name: 'Plaza de Bolívar' },
  'unicentro': { lat: 4.7022, lng: -74.0416, name: 'Unicentro Bogotá (Usaquén)' },
  'usaquen': { lat: 4.6975, lng: -74.0322, name: 'Parque de Usaquén' },
  'cedritos': { lat: 4.7231, lng: -74.0385, name: 'Cedritos (Calle 140)' },
  'suba': { lat: 4.7450, lng: -74.0920, name: 'Suba Centro' },
  'corferias': { lat: 4.6318, lng: -74.0924, name: 'Corferias Bogotá' },
  'salitre': { lat: 4.6468, lng: -74.1084, name: 'Ciudad Salitre / Gran Estación' },
  'gran estacion': { lat: 4.6468, lng: -74.1084, name: 'Centro Comercial Gran Estación' },
  'fontibon': { lat: 4.6825, lng: -74.1534, name: 'Zona Franca Fontibón' },
  'zona franca': { lat: 4.6825, lng: -74.1534, name: 'Zona Franca Bogotá' },
  'siberia': { lat: 4.7431, lng: -74.1542, name: 'Parque Industrial Siberia (Cota)' },
  'funza': { lat: 4.7150, lng: -74.2100, name: 'Funza Hub Logístico' },
  'calle 100': { lat: 4.6865, lng: -74.0578, name: 'Calle 100 con Carrera 15' },
  'calle 26': { lat: 4.6542, lng: -74.1022, name: 'Avenida Calle 26 (El Dorado)' },
  'calle 72': { lat: 4.6565, lng: -74.0588, name: 'Calle 72 / Distrito Financiero' },
  'calle 170': { lat: 4.7520, lng: -74.0450, name: 'Calle 170 con Autopista Norte' },
  'monserrate': { lat: 4.6056, lng: -74.0555, name: 'Cerro de Monserrate' },
  'default': { lat: 4.6500, lng: -74.0800, name: 'Bogotá D.C. Centro Metropolitano' },
};

export function parseBogotaStreetGridClient(address: string): { lat: number; lng: number } | null {
  const norm = address.toLowerCase();

  const calleMatch = norm.match(/(?:calle|cll|cl|diagonal|dg)\.?\s*(\d{1,3})/i);
  const craMatch = norm.match(/(?:carrera|cra|cr|kr|transversal|tv|ak|avenida|av)\.?\s*(\d{1,3})/i);

  if (calleMatch || craMatch) {
    const calleNum = calleMatch ? parseInt(calleMatch[1], 10) : 72;
    const craNum = craMatch ? parseInt(craMatch[1], 10) : 15;

    const lat = 4.590 + (Math.min(220, Math.max(1, calleNum)) / 200) * 0.190;
    const lng = -74.040 - (Math.min(130, Math.max(1, craNum)) / 120) * 0.125;

    return {
      lat: Math.round(lat * 10000) / 10000,
      lng: Math.round(lng * 10000) / 10000,
    };
  }

  return null;
}

export function estimateClientCoordinates(
  address: string,
  customLat?: number | null,
  customLng?: number | null
): { lat: number; lng: number } {
  if (typeof customLat === 'number' && typeof customLng === 'number' && !isNaN(customLat) && !isNaN(customLng)) {
    return { lat: customLat, lng: customLng };
  }

  if (!address || !address.trim()) {
    return BOGOTA_PRESET_LOCATIONS.default;
  }

  const lower = address.toLowerCase();

  for (const [key, loc] of Object.entries(BOGOTA_PRESET_LOCATIONS)) {
    if (lower.includes(key)) {
      return { lat: loc.lat, lng: loc.lng };
    }
  }

  const parsedGrid = parseBogotaStreetGridClient(address);
  if (parsedGrid) {
    return parsedGrid;
  }

  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = (hash << 5) - hash + address.charCodeAt(i);
    hash |= 0;
  }
  const latOffset = ((Math.abs(hash) % 140) - 70) / 1000;
  const lngOffset = ((Math.abs(hash >> 3) % 120) - 60) / 1000;

  return {
    lat: Math.round((BOGOTA_PRESET_LOCATIONS.default.lat + latOffset) * 10000) / 10000,
    lng: Math.round((BOGOTA_PRESET_LOCATIONS.default.lng + lngOffset) * 10000) / 10000,
  };
}
