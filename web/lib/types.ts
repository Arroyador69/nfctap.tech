export type ProductKind = "generica" | "personalizada";
export type Qty = 1 | 2;
export type BodyColor = "negro" | "blanco" | "rojo";
export type AccentColor = "oro" | "blanco" | "rojo";
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

export type CardDesign = {
  kind?: ProductKind;
  template: TemplateId;
  bodyColor: BodyColor;
  accentColor: AccentColor;
  line1: string;
  line2: string;
  logoDataUrl?: string;
  logoMask?: string;
  googleUrl: string;
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
