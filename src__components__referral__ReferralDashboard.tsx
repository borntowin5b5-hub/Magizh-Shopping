import React, { useState, useEffect } from 'react';
import {
  Share2,
  Copy,
  Check,
  Award,
  Users,
  Coins,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Star,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { StorageService, subscribe } from './src__services__storage';
import { User, ReferralLevelConfig, ReferralRecord } from './src__types__index';

export const ReferralDashboard: React.FC = () => {
  const currentUser: User = StorageService.getCurrentUser();
  const [levels, setLevels] = useState<ReferralLevelConfig[]>(StorageService.getReferralLevels());
  const [referrals, setReferrals] = useState<ReferralRecord[]>(
    StorageService.getReferralRecords(currentUser.id)
  );
  const [copied, setCopied] = useState(false);
  const [qualifyNotice, setQualifyNotice] = useState<string | null>(null);

  useEffect(() => {
    const unsubLvl = subscribe('referralLevelsChanged', (lvls: ReferralLevelConfig[]) => {
      setLevels(lvls);
    });
    const unsubRef = subscribe('referralRecordsChanged', () => {
      setReferrals(StorageService.getReferralRecords(currentUser.id));
    });
    return () => {
      unsubLvl();
      unsubRef();
    };
  }, [currentUser.id]);

  const qualifiedCount = referrals.filter((r) => r.status === 'qualified').length;
  const totalVolume = referrals.reduce((sum, r) => sum + r.totalSpent, 0);

  // Compute Current Level based on qualified count
  let currentLevel = levels[0];
  for (let i = levels.length - 1; i >= 0; i--) {
    if (qualifiedCount >= levels[i].minReferrals && totalVolume >= levels[i].minTeamVolume) {
      currentLevel = levels[i];
      break;
    }
  }

  const nextLevelIndex = levels.findIndex((l) => l.level === currentLevel.level) + 1;
  const nextLevel = nextLevelIndex < levels.length ? levels[nextLevelIndex] : null;

  const referralLink = `https://magizhshopping.in/join?ref=${currentUser.referralCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Demo simulator: Simulate a pending referral making their first purchase and qualifying
  const handleSimulateQualification = (record: ReferralRecord) => {
    if (record.status === 'qualified') return;

    record.status = 'qualified';
    record.hasPurchased = true;
    record.totalSpent = 650;
    record.rewardCredited = true;

    // Credit 50 B5 Coins to current user
    const coinAccount = StorageService.getCoinAccount(currentUser.id);
    const newBal = coinAccount.availableBalance + 50;
    StorageService.saveCoinAccount({
      ...coinAccount,
      availableBalance: newBal,
      totalEarned: coinAccount.totalEarned + 50,
    });

    StorageService.recordCoinTransaction({
      id: `TXN-REF-${Date.now()}`,
      customerId: currentUser.id,
      type: 'referral_bonus',
      amount: 50,
      reason: `Referral Reward: ${record.refereeName} verified first purchase`,
      timestamp: new Date().toISOString(),
      balanceAfter: newBal,
      status: 'completed',
    });

    StorageService.addReferralRecord(record);
    setQualifyNotice(`Qualified ${record.refereeName}! Credited +50 B5 Coins to your wallet!`);
    setTimeout(() => setQualifyNotice(null), 4000);
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 pb-28 space-y-6">
      {/* Header Strip */}
      <div className="bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-950 text-white rounded-3xl p-5 sm:p-7 shadow-card border border-purple-700/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-purple-500/20 text-purple-200 border border-purple-400/30 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Seniority Tier Engine
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black mt-1">
              Referral Rewards & Levels 1–7
            </h1>
            <p className="text-xs text-purple-200 mt-1 max-w-md leading-relaxed">
              Share natural health with your friends. Earn 50 B5 Coins on their verified first purchase and unlock cascading seniority level bonuses.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/20 text-center shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-200 block">
              Current Tier
            </span>
            <span className="text-sm font-black text-white block mt-0.5">
              Level {currentLevel.level}: {currentLevel.title}
            </span>
            <span className="text-[10px] text-amber-300 font-bold mt-1 block">
              {currentLevel.commissionPercentage}% Commission Share
            </span>
          </div>
        </div>

        {/* Shareable Box */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 bg-black/30 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-white/15 w-full flex items-center justify-between font-mono text-xs text-purple-100">
            <span className="truncate">{referralLink}</span>
            <span className="ml-2 bg-purple-700 px-2 py-0.5 rounded text-[10px] font-bold text-white">
              {currentUser.referralCode}
            </span>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={handleCopyLink}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-white text-purple-900 rounded-xl text-xs font-black shadow-md hover:bg-cream-100 transition-all flex items-center justify-center gap-1.5"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied Link!' : 'Copy Link'}</span>
            </button>
            <a
              href={`https://wa.me/?text=Buy%20fresh%20organic%20millets%20and%20natural%20food%20at%20Magizh%20Shopping!%20Get%20100%20B5%20Coins%20bonus:%20${encodeURIComponent(referralLink)}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
      </div>

      {qualifyNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs font-bold text-emerald-900 flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{qualifyNotice}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-cream-300 shadow-2xs">
          <span className="text-[11px] text-gray-500 font-semibold block">Total Referrals</span>
          <span className="text-xl sm:text-2xl font-black text-darkbrown-900 mt-1 block">
            {referrals.length}
          </span>
          <span className="text-[10px] text-gray-400 mt-0.5 block">Signed up via link</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-cream-300 shadow-2xs">
          <span className="text-[11px] text-gray-500 font-semibold block">Qualified (1st Order)</span>
          <span className="text-xl sm:text-2xl font-black text-emerald-700 mt-1 block">
            {qualifiedCount}
          </span>
          <span className="text-[10px] text-emerald-700 font-bold mt-0.5 block">
            Earned {qualifiedCount * 50} Coins
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-cream-300 shadow-2xs">
          <span className="text-[11px] text-gray-500 font-semibold block">Team Order Volume</span>
          <span className="text-xl sm:text-2xl font-black text-darkbrown-900 mt-1 block">
            ₹{totalVolume.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-gray-400 mt-0.5 block">Cumulative spend</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-cream-300 shadow-2xs">
          <span className="text-[11px] text-gray-500 font-semibold block">Bonus Coins Earned</span>
          <span className="text-xl sm:text-2xl font-black text-purple-700 mt-1 block">
            +{qualifiedCount * 50 + currentLevel.rewardBonusCoins} B5
          </span>
          <span className="text-[10px] text-purple-700 font-bold mt-0.5 block">100% auditable</span>
        </div>
      </div>

      {/* Level 1 through Level 7 Cascading Hierarchy */}
      <div className="bg-white rounded-3xl border border-cream-300 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-cream-200 pb-3">
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-darkbrown-900">
              Seniority Progression: Level 1 through Level 7
            </h2>
            <p className="text-xs text-gray-500">
              Configurable qualification requirements & seniority milestones
            </p>
          </div>
          {nextLevel && (
            <span className="text-xs font-bold text-purple-800 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
              Next Goal: {nextLevel.minReferrals - qualifiedCount} more to Level {nextLevel.level}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {levels.map((lvl) => {
            const isCurrent = lvl.level === currentLevel.level;
            const isUnlocked = qualifiedCount >= lvl.minReferrals && totalVolume >= lvl.minTeamVolume;

            return (
              <div
                key={lvl.level}
                className={`p-3.5 rounded-2xl border transition-all relative ${
                  isCurrent
                    ? 'border-purple-600 bg-purple-50/60 ring-2 ring-purple-600/30'
                    : isUnlocked
                    ? 'border-emerald-300 bg-emerald-50/30'
                    : 'border-cream-300 bg-cream-50/30 opacity-70'
                }`}
              >
                {isCurrent && (
                  <span className="absolute -top-2.5 right-3 bg-purple-700 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase shadow-sm">
                    Current Level
                  </span>
                )}

                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-6 h-6 rounded-lg bg-darkbrown-900 text-white font-black text-xs flex items-center justify-center">
                    {lvl.level}
                  </span>
                  <span className="font-extrabold text-xs text-darkbrown-900 truncate">
                    {lvl.title}
                  </span>
                </div>

                <div className="space-y-1 text-[11px] text-gray-600 mt-2">
                  <div className="flex justify-between">
                    <span>Min Qualified:</span>
                    <span className="font-bold">{lvl.minReferrals} members</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Team Volume:</span>
                    <span className="font-bold">₹{lvl.minTeamVolume.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-purple-800 font-bold pt-1 border-t border-cream-200">
                    <span>Milestone Reward:</span>
                    <span>+{lvl.rewardBonusCoins} B5 Coins</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Referral Records & Verification History */}
      <div className="bg-white rounded-3xl border border-cream-300 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-cream-200 pb-3">
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-darkbrown-900">
              Invited Member Records & Verification Status
            </h2>
            <p className="text-xs text-gray-500">Coins are credited only when purchase qualification is verified</p>
          </div>
          <span className="text-xs font-mono font-bold text-gray-400">
            {referrals.length} friends invited
          </span>
        </div>

        <div className="space-y-2.5">
          {referrals.map((rec) => (
            <div
              key={rec.id}
              className="p-3.5 rounded-2xl border border-cream-200 bg-cream-50/40 flex flex-wrap items-center justify-between gap-3 text-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-darkbrown-900">{rec.refereeName}</span>
                  <span className="text-gray-400 font-mono text-[11px]">({rec.refereePhone})</span>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      rec.status === 'qualified'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {rec.status === 'qualified' ? '✓ First Order Verified' : 'Registered (Order Pending)'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Joined on {new Date(rec.registeredAt).toLocaleDateString('en-IN')} &bull; Spend: ₹{rec.totalSpent}
                </p>
              </div>

              <div>
                {rec.status === 'qualified' ? (
                  <span className="text-emerald-700 font-bold text-xs bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    +50 B5 Coins Credited
                  </span>
                ) : (
                  <button
                    onClick={() => handleSimulateQualification(rec)}
                    className="px-3 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition-all shadow-2xs"
                    title="Simulate referee qualifying purchase in Demo Mode"
                  >
                    Verify Qualification & Award 50 Coins
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
