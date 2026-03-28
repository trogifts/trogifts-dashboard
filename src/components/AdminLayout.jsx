import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, Package, Settings, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function AdminLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const navigation = [
        { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { name: 'Orders', href: '/admin/orders', icon: Package },
        { name: 'Crafters', href: '/admin/crafters', icon: Users },
        { name: 'Settings', href: '/admin/settings', icon: Settings },
    ];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Mobile sidebar toggle */}
            <div className="md:hidden fixed top-0 left-0 w-full bg-slate-900 border-b border-slate-700 z-30 flex items-center justify-between p-4">
                <span className="text-xl font-bold tracking-tight text-white">Admin Panel</span>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 -mr-2 text-gray-300">
                    {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:w-64 bg-slate-900 text-white z-20 transition-transform duration-200 ease-in-out flex flex-col`}>
                <div className="p-6 hidden md:block">
                    <span className="text-2xl font-extrabold tracking-tight text-white">Tro Gifts</span>
                    <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Admin Panel</p>
                </div>

                <div className="px-6 py-4 md:pt-0">
                    <p className="text-sm text-slate-400">Welcome,</p>
                    <p className="text-white font-semibold truncate">{user?.name}</p>
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
                                        ? 'bg-blue-600 text-white'
                                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                    }`}
                            >
                                <item.icon size={20} className={isActive ? 'text-white' : 'text-slate-400'} />
                                <span>{item.name}</span>
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 text-slate-300 hover:text-red-400 px-3 py-2.5 rounded-lg w-full transition-colors hover:bg-slate-800"
                    >
                        <LogOut size={20} />
                        <span className="text-sm font-medium">Sign Out</span>
                    </button>
                </div>
            </div>

            {/* Mobile overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 z-10 md:hidden"
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
