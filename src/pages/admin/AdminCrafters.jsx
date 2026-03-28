import { useState, useEffect } from 'react';
import { Search, UserCheck, ShieldAlert, XCircle, Loader2, Package, HandCoins, Hourglass, CheckCircle2 } from 'lucide-react';
import { apiCall } from '../../api';

export default function AdminCrafters() {
    const [crafters, setCrafters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statsModalOpen, setStatsModalOpen] = useState(false);
    const [selectedCrafter, setSelectedCrafter] = useState(null);
    const [crafterStats, setCrafterStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);
    const [isMarkingPaid, setIsMarkingPaid] = useState(false);
    const [payoutAmount, setPayoutAmount] = useState('');

    useEffect(() => {
        async function loadCrafters() {
            try {
                const data = await apiCall('getCrafters');
                setCrafters(data.crafters || []);
            } catch (err) {
                console.error("Failed to load crafters", err);
            } finally {
                setLoading(false);
            }
        }
        loadCrafters();
    }, []);

    const updateStatus = async (id, newStatus) => {
        // Optimistic UI update
        setCrafters(crafters.map(c => c.id === id ? { ...c, status: newStatus } : c));
        try {
            await apiCall('updateCrafterStatus', { crafterId: id, status: newStatus });
        } catch (err) {
            console.error("Failed to update status", err);
        }
    };

    const openStats = async (crafter) => {
        setStatsModalOpen(true);
        setSelectedCrafter(crafter);
        setLoadingStats(true);
        try {
            // Using the existing dashboard endpoint designed for the crafter, but bypassing auth check manually in sheet fetching logic natively! 
            // Wait, does getDashboardStats require the caller to BE the crafter?
            // No, the backend API is entirely stateless for fetching Google Sheet data.
            const data = await apiCall('getDashboardStats', { crafterId: crafter.referral });
            setCrafterStats(data);
        } catch (err) {
            console.error("Failed to load stats", err);
        } finally {
            setLoadingStats(false);
        }
    };

    const submitManualPayout = async (crafterId) => {
        if (!payoutAmount || isNaN(payoutAmount) || Number(payoutAmount) <= 0) {
            return alert("Please enter a valid payout amount.");
        }
        if (!confirm(`Confirm permanently recording a payout of ₹${payoutAmount} to ${selectedCrafter.name}?`)) return;

        setIsMarkingPaid(true);
        try {
            await apiCall('submitPayout', { crafterId, amount: Number(payoutAmount) });
            // Refresh stats!
            const data = await apiCall('getDashboardStats', { crafterId });
            setCrafterStats(data);
            setPayoutAmount('');
        } catch (err) {
            console.error(err);
            alert("Failed to record payout.");
        } finally {
            setIsMarkingPaid(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Crafters Directory</h1>
                    <p className="mt-1 text-sm text-gray-500">Manage returning affiliates and crafters.</p>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
                <div className="relative max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={18} className="text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search crafters by name or referral ID..."
                        className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading crafters...</div>
            ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {crafters.map((crafter) => (
                        <div key={crafter.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-900">{crafter.name}</h3>
                                    <select
                                        value={crafter.status}
                                        onChange={(e) => updateStatus(crafter.id, e.target.value)}
                                        className={`text-xs font-bold px-2 py-1 rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-blue-500 ${crafter.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Pending Validation">Pending</option>
                                    </select>
                                </div>
                                <p className="text-sm text-gray-500 mt-1">{crafter.email}</p>

                                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm">
                                    <div>
                                        <span className="text-gray-500 block">Referral ID</span>
                                        <span className="font-medium text-gray-900">{crafter.referral}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-gray-500 block">Total Orders</span>
                                        <span className="font-medium text-gray-900">{crafter.ordersCount || 0}</span>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <button onClick={() => openStats(crafter)} className="w-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 py-2.5 rounded-lg text-sm font-bold transition-colors">View Earnings & Stats</button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {crafters.length === 0 && (
                        <div className="col-span-full text-center py-8 text-gray-500">No crafters found.</div>
                    )}
                </div>
            )}

            {statsModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl flex flex-col">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">Live Diagnostics: {selectedCrafter?.name}</h2>
                            <button onClick={() => setStatsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><XCircle size={24} /></button>
                        </div>
                        <div className="p-6 bg-gray-50 rounded-b-xl">
                            {loadingStats ? (
                                <div className="flex flex-col items-center justify-center py-12 text-indigo-600">
                                    <Loader2 className="animate-spin h-8 w-8 mb-4" />
                                    <p className="text-gray-600 font-medium">Fetching real-time Google Sheet earnings calculations...</p>
                                </div>
                            ) : crafterStats ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="bg-white shadow-sm border border-blue-100 rounded-xl p-6 text-center">
                                        <Package className="mx-auto text-blue-500 mb-3 bg-blue-50 p-2 rounded-lg" size={40} />
                                        <div className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Total Orders</div>
                                        <div className="text-3xl font-extrabold text-gray-900">{crafterStats.totalOrders}</div>
                                    </div>
                                    <div className="bg-white shadow-sm border border-indigo-100 rounded-xl p-6 text-center">
                                        <HandCoins className="mx-auto text-indigo-500 mb-3 bg-indigo-50 p-2 rounded-lg" size={40} />
                                        <div className="text-xs text-indigo-600 font-bold uppercase tracking-wider mb-1">Total Earnings</div>
                                        <div className="text-3xl font-extrabold text-gray-900">{crafterStats.totalEarnings}</div>
                                    </div>
                                    <div className="bg-white shadow-sm border border-orange-100 rounded-xl p-6 text-center ring-1 ring-orange-200">
                                        <Hourglass className="mx-auto text-orange-500 mb-3 bg-orange-50 p-2 rounded-lg" size={40} />
                                        <div className="text-xs text-orange-600 font-bold uppercase tracking-wider mb-1">Pending Payout</div>
                                        <div className="text-3xl font-extrabold text-gray-900">{crafterStats.pendingPayout}</div>
                                    </div>
                                    <div className="bg-white shadow-sm border border-green-100 rounded-xl p-6 text-center ring-1 ring-green-200">
                                        <CheckCircle2 className="mx-auto text-green-500 mb-3 bg-green-50 p-2 rounded-lg" size={40} />
                                        <div className="text-xs text-green-600 font-bold uppercase tracking-wider mb-1">Paid Earnings</div>
                                        <div className="text-3xl font-extrabold text-gray-900">{crafterStats.paidEarnings}</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-red-500 py-6 font-bold">Failed to load data. Please check network.</div>
                            )}

                            {crafterStats && (
                                <div className="mt-6 border-t border-gray-100 pt-5 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
                                    <div className="w-full sm:w-auto">
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Record Manual Payout</label>
                                        <p className="text-xs text-gray-500 mb-2">Type exactly how much you paid them today.</p>
                                        <div className="flex items-center space-x-2">
                                            <span className="text-gray-500 font-bold">₹</span>
                                            <input
                                                type="number"
                                                placeholder="Amount"
                                                value={payoutAmount}
                                                onChange={e => setPayoutAmount(e.target.value)}
                                                className="block w-full sm:w-48 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm border py-2 px-3"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => submitManualPayout(selectedCrafter.referral)}
                                        disabled={!payoutAmount || isMarkingPaid}
                                        className="w-full sm:w-auto px-6 py-2.5 whitespace-nowrap bg-green-600 text-white font-bold rounded-lg shadow-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center transition-colors"
                                    >
                                        {isMarkingPaid && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                                        {isMarkingPaid ? 'Saving Ledger...' : 'Save Typed Payout'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
