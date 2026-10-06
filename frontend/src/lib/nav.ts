export type NavLink = { label: string; href: string };

/** Header department selector. Slugs match the seeded categories (backend/seed_catalog.py). */
export const departments: { label: string; value: string }[] = [
  { label: "All Departments", value: "" },
  { label: "Electronics", value: "electronics" },
  { label: "Audio & Headphones", value: "audio" },
  { label: "Computing", value: "computing" },
  { label: "Laptops", value: "laptops" },
  { label: "Keyboards", value: "keyboards" },
  { label: "Smart Home", value: "smart-home" },
  { label: "Home & Kitchen", value: "home-kitchen" },
  { label: "Accessories", value: "accessories" },
];

export const subNavLinks: NavLink[] = [
  { label: "Today's Deals", href: "/search?deals=today" },
  { label: "Best Sellers", href: "/search?badge=best-seller" },
  { label: "Electronics", href: "/search?category=electronics" },
  { label: "Home & Kitchen", href: "/search?category=home-kitchen" },
  { label: "Computing", href: "/search?category=computing" },
  { label: "Smart Home", href: "/search?category=smart-home" },
  { label: "Apex Basics", href: "/search?brand=apex-basics" },
  { label: "Customer Service", href: "/info/customer-service" },
  { label: "Registry & Gifting", href: "/info/registry" },
];

export const footerColumns: { title: string; links: NavLink[] }[] = [
  {
    title: "Get to Know Us",
    links: [
      { label: "About Apex", href: "/info/about" },
      { label: "Careers", href: "/info/careers" },
      { label: "Corporate Responsibility", href: "/info/responsibility" },
      { label: "Investor Relations", href: "/info/investors" },
      { label: "Apex Science & Labs", href: "/info/labs" },
    ],
  },
  {
    title: "Make Money with Us",
    links: [
      { label: "Sell on Apex", href: "/seller" },
      { label: "Supply to Apex", href: "/info/supply" },
      { label: "Become an Affiliate", href: "/info/affiliates" },
      { label: "Fulfillment by Apex", href: "/info/fulfillment" },
    ],
  },
  {
    title: "Apex Payment Products",
    links: [
      { label: "Apex Rewards Card", href: "/info/rewards-card" },
      { label: "Apex Store Card", href: "/info/store-card" },
      { label: "Shop with Points", href: "/info/points" },
      { label: "Reload Your Balance", href: "/info/balance" },
    ],
  },
  {
    title: "Let Us Help You",
    links: [
      { label: "Your Account", href: "/account" },
      { label: "Your Orders", href: "/orders" },
      { label: "Shipping Rates & Policies", href: "/info/shipping" },
      { label: "Returns & Replacements", href: "/info/returns" },
      { label: "Help Center", href: "/info/customer-service" },
    ],
  },
];

export const legalLinks: NavLink[] = [
  { label: "Conditions of Use", href: "/info/conditions" },
  { label: "Privacy Notice", href: "/info/privacy" },
  { label: "Consumer Health Data Privacy", href: "/info/health-data" },
  { label: "Your Ads Privacy Choices", href: "/info/ads-privacy" },
];

/**
 * Copy for the shared /info/[slug] page. Every footer, help and placeholder link
 * points at one of these, so there are no dead links.
 */
export const infoPages: Record<string, { title: string; body: string }> = {
  about: { title: "About Apex", body: "Apex is a demo marketplace: independent stores and Apex's own lines, in one place." },
  careers: { title: "Careers", body: "We're not hiring in this demo, but thanks for looking." },
  responsibility: { title: "Corporate Responsibility", body: "Apex ships in recyclable packaging and offsets delivery emissions." },
  investors: { title: "Investor Relations", body: "Apex is a portfolio project and has no investors." },
  labs: { title: "Apex Science & Labs", body: "Where we test new ways to shop. Nothing to see yet." },
  supply: { title: "Supply to Apex", body: "Brands can list products by opening a store from the Selling switch in the header." },
  affiliates: { title: "Become an Affiliate", body: "Affiliate links aren't part of this demo." },
  fulfillment: { title: "Fulfillment by Apex", body: "Sellers ship their own orders and mark them as shipped in the seller workspace." },
  "rewards-card": { title: "Apex Rewards Card", body: "There is no Apex card in this demo. Pay with any Stripe test card." },
  "store-card": { title: "Apex Store Card", body: "There is no store card in this demo." },
  points: { title: "Shop with Points", body: "Points aren't supported in this demo." },
  balance: { title: "Reload Your Balance", body: "Gift balances aren't supported in this demo." },
  shipping: {
    title: "Shipping Rates & Policies",
    body: "Standard delivery is free on orders of $35 or more and $5.99 otherwise. One-Day delivery is a flat $9.99.",
  },
  returns: { title: "Returns & Replacements", body: "Most items can be returned within 30 days of delivery." },
  "customer-service": {
    title: "Customer Service",
    body: "Questions about an order? Open Your Orders to see each item's status and estimated delivery.",
  },
  registry: { title: "Registry & Gifting", body: "Gift registries are coming later. For now, add a gift note at checkout." },
  conditions: { title: "Conditions of Use", body: "Apex is a demo store. No real orders are fulfilled and no real payments are taken." },
  privacy: { title: "Privacy Notice", body: "We store your name, email and order history to run the demo. We never sell data." },
  "health-data": { title: "Consumer Health Data Privacy", body: "Apex does not collect consumer health data." },
  "ads-privacy": { title: "Your Ads Privacy Choices", body: "Apex shows no ads and uses no ad tracking." },
  "delivery-location": {
    title: "Delivery location",
    body: "Your delivery address is set at checkout. Saved addresses appear on your account page.",
  },
};
