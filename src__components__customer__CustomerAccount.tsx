import React, { useState } from 'react';
import {
  User as UserIcon,
  MapPin,
  Package,
  Coins,
  Shield,
  LogOut,
  Plus,
  Trash2,
  Check,
  Edit2,
  Share2,
} from 'lucide-react';
import { StorageService } from './src__services__storage';
import { User, Address } from './src__types__index';

interface CustomerAccountProps {
  onNavigateOrders: () => void;
  onNavigateWallet: () => void;
  onNavigateReferral: () => void;
  onOpenAuth: () => void;
}

export const CustomerAccount: React.FC<CustomerAccountProps> = ({
  onNavigateOrders,
  onNavigateWallet,
  onNavigateReferral,
  onOpenAuth,
}) => {
  const [currentUser, setCurrentUser] = useState<User>(StorageService.getCurrentUser());
  const [addresses, setAddresses] = useState<Address[]>(currentUser.addresses || []);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAddr, setNewAddr] = useState<Partial<Address>>({
    name: currentUser.name,
    phone: currentUser.mobile,
    district: 'Chennai',
    state: 'Tamil Nadu',
    addressLine: '',
    pinCode: '600020',
    landmark: '',
  });

  const handleSetDefault = (id: string) => {
    const updated = addresses.map((a) => ({
      ...a,
      isDefault: a.id === id,
    }));
    setAddresses(updated);
    const updatedUser = { ...currentUser, addresses: updated };
    StorageService.saveUser(updatedUser);
    setCurrentUser(updatedUser);
  };

  const handleDeleteAddress = (id: string) => {
    const updated = addresses.filter((a) => a.id !== id);
    setAddresses(updated);
    const updatedUser = { ...currentUser, addresses: updated };
    StorageService.saveUser(updatedUser);
    setCurrentUser(updatedUser);
  };

  const handleSaveNewAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddr.addressLine || !newAddr.pinCode) return;

    const created: Address = {
      id: `addr-${Date.now()}`,
      name: newAddr.name || currentUser.name,
      phone: newAddr.phone || currentUser.mobile,
      addressLine: newAddr.addressLine || '',
      district: newAddr.district || 'Chennai',
      pinCode: newAddr.pinCode || '',
      state: 'Tamil Nadu',
      isDefault: addresses.length === 0,
      landmark: newAddr.landmark,
    };

    const updated = [...addresses, created];
    setAddresses(updated);
    const updatedUser = { ...currentUser, addresses: updated };
    StorageService.saveUser(updatedUser);
    setCurrentUser(updatedUser);
    setShowAddModal(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 pb-28 space-y-6">
      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl border border-cream-300 p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-magizh-700 to-magizh-900 text-white flex items-center justify-center font-extrabold text-2xl shadow-md">
            {currentUser.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-darkbrown-900">
                {currentUser.name}
              </h1>
              <span className="text-[10px] font-bold text-magizh-800 bg-magizh-100 px-2 py-0.5 rounded-full capitalize">
                {currentUser.role}
              </span>
            </div>
            <p className="text-xs text-gray-500 font-mono mt-0.5">
              Customer Code: <span className="font-bold text-darkbrown-900">{currentUser.customerCode}</span>
            </p>
            <p className="text-xs text-gray-600 mt-0.5">
              +91 {currentUser.mobile} &bull; Referral ID: <span className="font-mono font-bold text-b5-700">{currentUser.referralCode}</span>
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onOpenAuth}
            className="px-3.5 py-2 bg-cream-100 hover:bg-cream-200 text-darkbrown-800 rounded-xl text-xs font-bold border border-cream-300 transition-all"
          >
            Switch Account / Persona
          </button>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={onNavigateOrders}
          className="p-4 bg-white rounded-2xl border border-cream-300 hover:border-magizh-400 shadow-2xs hover:shadow-soft transition-all text-left flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-magizh-100 text-magizh-800 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-black text-darkbrown-900 block">Order History</span>
            <span className="text-[11px] text-gray-500">Track shipments & deliveries</span>
          </div>
        </button>

        <button
          onClick={onNavigateWallet}
          className="p-4 bg-white rounded-2xl border border-cream-300 hover:border-b5-400 shadow-2xs hover:shadow-soft transition-all text-left flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-b5-100 text-b5-800 flex items-center justify-center shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-black text-darkbrown-900 block">B5 Coin Wallet</span>
            <span className="text-[11px] text-gray-500">Balance, ledger & redemption</span>
          </div>
        </button>

        <button
          onClick={onNavigateReferral}
          className="p-4 bg-white rounded-2xl border border-cream-300 hover:border-purple-400 shadow-2xs hover:shadow-soft transition-all text-left flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-black text-darkbrown-900 block">Referral & Level 1–7</span>
            <span className="text-[11px] text-gray-500">Earn coins & climb ranks</span>
          </div>
        </button>
      </div>

      {/* Address Book Management */}
      <div className="bg-white rounded-3xl border border-cream-300 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-cream-200 pb-3">
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-darkbrown-900">
              Saved Delivery Addresses
            </h2>
            <p className="text-xs text-gray-500">Manage multiple delivery addresses across districts</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 bg-magizh-800 hover:bg-magizh-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Address</span>
          </button>
        </div>

        {addresses.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">No saved addresses</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="p-3.5 rounded-2xl border border-cream-300 bg-cream-50/40 relative space-y-1 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-darkbrown-900">{addr.name}</span>
                  {addr.isDefault ? (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Default Address
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSetDefault(addr.id)}
                      className="text-[10px] font-bold text-magizh-800 hover:underline"
                    >
                      Set as Default
                    </button>
                  )}
                </div>

                <p className="text-gray-500 font-mono text-[11px]">Phone: {addr.phone}</p>
                <p className="text-gray-700">{addr.addressLine}</p>
                <p className="text-gray-600 font-medium">
                  {addr.district}, {addr.state} - <span className="font-mono font-bold">{addr.pinCode}</span>
                </p>
                {addr.landmark && (
                  <p className="text-gray-400 text-[11px]">Landmark: {addr.landmark}</p>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => handleDeleteAddress(addr.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Delete Address"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Address Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-darkbrown-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-cream-300 w-full max-w-md p-5 space-y-4">
            <h3 className="text-sm font-extrabold text-darkbrown-900">Add New Address</h3>

            <form onSubmit={handleSaveNewAddress} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-darkbrown-800 mb-1">Name</label>
                <input
                  type="text"
                  value={newAddr.name}
                  onChange={(e) => setNewAddr({ ...newAddr, name: e.target.value })}
                  className="w-full p-2 border border-cream-300 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-darkbrown-800 mb-1">Mobile</label>
                <input
                  type="tel"
                  maxLength={10}
                  value={newAddr.phone}
                  onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })}
                  className="w-full p-2 border border-cream-300 rounded-xl font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-darkbrown-800 mb-1">Address</label>
                <textarea
                  rows={2}
                  value={newAddr.addressLine}
                  onChange={(e) => setNewAddr({ ...newAddr, addressLine: e.target.value })}
                  className="w-full p-2 border border-cream-300 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-darkbrown-800 mb-1">District</label>
                  <select
                    value={newAddr.district}
                    onChange={(e) => setNewAddr({ ...newAddr, district: e.target.value })}
                    className="w-full p-2 border border-cream-300 rounded-xl"
                  >
                    <option value="Chennai">Chennai</option>
                    <option value="Coimbatore">Coimbatore</option>
                    <option value="Madurai">Madurai</option>
                    <option value="Salem">Salem</option>
                    <option value="Tiruchirappalli">Tiruchirappalli</option>
                    <option value="Tirunelveli">Tirunelveli</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-darkbrown-800 mb-1">PIN Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={newAddr.pinCode}
                    onChange={(e) => setNewAddr({ ...newAddr, pinCode: e.target.value })}
                    className="w-full p-2 border border-cream-300 rounded-xl font-mono"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 bg-cream-100 hover:bg-cream-200 text-darkbrown-800 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-magizh-800 hover:bg-magizh-900 text-white rounded-xl font-bold"
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
