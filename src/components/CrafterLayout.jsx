import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, PlusCircle, PackageSearch, DollarSign, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function CrafterLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Place Order', href: '/dashboard/new-order', icon: PlusCircle },
        { name: 'My Orders', href: '/dashboard/orders', icon: PackageSearch },
        { name: 'Earnings', href: '/dashboard/earnings', icon: DollarSign },
    ];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Mobile sidebar toggle */}
            <div className="md:hidden fixed top-0 left-0 w-full bg-white border-b border-gray-200 z-30 flex items-center justify-between p-4">
                <span className="text-xl font-bold tracking-tight text-blue-600">Tro Gifts</span>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 -mr-2 text-gray-500">
                    {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:w-64 bg-white border-r border-gray-200 z-20 transition-transform duration-200 ease-in-out flex flex-col`}>
                <div className="p-6 hidden md:block">
                    <span className="text-2xl font-extrabold tracking-tight text-blue-600">Tro Gifts</span>
                </div>

                <div className="px-6 py-4 md:pt-0">
                    <p className="text-sm font-medium text-gray-500">Welcome,</p>
                    <p className="text-gray-900 font-semibold truncate">{user?.name}</p>
                    <p className="text-xs text-green-600 font-medium mt-1">ID: {user?.referral_id}</p>
                </div>

                <nav className="flex-1 px-4 mt-6 space-y-1">
                    {navigation.map((item) => {
                        const isActive = location.pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                onClick={() => setIsSidebarOpen(false)}
                                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                                    }`}
                            >
                                <item.icon size={20} className={isActive ? 'text-blue-600' : 'text-gray-400'} />
                                <span>{item.name}</span>
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-gray-200">
                    <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 text-gray-700 hover:text-red-600 px-3 py-2.5 rounded-lg w-full transition-colors hover:bg-red-50"
                    >
                        <LogOut size={20} />
                        <span className="text-sm font-medium">Sign Out</span>
                    </button>
                </div>
            </div>

            {/* Mobile overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-gray-900/50 z-10 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full pt-16 md:pt-0 min-w-0">
                <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
