import { useState, useEffect } from 'react';
import { Wallet, IndianRupee, Printer, Truck, FileText, Plus, Trash2, TrendingUp, Package, Calculator, CheckCircle } from 'lucide-react';
import { apiCall } from '../../api';

export default function AdminFinances() {
    const [orders, setOrders] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);

    const [newExpense, setNewExpense] = useState({
        date: new Date().toISOString().split('T')[0],
        category: 'Printing',
        amount: '',
        description: ''
    });

    const categories = ['Printing', 'Post Office', 'Supplies', 'Refund', 'Marketing', 'Other'];

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        try {
            setLoading(true);
            const [ordersData, expensesData] = await Promise.all([
                apiCall('getOrders', {}),
                apiCall('getExpenses', {})
            ]);
            setOrders(ordersData.orders || []);
            setExpenses(expensesData.expenses || []);
        } catch (err) {
            console.error(err);
            setToastMessage('Failed to load financial data.');
            setTimeout(() => setToastMessage(null), 3000);
        } finally {
            setLoading(false);
        }
    }

    const handleAddExpense = async (e) => {
        e.preventDefault();
        if (!newExpense.amount || !newExpense.category) return;
        
        setActionLoading(true);
        try {
            const res = await apiCall('addExpense', newExpense);
            if (res.success) {
                setExpenses([{ ...newExpense, id: res.id }, ...expenses]);
                setNewExpense({ ...newExpense, amount: '', description: '' });
                setToastMessage('Expense added successfully!');
                setTimeout(() => setToastMessage(null), 3000);
            }
        } catch (err) {
            console.error(err);
            setToastMessage('Failed to add expense.');
            setTimeout(() => setToastMessage(null), 3000);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteExpense = async (id) => {
        if (!window.confirm("Are you sure you want to delete this expense?")) return;
        
        setActionLoading(true);
        try {
            await apiCall('deleteExpense', { id });
            setExpenses(expenses.filter(e => e.id !== id));
            setToastMessage('Expense deleted.');
            setTimeout(() => setToastMessage(null), 3000);
        } catch (err) {
            console.error(err);
            setToastMessage('Failed to delete expense.');
            setTimeout(() => setToastMessage(null), 3000);
        } finally {
            setActionLoading(false);
        }
    };

    // --- Calculations ---
    const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.price) || 0), 0);
    const totalCrafterPayout = orders.reduce((sum, o) => sum + (Number(o.commission) || 0), 0);
    const totalCustomExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const netBalance = totalRevenue - totalCrafterPayout - totalCustomExpenses;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
                <p className="text-gray-500 font-medium">Crunching the numbers...</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12">
            {toastMessage && (
                <div className="fixed top-4 right-4 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-2xl z-50 flex items-center font-medium animate-bounce">
                    <CheckCircle className="text-green-400 mr-2" size={20} />
                    {toastMessage}
                </div>
            )}

            <div>
                <h1 className="text-2xl font-black text-gray-900 flex items-center">
                    <Calculator className="mr-2 text-indigo-600" /> Financial Overview
                </h1>
                <p className="mt-1 text-sm text-gray-500 font-medium">Track your total revenue, crafter payouts, and custom expenses in real-time.</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 bg-green-50 rounded-full p-6 group-hover:scale-110 transition-transform">
                        <Wallet size={32} className="text-green-500/50" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Total Revenue</p>
                        <h3 className="text-3xl font-black text-gray-900">₹{totalRevenue.toLocaleString()}</h3>
                        <p className="text-xs text-green-600 font-medium mt-2 flex items-center">
                            <TrendingUp size={12} className="mr-1" /> From {orders.length} orders
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 bg-blue-50 rounded-full p-6 group-hover:scale-110 transition-transform">
                        <Package size={32} className="text-blue-500/50" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Crafter Payouts</p>
                        <h3 className="text-3xl font-black text-gray-900">₹{totalCrafterPayout.toLocaleString()}</h3>
                        <p className="text-xs text-blue-600 font-medium mt-2">
                            Base Commissions
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 bg-orange-50 rounded-full p-6 group-hover:scale-110 transition-transform">
                        <Truck size={32} className="text-orange-500/50" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Custom Expenses</p>
                        <h3 className="text-3xl font-black text-gray-900">₹{totalCustomExpenses.toLocaleString()}</h3>
                        <p className="text-xs text-orange-600 font-medium mt-2">
                            Printing, Post, etc.
                        </p>
                    </div>
                </div>

                <div className={`rounded-2xl shadow-sm border p-5 flex flex-col justify-between relative overflow-hidden group ${netBalance >= 0 ? 'bg-indigo-600 border-indigo-500' : 'bg-red-600 border-red-500'}`}>
                    <div className="absolute -right-4 -top-4 bg-white/10 rounded-full p-6 group-hover:scale-110 transition-transform">
                        <IndianRupee size={32} className="text-white/50" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-sm font-bold text-indigo-100 uppercase tracking-widest mb-1">Net Balance</p>
                        <h3 className="text-4xl font-black text-white">₹{netBalance.toLocaleString()}</h3>
                        <p className="text-xs text-indigo-50 font-medium mt-2">
                            {netBalance >= 0 ? 'Total Profit Margin' : 'Operating at a loss'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
                {/* Add Expense Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 sticky top-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                            <Plus className="mr-2 text-indigo-600" size={20} /> Record New Expense
                        </h2>
                        
                        <form onSubmit={handleAddExpense} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Date</label>
                                <input 
                                    type="date" 
                                    required 
                                    value={newExpense.date}
                                    onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                                    className="w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5 px-3 bg-gray-50 font-medium"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Category</label>
                                <select 
                                    value={newExpense.category}
                                    onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                                    className="w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5 px-3 bg-gray-50 font-medium"
                                >
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Amount (₹)</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    required 
                                    placeholder="0"
                                    value={newExpense.amount}
                                    onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                                    className="w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5 px-3 bg-gray-50 font-medium text-lg"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Description (Optional)</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g., A4 Photo Paper pack..."
                                    value={newExpense.description}
                                    onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                                    className="w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5 px-3 bg-gray-50 font-medium"
                                />
                            </div>
                            
                            <button 
                                type="submit" 
                                disabled={actionLoading}
                                className="w-full mt-2 bg-gray-900 hover:bg-black text-white font-bold py-3 px-4 rounded-xl shadow-md transition-transform transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none flex items-center justify-center"
                            >
                                {actionLoading ? 'Saving...' : 'Add Expense'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Expense List Table */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
                        <div className="p-5 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center">
                                <FileText className="mr-2 text-indigo-600" size={20} /> Expense Ledger
                            </h2>
                            <span className="text-xs font-bold bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full">{expenses.length} Records</span>
                        </div>
                        
                        <div className="overflow-x-auto">
                            {expenses.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 font-medium">
                                    No custom expenses recorded yet.
                                </div>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Details</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                                            <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {expenses.map((expense) => (
                                            <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                                                    {expense.date}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                                        expense.category === 'Printing' ? 'bg-purple-100 text-purple-800' :
                                                        expense.category === 'Post Office' ? 'bg-orange-100 text-orange-800' :
                                                        expense.category === 'Supplies' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {expense.category}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-900">
                                                    {expense.description || <span className="text-gray-400 italic">No description</span>}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-gray-900 text-right">
                                                    ₹{Number(expense.amount).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <button 
                                                        onClick={() => handleDeleteExpense(expense.id)}
                                                        disabled={actionLoading}
                                                        className="text-red-400 hover:text-red-600 transition-colors bg-red-50 hover:bg-red-100 p-2 rounded-lg"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
