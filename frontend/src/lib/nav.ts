export type NavLink = { label: string; href: string };

/** Header department selector. Slugs match the seeded categories (PRD section 9). */
export const departments: { label: string; value: string }[] = [
  { label: "All Departments", value: "" },
  { label: "Audio & Headphones", value: "audio" },
  { label: "Laptops", value: "laptops" },
  { label: "Computing", value: "computing" },
  { label: "Smart Home", value: "smart-home" },
  { label: "Kitchen", value: "kitchen" },
  { label: "Accessories", value: "accessories" },
];

export const subNavLinks: NavLink[] = [
  { label: "Today's Deals", href: "/search?deals=today" },
  { label: "Best Sellers", href: "/search?badge=best-seller" },
  { label: "Electronics", href: "/search?category=electronics" },
  { label: "Home & Kitchen", href: "/search?category=kitchen" },
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
      { label: "Your Account", href: "/info/account" },
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
