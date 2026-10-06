/** Response shapes of the FastAPI backend (see backend/app/schemas and routers). */

export type Brand = { slug: string; name: string };
export type SellerRef = { name: string; slug: string };

export type Category = {
  id: number;
  slug: string;
  name: string;
  parent_slug: string | null;
  icon: string | null;
};

export type Deal = {
  discount_pct: number;
  ends_at: string;
  total_qty: number;
  claimed_qty: number;
  claimed_pct: number;
};

export type DeliverySpeed = "one_day" | "two_day" | "standard";

export type ProductSummary = {
  id: number;
  slug: string;
  title: string;
  brand: Brand;
  image: string | null;
  price_cents: number;
  list_price_cents: number | null;
  rating_avg: number;
  rating_count: number;
  bought_past_month: number;
  badges: string[];
  delivery_speed: DeliverySpeed;
  stock: number;
  seller: SellerRef;
  deal: Deal | null;
  has_options: boolean;
};

export type Variant = {
  id: number;
  kind: "color" | "edition";
  label: string;
  detail: string | null;
  swatch: string | null;
  price_delta_cents: number;
  image_url: string | null;
  stock: number;
};

export type ProductDetail = ProductSummary & {
  description: string;
  highlights: string[];
  specs: Record<string, string>;
  facets: Record<string, string>;
  images: string[];
  colors: Variant[];
  editions: Variant[];
  category: Category;
  breadcrumbs: Category[];
  rating_breakdown: Record<string, number>;
  seller_detail: SellerRef & { description: string; logo_url: string | null };
  protection_plan: { id: number; title: string; price_cents: number } | null;
};

export type ProductPage = {
  items: ProductSummary[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
};

export type FacetValue = { value: string; label: string; count: number };
export type FacetGroup = { key: string; label: string; values: FacetValue[] };

export type SearchFilters = {
  total: number;
  categories: FacetValue[];
  brands: FacetValue[];
  ratings: FacetValue[];
  prices: FacetValue[];
  one_day_count: number;
  in_stock_count: number;
  facets: FacetGroup[];
};

export type Related = {
  bundle: ProductSummary[];
  bundle_total_cents: number;
  also_bought: ProductSummary[];
};

export type Review = {
  id: number;
  author: string;
  rating: number;
  title: string;
  body: string;
  verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
};

export type ReviewPage = {
  summary: { rating_avg: number; rating_count: number; breakdown_pct: Record<string, number> };
  items: Review[];
  total: number;
  page: number;
  pages: number;
  can_review: boolean;
};

export type HomePayload = {
  hero: ProductSummary | null;
  departments: Category[];
  deals: {
    workspace: ProductSummary[];
    deal_of_the_day: ProductSummary | null;
    keep_shopping: ProductSummary[];
    smart_home: ProductSummary[];
  };
  trending: ProductSummary[];
  flash_deals: ProductSummary[];
  flash_deal_count: number;
  featured_brand: {
    brand: Brand;
    seller: SellerRef;
    tagline: string;
    products: ProductSummary[];
  } | null;
};

export type CartLine = {
  key: string;
  id: number | null;
  product_id: number;
  variant_id: number | null;
  edition_id: number | null;
  slug: string;
  title: string;
  brand: string;
  image: string | null;
  seller_name: string;
  variant_label: string | null;
  unit_price_cents: number;
  list_price_cents: number | null;
  quantity: number;
  line_total_cents: number;
  stock: number;
  in_stock: boolean;
  delivery_speed: DeliverySpeed;
  saved_for_later: boolean;
  selected: boolean;
};

export type CartSummary = {
  item_count: number;
  subtotal_cents: number;
  discount_cents: number;
  tax_cents: number;
  shipping_cents: number;
  total_cents: number;
  free_shipping_threshold_cents: number;
  amount_to_free_shipping_cents: number;
};

export type Cart = {
  items: CartLine[];
  saved: CartLine[];
  summary: CartSummary;
  promo: { code: string; percent_off: number } | null;
  promo_error: string | null;
};

export type Address = {
  full_name: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  zip: string;
  phone: string;
};

export type SavedAddress = Address & { id: number; is_default: boolean };

export type OrderItem = {
  id: number;
  product_slug: string;
  title: string;
  image: string | null;
  variant_label: string | null;
  seller_name: string;
  unit_price_cents: number;
  quantity: number;
  line_total_cents: number;
  fulfillment_status: "unfulfilled" | "shipped";
  shipped_at: string | null;
};

export type OrderStatus = "pending" | "paid" | "shipped" | "delivered" | "cancelled";

export type Order = {
  id: number;
  number: string;
  status: OrderStatus;
  display_status: string;
  created_at: string;
  paid_at: string | null;
  estimated_delivery: string;
  subtotal_cents: number;
  discount_cents: number;
  tax_cents: number;
  shipping_cents: number;
  total_cents: number;
  promo_code: string | null;
  delivery_method: "standard" | "one_day";
  address: Address;
  item_count: number;
  items: OrderItem[];
};

export type OrderPage = { items: Order[]; total: number; page: number; pages: number };

/* ---------------------------------------------------------------- seller */

export type Store = {
  id: number;
  store_name: string;
  slug: string;
  description: string;
  logo_url: string | null;
  created_at: string;
};

export type Fulfillment = "to_ship" | "shipped" | "delivered" | "cancelled";

export type SellerOrderRow = {
  id: number;
  number: string;
  created_at: string;
  buyer: string;
  units: number;
  subtotal_cents: number;
  fulfillment: Fulfillment;
};

export type SellerOverview = {
  store_name: string;
  revenue_cents: number;
  orders: number;
  units: number;
  low_stock: number;
  to_ship: number;
  earnings_cents: number;
  daily: { date: string; revenue_cents: number }[];
  recent_orders: SellerOrderRow[];
};

export type SellerProductRow = {
  id: number;
  slug: string;
  title: string;
  image: string | null;
  price_cents: number;
  stock: number;
  status: "draft" | "published";
  low_stock: boolean;
  updated_at: string;
};

export type SellerProductPage = {
  items: SellerProductRow[];
  total: number;
  page: number;
  pages: number;
  counts: { all: number; published: number; draft: number; low_stock: number };
};

export type VariantInput = {
  kind: "color" | "edition";
  label: string;
  price_delta_cents: number;
  stock: number;
};

export type SellerProduct = {
  id: number;
  slug: string;
  title: string;
  description: string;
  brand: string;
  category_id: number;
  price_cents: number;
  list_price_cents: number | null;
  stock: number;
  images: string[];
  variants: VariantInput[];
  badges: string[];
  status: "draft" | "published";
  updated_at: string;
};

export type SellerOrderDetail = SellerOrderRow & {
  status: OrderStatus;
  paid_at: string | null;
  delivery_method: string;
  address: Address;
  lines: (Omit<OrderItem, "seller_name">)[];
  can_ship: boolean;
};

export type SellerOrderPage = { items: SellerOrderRow[]; total: number; page: number; pages: number };
