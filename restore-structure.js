// Reconstruct the conventional source folders from the flat upload package.
// This runs automatically before npm build and npm start.
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const entries = [
  {
    "file": "src__App.tsx",
    "target": "src/App.tsx"
  },
  {
    "file": "src__index.css",
    "target": "src/index.css"
  },
  {
    "file": "src__main.tsx",
    "target": "src/main.tsx"
  },
  {
    "file": "src__components__admin__AdminPanel.tsx",
    "target": "src/components/admin/AdminPanel.tsx"
  },
  {
    "file": "src__components__common__AdminAuthGuard.tsx",
    "target": "src/components/common/AdminAuthGuard.tsx"
  },
  {
    "file": "src__components__common__AuthModal.tsx",
    "target": "src/components/common/AuthModal.tsx"
  },
  {
    "file": "src__components__common__BottomNav.tsx",
    "target": "src/components/common/BottomNav.tsx"
  },
  {
    "file": "src__components__common__Header.tsx",
    "target": "src/components/common/Header.tsx"
  },
  {
    "file": "src__components__common__PartnerAuthGuard.tsx",
    "target": "src/components/common/PartnerAuthGuard.tsx"
  },
  {
    "file": "src__components__customer__B5CoinWalletPage.tsx",
    "target": "src/components/customer/B5CoinWalletPage.tsx"
  },
  {
    "file": "src__components__customer__CartPage.tsx",
    "target": "src/components/customer/CartPage.tsx"
  },
  {
    "file": "src__components__customer__CheckoutFlow.tsx",
    "target": "src/components/customer/CheckoutFlow.tsx"
  },
  {
    "file": "src__components__customer__CustomerAccount.tsx",
    "target": "src/components/customer/CustomerAccount.tsx"
  },
  {
    "file": "src__components__customer__HomePage.tsx",
    "target": "src/components/customer/HomePage.tsx"
  },
  {
    "file": "src__components__customer__OrderHistoryAndTracking.tsx",
    "target": "src/components/customer/OrderHistoryAndTracking.tsx"
  },
  {
    "file": "src__components__customer__PartnerShopsDirectory.tsx",
    "target": "src/components/customer/PartnerShopsDirectory.tsx"
  },
  {
    "file": "src__components__customer__ProductDetailModal.tsx",
    "target": "src/components/customer/ProductDetailModal.tsx"
  },
  {
    "file": "src__components__partner__PartnerDashboard.tsx",
    "target": "src/components/partner/PartnerDashboard.tsx"
  },
  {
    "file": "src__components__referral__ReferralDashboard.tsx",
    "target": "src/components/referral/ReferralDashboard.tsx"
  },
  {
    "file": "src__components__sales__SalesDashboard.tsx",
    "target": "src/components/sales/SalesDashboard.tsx"
  },
  {
    "file": "src__services__rewardsEngine.ts",
    "target": "src/services/rewardsEngine.ts"
  },
  {
    "file": "src__services__storage.ts",
    "target": "src/services/storage.ts"
  },
  {
    "file": "src__types__index.ts",
    "target": "src/types/index.ts"
  },
  {
    "file": "server__api.js",
    "target": "server/api.js"
  },
  {
    "file": "server__db.js",
    "target": "server/db.js"
  },
  {
    "file": "server__emailService.js",
    "target": "server/emailService.js"
  },
  {
    "file": "server__security.js",
    "target": "server/security.js"
  },
  {
    "file": "server__server.js",
    "target": "server/server.js"
  },
  {
    "file": "server__data__magizh.sqlite",
    "target": "server/data/magizh.sqlite"
  },
  {
    "file": "dist__index.html",
    "target": "dist/index.html"
  },
  {
    "file": "dist__assets__index-BPvh3h-O.js",
    "target": "dist/assets/index-BPvh3h-O.js"
  },
  {
    "file": "dist__assets__index-DJmk7Jq4.css",
    "target": "dist/assets/index-DJmk7Jq4.css"
  }
];
for (const entry of entries) {
  const source = path.join(root, entry.file);
  const target = path.join(root, entry.target);
  if (!fs.existsSync(source)) { console.error(`Missing flat project file: ${entry.file}`); process.exitCode = 1; continue; }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}
if (!process.exitCode) console.log(`Restored ${entries.length} project files into required folders.`);
