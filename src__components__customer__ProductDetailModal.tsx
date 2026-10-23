import React, { useState } from 'react';
import { X, Star, ShieldCheck, MapPin, Leaf, Check, Plus, Minus, ShoppingBag, Coins, Sparkles, Heart } from 'lucide-react';
import { Product, WeightVariant } from './src__types__index';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, variant: WeightVariant, quantity: number) => void;
  onBuyNow: (product: Product, variant: WeightVariant, quantity: number) => void;
  relatedProducts: Product[];
  onSelectProduct: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onAddToCart,
  onBuyNow,
  relatedProducts,
  onSelectProduct,
}) => {
  if (!product) return null;

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<WeightVariant>(product.variants[0]);
  const [quantity, setQuantity] = useState(1);
  const [addedNotice, setAddedNotice] = useState(false);

  const discountPercent = Math.round(
    ((selectedVariant.originalPrice - selectedVariant.price) / selectedVariant.originalPrice) * 100
  );
  const coinsEarned = Math.floor(selectedVariant.price * quantity * 0.05);

  const handleAdd = () => {
    onAddToCart(product, selectedVariant, quantity);
    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 2000);
  };

  const handleBuy = () => {
    onBuyNow(product, selectedVariant, quantity);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-darkbrown-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-cream-300 w-full max-w-3xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-cream-200 bg-cream-50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-magizh-800 bg-magizh-100 px-2.5 py-0.5 rounded-full">
              {product.category}
            </span>
            {product.isPremium && (
              <span className="text-[10px] font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-600" />
                Magizh Premium Collection
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-gray-800 hover:bg-cream-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Scroll Area */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Images */}
            <div className="space-y-3">
              <div className="aspect-square rounded-2xl overflow-hidden bg-cream-100 border border-cream-200 relative">
                <img
                  src={product.images[selectedImageIndex] || product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                {discountPercent > 0 && (
                  <span className="absolute top-3 left-3 bg-b5-600 text-white text-xs font-black px-2 py-1 rounded-lg shadow-sm">
                    {discountPercent}% OFF
                  </span>
                )}
              </div>

              {product.images.length > 1 && (
                <div className="flex gap-2">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                        selectedImageIndex === idx ? 'border-magizh-700 scale-105' : 'border-cream-300 opacity-70'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Origin Tag */}
              {product.origin && (
                <div className="flex items-center gap-2 text-xs text-darkbrown-800 bg-cream-50 p-2.5 rounded-xl border border-cream-200">
                  <MapPin className="w-4 h-4 text-magizh-700 shrink-0" />
                  <span><strong>Farm Origin:</strong> {product.origin}</span>
                </div>
              )}
            </div>

            {/* Right: Info & Purchase Controls */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-amber-500 mb-1">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < Math.floor(product.rating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-bold text-darkbrown-900">{product.rating}</span>
                  <span className="text-gray-400">({product.reviewsCount} customer reviews)</span>
                </div>

                <h2 className="text-lg sm:text-xl font-extrabold text-darkbrown-900 leading-tight">
                  {product.name}
                </h2>
                {product.tamilName && (
                  <p className="text-xs text-gray-500 font-semibold mt-0.5">
                    {product.tamilName}
                  </p>
                )}
              </div>

              {/* Price & Savings */}
              <div className="bg-cream-50 p-3.5 rounded-2xl border border-cream-200 flex items-baseline justify-between">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-magizh-900">
                      ₹{selectedVariant.price * quantity}
                    </span>
                    {selectedVariant.originalPrice > selectedVariant.price && (
                      <span className="text-sm text-gray-400 line-through">
                        ₹{selectedVariant.originalPrice * quantity}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-emerald-700 font-bold">
                    You save ₹{(selectedVariant.originalPrice - selectedVariant.price) * quantity} ({discountPercent}%)
                  </span>
                </div>

                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                  selectedVariant.stock > 10 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {selectedVariant.stock > 10 ? 'In Stock' : `Only ${selectedVariant.stock} left`}
                </span>
              </div>

              {/* B5 Coin Reward Banner */}
              <div className="bg-gradient-to-r from-b5-50 to-amber-50 border border-b5-200 p-3 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-b5-600 text-white flex items-center justify-center font-black shadow-inner">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-extrabold text-b5-900 block">
                      +{coinsEarned} B5 Coins will be earned!
                    </span>
                    <span className="text-[11px] text-darkbrown-700">
                      1 B5 Coin = ₹1 redemption value on future orders
                    </span>
                  </div>
                </div>
              </div>

              {/* Weight Selector */}
              <div>
                <label className="block text-xs font-bold text-darkbrown-800 mb-1.5">
                  Select Weight / Pack Size:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {product.variants.map((v) => (
                    <button
                      key={v.weight}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={`p-2 rounded-xl text-xs font-semibold text-center border transition-all ${
                        selectedVariant.weight === v.weight
                          ? 'border-magizh-800 bg-magizh-50 text-magizh-900 ring-2 ring-magizh-600 font-bold'
                          : 'border-cream-300 hover:border-cream-400 bg-white text-gray-700'
                      }`}
                    >
                      <div>{v.weight}</div>
                      <div className="text-[11px] text-magizh-800 font-bold mt-0.5">₹{v.price}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity Selector */}
              <div>
                <label className="block text-xs font-bold text-darkbrown-800 mb-1.5">
                  Quantity:
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-cream-300 rounded-xl bg-white overflow-hidden shadow-2xs">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-2 hover:bg-cream-100 text-darkbrown-800"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-4 text-xs font-bold text-darkbrown-900 font-mono">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(Math.min(selectedVariant.stock, quantity + 1))}
                      className="p-2 hover:bg-cream-100 text-darkbrown-800"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-xs text-gray-500 font-medium">
                    (₹{selectedVariant.price} each)
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleAdd}
                  className="flex-1 py-3 bg-cream-100 hover:bg-magizh-100 text-magizh-900 border border-magizh-400 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{addedNotice ? 'Added to Cart ✓' : 'Add to Cart'}</span>
                </button>
                <button
                  onClick={handleBuy}
                  className="flex-1 py-3 bg-gradient-to-r from-b5-600 to-b5-700 hover:from-b5-700 hover:to-b5-800 text-white rounded-2xl text-xs sm:text-sm font-black shadow-md hover:shadow-lg transition-all text-center"
                >
                  Buy Now &bull; ₹{selectedVariant.price * quantity}
                </button>
              </div>
            </div>
          </div>

          {/* Description & Benefits */}
          <div className="border-t border-cream-200 pt-4 space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-darkbrown-900 mb-1">Product Description</h3>
              <p className="text-xs text-gray-700 leading-relaxed">{product.description}</p>
            </div>

            {product.benefits && product.benefits.length > 0 && (
              <div>
                <h3 className="text-sm font-extrabold text-darkbrown-900 mb-2">Key Health Benefits</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {product.benefits.map((b, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-800 bg-cream-50 p-2 rounded-xl">
                      <Leaf className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {product.ingredients && product.ingredients.length > 0 && (
              <div>
                <h3 className="text-sm font-extrabold text-darkbrown-900 mb-1">Authentic Ingredients</h3>
                <p className="text-xs text-gray-600">{product.ingredients.join(' • ')}</p>
              </div>
            )}
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div className="border-t border-cream-200 pt-4">
              <h3 className="text-sm font-extrabold text-darkbrown-900 mb-3">You May Also Like</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {relatedProducts.slice(0, 3).map((rel) => (
                  <div
                    key={rel.id}
                    onClick={() => {
                      onSelectProduct(rel);
                      setSelectedVariant(rel.variants[0]);
                      setQuantity(1);
                      setSelectedImageIndex(0);
                    }}
                    className="p-2 border border-cream-200 rounded-xl hover:border-magizh-400 cursor-pointer bg-white"
                  >
                    <img src={rel.images[0]} alt={rel.name} className="w-full h-24 object-cover rounded-lg mb-1" />
                    <p className="text-xs font-bold text-darkbrown-900 truncate">{rel.name}</p>
                    <p className="text-xs font-black text-magizh-800 mt-0.5">₹{rel.variants[0].price}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
