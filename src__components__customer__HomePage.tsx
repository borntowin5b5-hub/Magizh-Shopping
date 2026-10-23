import React, { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  Flame,
  Award,
  Clock,
  Star,
  Plus,
  ShoppingCart,
  ChevronRight,
  Filter,
  Check,
  Tag,
  ShieldCheck,
  Zap,
  Store,
} from 'lucide-react';
import { StorageService, subscribe } from '../../services/storage';
import { Product, ProductCategory, WeightVariant, CategoryInfo, PromotionalBanner } from '../../types';

interface HomePageProps {
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product, variant: WeightVariant, quantity: number) => void;
  onBuyNow: (product: Product, variant: WeightVariant, quantity: number) => void;
  onNavigateCategory: (category: ProductCategory) => void;
  onNavigatePartnerShops?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onSelectProduct,
  onAddToCart,
  onBuyNow,
  onNavigateCategory,
  onNavigatePartnerShops,
}) => {
  const [products, setProducts] = useState<Product[]>(StorageService.getProducts());
  const [categories, setCategories] = useState<CategoryInfo[]>(StorageService.getCategories());
  const [banners, setBanners] = useState<PromotionalBanner[]>(StorageService.getBanners());

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'featured' | 'price-low' | 'price-high' | 'rating'>('featured');
  const [activeTab, setActiveTab] = useState<'all' | 'offers' | 'bestsellers' | 'premium'>('all');

  // Selected weight variants mapped by product ID
  const [selectedVariants, setSelectedVariants] = useState<Record<string, WeightVariant>>({});
  const [addedAlert, setAddedAlert] = useState<string | null>(null);

  // Flash Sale Timer countdown (e.g. 5 hours 42 mins)
  const [timeLeft, setTimeLeft] = useState({ hours: 5, minutes: 42, seconds: 18 });

  useEffect(() => {
    const unsubProds = subscribe('productsChanged', (newProducts: Product[]) => {
      setProducts(newProducts);
    });
    const unsubCats = subscribe('categoriesChanged', (newCats: CategoryInfo[]) => {
      setCategories(newCats);
    });
    const unsubBans = subscribe('bannersChanged', (newBans: PromotionalBanner[]) => {
      setBanners(newBans);
    });

    return () => {
      unsubProds();
      unsubCats();
      unsubBans();
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 12, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter and sort products (only active products displayed in public catalog)
  const activeProducts = products.filter((p) => p.status !== 'archived');

  const filteredProducts = activeProducts.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.tamilName && p.tamilName.includes(searchQuery)) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;

    if (activeTab === 'offers') return matchesSearch && matchesCategory && p.isTodayOffer;
    if (activeTab === 'bestsellers') return matchesSearch && matchesCategory && p.isBestSeller;
    if (activeTab === 'premium') return matchesSearch && matchesCategory && p.isPremium;

    return matchesSearch && matchesCategory;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const priceA = (selectedVariants[a.id] || a.variants[0])?.price || 0;
    const priceB = (selectedVariants[b.id] || b.variants[0])?.price || 0;

    if (sortBy === 'price-low') return priceA - priceB;
    if (sortBy === 'price-high') return priceB - priceA;
    if (sortBy === 'rating') return b.rating - a.rating;
    return 0; // default featured
  });

  const handleVariantChange = (productId: string, variant: WeightVariant) => {
    setSelectedVariants((prev) => ({ ...prev, [productId]: variant }));
  };

  const handleAddToCartClick = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    const variant = selectedVariants[product.id] || product.variants[0];
    onAddToCart(product, variant, 1);
    setAddedAlert(`Added ${product.name} (${variant.weight}) to Cart!`);
    setTimeout(() => setAddedAlert(null), 2500);
  };

  const handleBuyNowClick = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    const variant = selectedVariants[product.id] || product.variants[0];
    onBuyNow(product, variant, 1);
  };

  // Active promotional banners from CMS
  const activeBanners = banners.filter((b) => b.active);
  const featuredBanner = activeBanners[0];

  return (
    <div className="pb-24 pt-2 max-w-7xl mx-auto px-3 sm:px-6 space-y-6">
      {/* Toast Alert */}
      {addedAlert && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-magizh-900 text-white px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom-5">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{addedAlert}</span>
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-darkbrown-700/60" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Millets, Idli Podi, Ghee, Thokku..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-cream-300 rounded-2xl text-xs sm:text-sm text-darkbrown-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-magizh-700 shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-gray-700"
            >
              Clear
            </button>
          )}
        </div>

        <select
          value={sortBy}
          onChange={(e: any) => setSortBy(e.target.value)}
          aria-label="Sort products"
          className="bg-white border border-cream-300 text-xs font-semibold text-darkbrown-900 rounded-2xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-magizh-700 shadow-2xs"
        >
          <option value="featured">Featured</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
          <option value="rating">Top Rated</option>
        </select>
      </div>

      {/* Dynamic Festival Hero Promotional Banner (from CMS) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-magizh-900 via-magizh-800 to-darkbrown-950 text-white p-5 sm:p-8 shadow-card border border-magizh-700/40">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-48 h-48 bg-b5-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-40 h-40 bg-magizh-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-lg">
          <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-b5-600 to-b5-500 text-white text-[10px] sm:text-xs font-black uppercase px-3 py-1 rounded-full shadow-md mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{featuredBanner?.tag || 'Festival Harvest Special'}</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight leading-tight">
            {featuredBanner?.title || 'Magizh Pure Millets & Traditional Podi Delights'}
          </h1>
          <p className="text-xs sm:text-sm text-cream-200 mt-1.5 leading-relaxed">
            {featuredBanner?.subtitle ||
              '100% Native Stone-Pounded Podis, Wood Pressed Oils & Farm-Direct Foxtail Noodles. Pay up to 50% using your B5 Coins!'}
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-4">
            <button
              onClick={() => {
                setSelectedCategory('Traditional Millet Products');
                setActiveTab('all');
              }}
              className="bg-white hover:bg-cream-100 text-magizh-900 font-extrabold text-xs sm:text-sm px-4 py-2 rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <span>Explore Millets</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs">
              <Zap className="w-3.5 h-3.5 text-b5-400" />
              <span className="font-semibold text-cream-100">B5 Coins = ₹1 Value</span>
            </div>
          </div>
        </div>
      </div>

      {/* Local Partner Shops Spotlight Card */}
      {onNavigatePartnerShops && (
        <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white rounded-3xl p-4 sm:p-5 shadow-card border border-blue-700/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-blue-200 border border-white/20 shrink-0">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base">Shop In-Store at Local Partner Outlets</h3>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  1 B5 Coin = ₹1
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                Visit approved grocery, organic &amp; millet partner shops in Chennai, Coimbatore &amp; Madurai. Pay up to 50% of your bill using B5 Coins directly at the store counter!
              </p>
            </div>
          </div>

          <button
            onClick={onNavigatePartnerShops}
            className="bg-white hover:bg-cream-100 text-blue-950 font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-center"
          >
            <span>Explore Partner Shops</span>
            <ChevronRight className="w-4 h-4 text-blue-900" />
          </button>
        </div>
      )}

      {/* Dynamic Category Icons Carousel (CMS Synced) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-darkbrown-900">
              Browse Categories
            </h2>
            <p className="text-[11px] text-gray-500">Authentic South Indian natural lifestyle ({categories.length} categories)</p>
          </div>
          {selectedCategory !== 'All' && (
            <button
              onClick={() => setSelectedCategory('All')}
              className="text-xs font-bold text-b5-700 hover:underline"
            >
              Show All
            </button>
          )}
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`shrink-0 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all border snap-start ${
              selectedCategory === 'All'
                ? 'bg-magizh-800 text-white border-magizh-800 shadow-md'
                : 'bg-white text-darkbrown-900 border-cream-300 hover:border-magizh-300'
            }`}
          >
            <span>All Items</span>
          </button>

          {categories
            .filter((c) => c.active)
            .map((cat) => {
              const isSelected = selectedCategory === cat.name;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all border snap-start ${
                    isSelected
                      ? 'bg-magizh-800 text-white border-magizh-800 shadow-md scale-102'
                      : 'bg-white text-darkbrown-900 border-cream-300 hover:border-magizh-300'
                  }`}
                >
                  <span className="text-base">{cat.icon || '🌾'}</span>
                  <div className="text-left">
                    <span className="block font-bold leading-tight">{cat.name}</span>
                    {cat.tamilName && (
                      <span className={`text-[10px] block leading-none ${isSelected ? 'text-cream-200' : 'text-gray-400'}`}>
                        {cat.tamilName}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
        </div>
      </div>

      {/* Today's Offers & Flash Sale Strip */}
      <div className="bg-gradient-to-r from-b5-50 via-amber-50 to-orange-50 border border-b5-300/60 rounded-2xl p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-b5-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-extrabold text-b5-900 uppercase tracking-tight">
                Today's Flash Deals
              </span>
              <span className="bg-b5-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                Up to 25% Off
              </span>
            </div>
            <p className="text-xs text-darkbrown-800">
              Extra 10% B5 Coins credited on all orders completed today!
            </p>
          </div>
        </div>

        {/* Live Countdown */}
        <div className="flex items-center gap-1.5 self-start sm:self-center font-mono">
          <span className="text-xs font-semibold text-b5-900 mr-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-b5-700" />
            Ends in:
          </span>
          <div className="bg-white border border-b5-300 rounded-lg px-2 py-1 text-xs font-extrabold text-b5-900 shadow-2xs">
            {String(timeLeft.hours).padStart(2, '0')}h
          </div>
          <span className="font-black text-b5-800">:</span>
          <div className="bg-white border border-b5-300 rounded-lg px-2 py-1 text-xs font-extrabold text-b5-900 shadow-2xs">
            {String(timeLeft.minutes).padStart(2, '0')}m
          </div>
          <span className="font-black text-b5-800">:</span>
          <div className="bg-white border border-b5-300 rounded-lg px-2 py-1 text-xs font-extrabold text-b5-900 shadow-2xs">
            {String(timeLeft.seconds).padStart(2, '0')}s
          </div>
        </div>
      </div>

      {/* Product Section Filter Tabs */}
      <div className="flex border-b border-cream-300 gap-4 sm:gap-6 text-xs sm:text-sm font-bold overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('all')}
          className={`pb-2.5 border-b-2 transition-all ${
            activeTab === 'all'
              ? 'border-magizh-800 text-magizh-900 font-extrabold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          All Products ({filteredProducts.length})
        </button>
        <button
          onClick={() => setActiveTab('offers')}
          className={`pb-2.5 border-b-2 transition-all flex items-center gap-1 ${
            activeTab === 'offers'
              ? 'border-b5-600 text-b5-900 font-extrabold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-b5-600" />
          Today's Offers
        </button>
        <button
          onClick={() => setActiveTab('bestsellers')}
          className={`pb-2.5 border-b-2 transition-all flex items-center gap-1 ${
            activeTab === 'bestsellers'
              ? 'border-magizh-800 text-magizh-900 font-extrabold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Award className="w-3.5 h-3.5 text-magizh-700" />
          Best Sellers
        </button>
        <button
          onClick={() => setActiveTab('premium')}
          className={`pb-2.5 border-b-2 transition-all flex items-center gap-1 ${
            activeTab === 'premium'
              ? 'border-amber-600 text-amber-900 font-extrabold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          Magizh Premium
        </button>
      </div>

      {/* Product Grid: Exactly Two Cards Per Row on Mobile, Responsive on Desktop */}
      {sortedProducts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-cream-300 p-6">
          <p className="text-sm font-bold text-gray-600">No products match your filters</p>
          <p className="text-xs text-gray-400 mt-1">Try clearing your search query or selecting a different category</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
              setActiveTab('all');
            }}
            className="mt-3 px-4 py-2 bg-magizh-800 text-white rounded-xl text-xs font-bold"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {sortedProducts.map((product) => {
            const activeVariant = selectedVariants[product.id] || product.variants[0];
            const discountPercent =
              activeVariant.originalPrice > activeVariant.price
                ? Math.round(
                    ((activeVariant.originalPrice - activeVariant.price) / activeVariant.originalPrice) * 100
                  )
                : 0;
            const rewardRate = product.b5RewardPercentage || 5;
            const estCoinsEarned = Math.floor(activeVariant.price * (rewardRate / 100));

            return (
              <div
                key={product.id}
                onClick={() => onSelectProduct(product)}
                className="bg-white rounded-2xl border border-cream-300 hover:border-magizh-500/50 shadow-soft hover:shadow-card transition-all duration-200 flex flex-col justify-between overflow-hidden group cursor-pointer"
              >
                <div>
                  {/* Image Container with Badges */}
                  <div className="relative aspect-square overflow-hidden bg-cream-50">
                    <img
                      src={product.images[0] || 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=800&q=80'}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />

                    {/* Discount badge */}
                    {discountPercent > 0 && (
                      <span className="absolute top-2 left-2 bg-b5-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-sm">
                        {discountPercent}% OFF
                      </span>
                    )}

                    {/* Premium / Bestseller badge */}
                    {product.isPremium && (
                      <span className="absolute top-2 right-2 bg-amber-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md shadow-sm flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" />
                        PREMIUM
                      </span>
                    )}

                    {/* B5 Coin Reward Chip */}
                    <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-xs text-b5-700 border border-b5-200 text-[10px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                      <span>🪙</span>
                      <span>+{estCoinsEarned} B5</span>
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="p-2.5 sm:p-3">
                    <div className="flex items-center gap-1 text-[11px] text-amber-500 mb-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="font-bold text-darkbrown-800">{product.rating}</span>
                      <span className="text-gray-400 text-[10px]">({product.reviewsCount})</span>
                    </div>

                    <h3 className="font-bold text-xs sm:text-sm text-darkbrown-900 line-clamp-2 leading-tight group-hover:text-magizh-800 transition-colors">
                      {product.name}
                    </h3>
                    {product.tamilName && (
                      <p className="text-[10px] text-gray-500 font-medium truncate mt-0.5">
                        {product.tamilName}
                      </p>
                    )}

                    {/* Weight / Variant Selector */}
                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                      <label className="text-[10px] font-semibold text-gray-500 block mb-0.5">
                        Weight / Pack:
                      </label>
                      <select
                        value={activeVariant.weight}
                        aria-label={`Select weight variant for ${product.name}`}
                        onChange={(e) => {
                          const variant = product.variants.find((v) => v.weight === e.target.value);
                          if (variant) handleVariantChange(product.id, variant);
                        }}
                        className="w-full text-[11px] font-medium bg-cream-50 border border-cream-300 rounded-lg px-2 py-1 text-darkbrown-900 focus:outline-none focus:ring-1 focus:ring-magizh-700"
                      >
                        {product.variants.map((v) => (
                          <option key={v.weight} value={v.weight}>
                            {v.weight} - ₹{v.price}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Price Block */}
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="text-base sm:text-lg font-black text-magizh-900">
                        ₹{activeVariant.price}
                      </span>
                      {activeVariant.originalPrice > activeVariant.price && (
                        <span className="text-xs text-gray-400 line-through">
                          ₹{activeVariant.originalPrice}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions: Add to Cart and Buy Now */}
                <div className="p-2.5 sm:p-3 pt-0 flex gap-1.5">
                  <button
                    onClick={(e) => handleAddToCartClick(e, product)}
                    className="flex-1 py-1.5 sm:py-2 px-2 bg-cream-200 hover:bg-cream-300 text-darkbrown-900 rounded-xl text-[11px] font-bold transition-colors flex items-center justify-center gap-1 active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 text-magizh-800" />
                    <span>Cart</span>
                  </button>
                  <button
                    onClick={(e) => handleBuyNowClick(e, product)}
                    className="flex-1 py-1.5 sm:py-2 px-2 bg-magizh-800 hover:bg-magizh-900 text-white rounded-xl text-[11px] font-extrabold shadow-sm transition-colors flex items-center justify-center gap-1 active:scale-95"
                  >
                    <span>Buy Now</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
