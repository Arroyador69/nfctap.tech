export type ProductKind = "generica" | "personalizada" | "unica";
export type CatalogModel = "google" | "whatsapp" | "instagram";
export type FaceModel = CatalogModel | "personalizada";
export type Qty = number;
export type BodyColor = "negro" | "blanco" | "rojo";
export type AccentColor = "oro" | "amarillo" | "blanco" | "rojo" | "negro";
export type TemplateId = "clasica" | "minimal" | "barra";
export type ShippingZone = "peninsula" | "baleares" | "canarias" | "ceuta_melilla";
export type OrderStatus =
  | "pendiente_pago"
  | "pagado"
  | "en_impresion"
  | "enviado"
  | "entregado"
  | "cancelado";

export type OrderSource = "web" | "admin";
export type Handover = "envio" | "mano";

export type OrderPiece = {
  model: FaceModel;
  nfcUrl: string;
};

export type CardDesign = {
  kind?: ProductKind;
  /** Cara que se ve en 3D / se imprime (genéricas). */
  model?: FaceModel;
  template: TemplateId;
  bodyColor: BodyColor;
  accentColor: AccentColor;
  line1: string;
  line2: string;
  logoDataUrl?: string;
  logoMask?: string;
  /** Primer enlace NFC (compat: pedidos viejos). */
  googleUrl: string;
  /** Segundo NFC (pieza única o segunda genérica). */
  extraUrl?: string;
  pieces?: OrderPiece[];
};

export type Address = {
  name: string;
  email: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  postalCode: string;
  province: string;
  zone: ShippingZone;
};

export type Order = {
  id: string;
  createdAt: string;
  kind: ProductKind;
  qty: Qty;
  design: CardDesign;
  address: Address;
  productPrice: number;
  shippingPrice: number;
  total: number;
  status: OrderStatus;
  source?: OrderSource;
  handover?: Handover;
  previewDataUrl?: string;
  polarCheckoutId?: string;
  notes?: string;
  tracking?: string;
};

export type ShippingSettings = {
  peninsula: number;
  baleares: number;
  canarias: number;
  ceuta_melilla: number;
  freePeninsulaFrom: number;
};

export type StoreData = {
  orders: Order[];
  shipping: ShippingSettings;
};
