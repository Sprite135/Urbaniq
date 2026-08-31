export const DELIVERY_ZONES = {
  LIMA_METROPOLITANA: 'LimaMetropolitana',
  PROVINCIAS: 'Provincias',
} as const;

export type DeliveryZone = (typeof DELIVERY_ZONES)[keyof typeof DELIVERY_ZONES];

export const PERU_DEPARTMENTS = [
  'Lima',
  'Callao',
  'Arequipa',
  'Cusco',
  'La Libertad',
  'Piura',
  'Lambayeque',
  'Junín',
  'Puno',
  'Cajamarca',
  'Ayacucho',
  'Ica',
  'Tacna',
  'Moquegua',
  'Huancavelica',
  'Apurímac',
  'San Martín',
  'Ancash',
  'Huanuco',
  'Ucayali',
  'Loreto',
  'Madre de Dios',
  'Amazonas',
  'Tumbes',
  'Pasco',
];

export const resolveZone = (department?: string | null, province?: string | null): DeliveryZone => {
  if (
    department?.trim().toLowerCase() === 'lima' &&
    (province?.trim().toLowerCase() === 'lima' || province?.trim().toLowerCase() === 'callao')
  ) {
    return DELIVERY_ZONES.LIMA_METROPOLITANA;
  }
  return DELIVERY_ZONES.PROVINCIAS;
};

export const estimateText = (zone: DeliveryZone | undefined | null, requiresConfiguration = false): string => {
  if (zone === DELIVERY_ZONES.LIMA_METROPOLITANA) {
    return requiresConfiguration
      ? 'Entrega en Lima Metropolitana en 24-48 horas (requiere configuración/ensamblaje).'
      : 'Entrega en Lima Metropolitana al día siguiente (24 horas), con flota propia.';
  }
  return 'Envío a provincia vía agencias Shalom/Marvisur/Olva (contra entrega, pagas el envío en destino). Cobertura 92% del territorio nacional.';
};

// Agencias de transporte para envíos a provincia (contra entrega).
export const PROVINCE_AGENCIES = ['Shalom', 'Marvisur', 'Olva'] as const;

export type ProvinceAgency = (typeof PROVINCE_AGENCIES)[number];

// Costo de envío (modelo peruano): Lima gratis con flota propia; provincias contra entrega (0 en la orden).
// Valores por defecto coherentes con ShippingSettings del backend (LimaMetropolitanaFee=0, ProvinceFee=0).
export const SHIPPING_DEFAULTS = {
  limaMetropolitanaFee: 0,
  provinceFee: 0,
  freeShippingThreshold: 0,
};

export const calculateShippingCost = (
  zone: DeliveryZone | undefined | null,
  subtotal: number,
  settings: { limaMetropolitanaFee?: number; provinceFee?: number; freeShippingThreshold?: number } = SHIPPING_DEFAULTS,
): number => {
  const limaFee = settings.limaMetropolitanaFee ?? 0;
  const provinceFee = settings.provinceFee ?? 0;
  const threshold = settings.freeShippingThreshold ?? 0;
  if (threshold > 0 && subtotal >= threshold) return 0;
  return zone === DELIVERY_ZONES.LIMA_METROPOLITANA ? limaFee : provinceFee;
};

export const resolveShippingProvider = (
  zone: DeliveryZone | undefined | null,
  chosenAgency?: string | null,
): string => {
  if (zone === DELIVERY_ZONES.LIMA_METROPOLITANA) return 'Flota Propia';
  const agency = chosenAgency?.trim();
  if (agency && (PROVINCE_AGENCIES as readonly string[]).includes(agency)) return agency;
  return PROVINCE_AGENCIES[0];
};
