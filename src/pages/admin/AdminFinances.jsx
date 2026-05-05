import { useState, useEffect } from 'react';
import { Plus, Trash2, IndianRupee, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, FileText, X, Download, Edit2 } from 'lucide-react';
import { apiCall } from '../../api';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Custom hook for number counting animation
const useAnimatedNumber = (end, duration = 1500) => {
    const [value, setValue] = useState(0);

    useEffect(() => {
        if (end === 0) {
            setValue(0);
            return;
        }
        let startTime = null;
        const animate = (currentTime) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);
            // easeOutQuart
            const easeProgress = 1 - Math.pow(1 - progress, 4);
            setValue(Math.floor(easeProgress * end));
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setValue(end); // Ensure final exact value
            }
        };
        requestAnimationFrame(animate);
    }, [end, duration]);

    return value;
};

// Helper for dd/mm/yy formatting
const formatToDDMMYY = (dateStr) => {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y.slice(-2)}`;
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = String(date.getFullYear()).slice(-2);
    return `${d}/${m}/${y}`;
};

export default function AdminFinances() {
    const [orders, setOrders] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [sheetMissing, setSheetMissing] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [filterCategory, setFilterCategory] = useState('All');

    const [newExpense, setNewExpense] = useState({
        date: new Date().toISOString().split('T')[0],
        category: 'Printing',
        amount: '',
        description: ''
    });

    const categories = ['Income (Bank Deposit)', 'Crafter Payout', 'Printing', 'Post Office', 'Refund', 'Marketing', 'Other'];

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        try {
            const ordersData = await apiCall('getOrders', {});
            setOrders(ordersData.orders || []);
        } catch (err) {
            console.error('Failed to load orders:', err);
            setToastMessage('Warning: Failed to load revenue data.');
            setTimeout(() => setToastMessage(null), 3000);
        }

        try {
            const expensesData = await apiCall('getExpenses', {});
            setExpenses(expensesData.expenses || []);
            setSheetMissing(false);
        } catch (err) {
            console.error('Failed to load expenses:', err);
            if (err.message && err.message.includes('not found')) {
                setSheetMissing(true);
            }
            setToastMessage('Warning: Expenses sheet not found in Google Sheets.');
            setTimeout(() => setToastMessage(null), 5000);
        }
        
        setLoading(false);
    }

    const openAddModal = () => {
        setEditingId(null);
        setNewExpense({
            date: new Date().toISOString().split('T')[0],
            category: 'Printing',
            amount: '',
            description: ''
        });
        setIsModalOpen(true);
    };

    const openEditModal = (expense) => {
        setEditingId(expense.id);
        setNewExpense({
            date: expense.date,
            category: expense.category,
            amount: expense.amount,
            description: expense.description || ''
        });
        setIsModalOpen(true);
    };

    const handleSaveExpense = async (e) => {
        e.preventDefault();
        if (!newExpense.amount || !newExpense.category) return;
        
        setActionLoading(true);
        try {
            if (editingId) {
                const res = await apiCall('editExpense', { id: editingId, ...newExpense });
                if (res.success) {
                    setExpenses(expenses.map(exp => exp.id === editingId ? { id: editingId, ...newExpense } : exp));
                    setIsModalOpen(false);
                    setToastMessage('Expense updated successfully!');
                    setTimeout(() => setToastMessage(null), 3000);
                }
            } else {
                const res = await apiCall('addExpense', newExpense);
                if (res.success) {
                    setExpenses([{ ...newExpense, id: res.id }, ...expenses]);
                    setNewExpense({ date: new Date().toISOString().split('T')[0], amount: '', description: '', category: 'Printing' });
                    setIsModalOpen(false);
                    setToastMessage('Expense added successfully!');
                    setTimeout(() => setToastMessage(null), 3000);
                }
            }
        } catch (err) {
            console.error(err);
            setToastMessage(`Failed to ${editingId ? 'update' : 'add'} expense.`);
            setTimeout(() => setToastMessage(null), 3000);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteExpense = async (id) => {
        if (!window.confirm("Are you sure you want to delete this expense?")) return;
        
        setDeletingId(id);
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
            setDeletingId(null);
            setActionLoading(false);
        }
    };

    // --- Calculations ---
    const totalExpectedRevenue = orders.reduce((sum, o) => sum + (Number(o.price) || 0), 0);
    const totalQuantity = orders.reduce((sum, o) => sum + (Number(o.quantity) || 1), 0);
    
    // Separate income vs expenses from the ledger
    const totalIncomeDeposits = expenses.filter(e => e.category === 'Income (Bank Deposit)').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalCrafterPayout = expenses.filter(e => e.category === 'Crafter Payout').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalCustomExpenses = expenses.filter(e => e.category !== 'Income (Bank Deposit)' && e.category !== 'Crafter Payout').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    
    const totalExpenses = totalCrafterPayout + totalCustomExpenses;
    const bankBalance = totalIncomeDeposits - totalExpenses;
    const expectedProfit = totalExpectedRevenue - totalExpenses;

    // --- Animated Values ---
    const animatedBankBalance = useAnimatedNumber(Math.abs(bankBalance), 2000);
    const animatedOrdersAmount = useAnimatedNumber(totalExpectedRevenue, 2500);

    // --- Filtering ---
    const filteredExpenses = expenses.filter(expense => {
        if (filterCategory === 'All') return true;
        if (filterCategory === 'Income') return expense.category === 'Income (Bank Deposit)';
        if (filterCategory === 'Expenses') return expense.category !== 'Income (Bank Deposit)';
        return expense.category === filterCategory;
    });

    const generatePDF = () => {
        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(20);
        doc.text("Expense Ledger Report", 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
        
        // Table Data
        const tableColumn = ["Date", "Category", "Description", "Amount (Rs)"];
        const tableRows = [];
        
        expenses.forEach(expense => {
            const expenseData = [
                formatToDDMMYY(expense.date),
                expense.category,
                expense.description || '-',
                `${expense.category === 'Income (Bank Deposit)' ? '+' : '-'} Rs. ${Number(expense.amount).toLocaleString()}`
            ];
            tableRows.push(expenseData);
        });
        
        // Add Summary row at bottom
        tableRows.push(['', '', 'Total Expenses', `Rs. ${totalExpenses.toLocaleString()}`]);
        tableRows.push(['', '', 'Bank Balance (Profit)', `Rs. ${bankBalance.toLocaleString()}`]);

        doc.autoTable({
            startY: 40,
            head: [tableColumn],
            body: tableRows,
            theme: 'striped',
            headStyles: { fillColor: [17, 24, 39] },
            didParseCell: function(data) {
                // If it's the total row, make it bold
                if (data.row.index >= expenses.length) {
                    data.cell.styles.fontStyle = 'bold';
                    if (data.row.index === expenses.length + 1) {
                         data.cell.styles.textColor = [16, 185, 129]; // green for bank balance
                    }
                } else if (data.column.index === 3) {
                    if (expenses[data.row.index].category === 'Income (Bank Deposit)') {
                        data.cell.styles.textColor = [16, 185, 129]; // green
                    } else {
                        data.cell.styles.textColor = [239, 68, 68]; // red
                    }
                }
            }
        });
        
        doc.save(`Expense_Ledger_${new Date().toISOString().split('T')[0]}.pdf`);
        setToastMessage("PDF downloaded successfully!");
        setTimeout(() => setToastMessage(null), 3000);
    };


    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
                <p className="text-gray-500 text-sm font-medium">Loading financial data...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12 font-sans">
            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed top-6 right-6 bg-gray-900 text-white px-5 py-3.5 rounded-xl shadow-2xl z-50 flex items-center text-sm font-medium animate-bounce">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-3 animate-pulse"></div>
                    {toastMessage}
                </div>
            )}

            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-gray-100/50 mb-4">
                <div className="animate-reveal">
                    <div className="inline-flex items-center space-x-2 bg-indigo-50/80 backdrop-blur-md px-3 py-1 rounded-full mb-4 border border-indigo-100/50 shadow-sm">
                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Live Financials</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tighter drop-shadow-sm">Finance Center</h1>
                </div>
            </div>

            {/* Hero Metrics (Revenue & Balance) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                
                {/* Net Balance Hero - Ultra Premium Dark */}
                <div className="animate-reveal relative bg-gray-900 rounded-[2rem] border border-gray-800/80 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden group hover:shadow-[0_30px_60px_rgba(0,0,0,0.4)] transition-all duration-500 hover:-translate-y-1">
                    {/* Floating Orbs */}
                    <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-green-500/10 rounded-full blur-[80px] group-hover:bg-green-400/20 group-hover:scale-110 transition-all duration-700 animate-float pointer-events-none"></div>
                    <div className="absolute -right-20 -top-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-[80px] group-hover:bg-emerald-400/20 group-hover:scale-110 transition-all duration-700 animate-float pointer-events-none" style={{animationDelay: '2s'}}></div>
                    
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-3">
                                <div className="bg-gray-800/50 backdrop-blur-xl p-2 rounded-xl border border-gray-700/50">
                                    <IndianRupee size={20} className="text-green-400" />
                                </div>
                                <span className="font-extrabold tracking-widest uppercase text-xs text-green-300/80">Bank Balance (Profit)</span>
                            </div>
                        </div>
                        
                        <div>
                            <h3 className="text-5xl sm:text-7xl font-black tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-r from-green-300 via-emerald-300 to-teal-300 animate-gradient-x drop-shadow-2xl">
                                {bankBalance < 0 ? '-' : ''}₹{animatedBankBalance.toLocaleString()}
                            </h3>
                            
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center space-x-1.5">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Deposited:</span>
                                    <span className="text-sm font-bold text-white">₹{totalIncomeDeposits.toLocaleString()}</span>
                                </div>
                                <span className="text-gray-600 mx-1">•</span>
                                <div className="flex items-center space-x-1.5">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Exp:</span>
                                    <span className="text-sm font-bold text-white">₹{totalExpenses.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Gross Revenue Hero */}
                <div className="animate-reveal delay-100 relative bg-white/70 backdrop-blur-2xl rounded-[2rem] border border-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden group hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-500 hover:-translate-y-1">
                    <div className="absolute -right-20 -top-20 w-72 h-72 bg-gradient-to-br from-indigo-300/30 to-fuchsia-400/20 rounded-full blur-3xl opacity-80 group-hover:scale-110 transition-transform duration-700 animate-pulse-slow"></div>
                    <div className="relative z-10">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="bg-gradient-to-br from-indigo-400 to-fuchsia-500 p-2 rounded-xl shadow-lg shadow-indigo-200">
                                <ArrowUpRight size={20} className="text-white" />
                            </div>
                            <span className="font-extrabold tracking-widest uppercase text-xs text-gray-500">Orders Total Amount</span>
                        </div>
                        <h3 className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-gray-900 to-gray-600 tracking-tight mb-5 drop-shadow-sm">
                            ₹{animatedOrdersAmount.toLocaleString()}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 bg-white/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-gray-100 shadow-sm mt-2">
                            <div className="flex items-center space-x-1">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Orders:</span>
                                <span className="text-sm font-bold text-indigo-600">{orders.length}</span>
                            </div>
                            <span className="text-gray-300 mx-1">•</span>
                            <div className="flex items-center space-x-1">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Qty:</span>
                                <span className="text-sm font-bold text-fuchsia-600">{totalQuantity}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Expense Ledger List */}
            <div className="animate-reveal delay-200 mt-10">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 mb-6">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">Expense Ledger</h2>
                        <p className="text-sm text-gray-500 mt-1 font-medium">History of your manually recorded expenses.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <select 
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="bg-white border border-gray-200 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-black transition-all cursor-pointer"
                        >
                            <option value="All">All Records</option>
                            <option value="Income">Income Only</option>
                            <option value="Expenses">Expenses Only</option>
                            {categories.filter(c => c !== 'Income (Bank Deposit)').map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div className="text-[10px] font-black bg-gray-900 text-white px-3 py-1.5 rounded-full uppercase tracking-widest shadow-md inline-flex items-center w-fit">
                            {filteredExpenses.length} Records
                        </div>
                        {expenses.length > 0 && (
                            <button 
                                onClick={generatePDF}
                                className="flex items-center gap-1.5 text-xs font-bold bg-white text-gray-700 px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm transition-all group"
                            >
                                <Download size={14} className="group-hover:-translate-y-0.5 transition-transform" />
                                Download PDF
                            </button>
                        )}
                    </div>
                </div>
                
                {sheetMissing ? (
                    <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-10 text-center flex flex-col items-center">
                        <div className="h-20 w-20 bg-red-50 rounded-full flex items-center justify-center mb-5 border border-red-100 shadow-[0_0_30px_rgba(239,68,68,0.15)] animate-pulse">
                            <FileText size={32} className="text-red-500" />
                        </div>
                        <h3 className="text-xl font-black text-gray-900 mb-2">Setup Required: Missing Google Sheet</h3>
                        <div className="text-sm text-gray-600 max-w-md bg-gray-50/80 backdrop-blur-sm p-5 rounded-2xl border border-gray-200/60 shadow-inner">
                            <p className="mb-4 font-medium">To use the finance tracker, please open your Google Sheet and do the following:</p>
                            <ol className="text-left space-y-3 list-decimal list-inside font-bold text-gray-700">
                                <li className="pl-2">Click <strong className="text-black bg-white px-2 py-0.5 rounded shadow-sm border border-gray-200">+</strong> to create a new tab</li>
                                <li className="pl-2">Rename it exactly to: <strong className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">Expenses</strong></li>
                                <li className="pl-2">Add headers in Row 1: <strong className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 text-[10px] uppercase">ID, Date, Category, Amount, Description</strong></li>
                            </ol>
                        </div>
                    </div>
                ) : expenses.length === 0 ? (
                    <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-12 text-center flex flex-col items-center group">
                        <div className="h-20 w-20 bg-gray-50 rounded-[1.5rem] flex items-center justify-center mb-5 border border-gray-100 rotate-3 transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110 shadow-sm">
                            <FileText size={32} className="text-gray-300" />
                        </div>
                        <h3 className="text-xl font-black text-gray-900">No expenses recorded yet</h3>
                        <p className="text-sm text-gray-500 mt-2 mb-8 font-medium max-w-sm">Your ledger is completely empty. Start tracking your cash flow by recording your first transaction.</p>
                        <button 
                            onClick={openAddModal} 
                            className="text-sm font-bold bg-gray-900 text-white px-6 py-3 rounded-full shadow-[0_10px_20px_rgba(0,0,0,0.1)] hover:shadow-[0_15px_30px_rgba(0,0,0,0.2)] hover:-translate-y-1 transition-all duration-300"
                        >
                            Record First Entry
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3 pb-8">
                        {filteredExpenses.length === 0 ? (
                            <div className="text-center py-10 bg-white/50 backdrop-blur-sm rounded-2xl border border-dashed border-gray-200">
                                <p className="text-gray-500 font-medium">No records found for this filter.</p>
                            </div>
                        ) : (
                            filteredExpenses.map((expense, index) => (
                            <div 
                                key={expense.id} 
                                className="group bg-white/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-gray-100/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                                style={{animationDelay: `${index * 50}ms`}}
                            >
                                <div className={`absolute left-0 top-0 bottom-0 w-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${expense.category === 'Income (Bank Deposit)' ? 'bg-green-400' : 'bg-red-400'}`}></div>
                                <div className="flex items-center gap-4 sm:gap-6 pl-2">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-110 ${expense.category === 'Income (Bank Deposit)' ? 'bg-green-50 text-green-600 border border-green-100/50' : 'bg-red-50 text-red-500 border border-red-100/50'}`}>
                                        {expense.category === 'Income (Bank Deposit)' ? <TrendingUp size={22} strokeWidth={2.5} /> : <TrendingDown size={22} strokeWidth={2.5} />}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-gray-900 mb-1 flex items-center gap-2 flex-wrap">
                                            {expense.category}
                                            <span className="text-[9px] font-black text-gray-400 bg-gray-100/80 px-2 py-0.5 rounded-md uppercase tracking-widest">{formatToDDMMYY(expense.date)}</span>
                                        </h4>
                                        <p className="text-sm text-gray-500 font-medium line-clamp-1">{expense.description || <span className="italic opacity-50 font-normal">No description provided</span>}</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-50 mt-1 sm:mt-0 w-full sm:w-auto">
                                    <div className={`text-xl sm:text-2xl font-black tracking-tight ${expense.category === 'Income (Bank Deposit)' ? 'text-green-500' : 'text-red-500'}`}>
                                        {expense.category === 'Income (Bank Deposit)' ? '+' : '-'}₹{Number(expense.amount).toLocaleString()}
                                    </div>
                                    <button 
                                        onClick={() => openEditModal(expense)}
                                        disabled={actionLoading}
                                        className="w-9 h-9 rounded-full flex items-center justify-center text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-all duration-300 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 hover:scale-110 disabled:opacity-50 mr-2"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteExpense(expense.id)}
                                        disabled={actionLoading}
                                        className="w-9 h-9 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all duration-300 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 hover:scale-110 disabled:opacity-50"
                                    >
                                        {deletingId === expense.id ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                                        ) : (
                                            <Trash2 size={18} />
                                        )}
                                    </button>
                                </div>
                            </div>
                        )))}
                    </div>
                )}
            </div>

            {/* Floating Action Button */}
            <div className="fixed bottom-8 right-8 z-40 flex flex-col items-end animate-fade-in-up">
                <div className="absolute inset-0 bg-gray-900 rounded-full blur-xl opacity-20 animate-pulse-slow"></div>
                <button 
                    onClick={openAddModal} 
                    className="relative flex items-center justify-center gap-2 px-7 py-4 bg-gray-900 hover:bg-black text-white rounded-full shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] hover:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.6)] hover:-translate-y-1 transition-all duration-300 active:scale-95 group border border-gray-800"
                >
                    <Plus size={22} className="group-hover:rotate-90 transition-transform duration-500 text-white" />
                    <span className="font-bold text-sm tracking-wide">Record Expense</span>
                </button>
            </div>

            {/* Clean Minimalist Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
                    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)}></div>
                    
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col relative z-10 transform transition-all sm:my-8 animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {editingId ? 'Edit Record' : 'Record Expense'}
                            </h3>
                            <button 
                                onClick={() => setIsModalOpen(false)} 
                                className="text-gray-400 hover:text-gray-500 hover:bg-gray-100 p-1 rounded-md transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-6">
                            {(() => {
                                const isIncome = newExpense.category === 'Income (Bank Deposit)';
                                const focusClass = isIncome ? 'focus:border-green-500 focus:ring-green-500' : 'focus:border-red-500 focus:ring-red-500';
                                return (
                                <form onSubmit={handleSaveExpense} className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Date incurred</label>
                                        <input 
                                            type="date" 
                                            required 
                                            value={newExpense.date}
                                            onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                                            className={`w-full rounded-lg border-gray-300 shadow-sm sm:text-sm py-2 px-3 text-gray-900 transition-colors ${focusClass}`}
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                        <select 
                                            value={newExpense.category}
                                            onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                                            className={`w-full rounded-lg border-gray-300 shadow-sm sm:text-sm py-2 px-3 text-gray-900 transition-colors ${focusClass}`}
                                        >
                                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                                        <div className="relative mt-1 rounded-md shadow-sm">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                <span className="text-gray-500 sm:text-sm">₹</span>
                                            </div>
                                            <input 
                                                type="number" 
                                                min="1"
                                                required 
                                                placeholder="0"
                                                value={newExpense.amount}
                                                onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                                                className={`block w-full rounded-lg border-gray-300 pl-7 sm:text-sm py-2 px-3 text-gray-900 transition-colors ${focusClass}`}
                                            />
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400 font-normal">(Optional)</span></label>
                                        <input 
                                            type="text" 
                                            placeholder="e.g., Ink cartridges"
                                            value={newExpense.description}
                                            onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                                            className={`w-full rounded-lg border-gray-300 shadow-sm sm:text-sm py-2 px-3 text-gray-900 transition-colors ${focusClass}`}
                                        />
                                    </div>
                                    
                                    <div className="pt-2">
                                        <button 
                                            type="submit" 
                                            disabled={actionLoading}
                                            className={`w-full text-white font-medium py-2.5 px-4 rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm ${isIncome ? 'bg-green-600 hover:bg-green-700 focus:ring-green-600' : 'bg-red-600 hover:bg-red-700 focus:ring-red-600'}`}
                                        >
                                            {actionLoading ? (
                                                <span className="flex items-center"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div> Saving...</span>
                                            ) : (editingId ? 'Save Changes' : (isIncome ? 'Save Income Record' : 'Save Expense Record'))}
                                        </button>
                                    </div>
                                </form>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
