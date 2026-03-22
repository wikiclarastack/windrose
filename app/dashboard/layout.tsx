import Link from 'next/link';
import { LayoutDashboard, TrendingUp, Gamepad, Users, Settings, LogOut } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-950 text-white font-sans overflow-hidden">
      {/* Sidebar Fixa */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col justify-between">
        <div>
          <div className="p-6">
            <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
              Wind Rose Studios
            </h2>
          </div>
          
          <nav className="mt-6 px-4 space-y-2">
            <SidebarLink href="/dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" />
            <SidebarLink href="/dashboard/investments" icon={<TrendingUp size={20} />} label="Investimentos" />
            <SidebarLink href="/dashboard/updates" icon={<Gamepad size={20} />} label="Atualizações" />
            <SidebarLink href="/dashboard/team" icon={<Users size={20} />} label="Equipe" />
            <SidebarLink href="/dashboard/admin" icon={<Settings size={20} />} label="Administração" />
          </nav>
        </div>

        <div className="p-4 border-t border-gray-800">
          <button className="flex items-center gap-3 text-gray-400 hover:text-red-400 transition-colors w-full p-2 rounded-lg hover:bg-gray-800">
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Área Principal */}
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}

function SidebarLink({ href, icon, label }: { href: string, icon: React.ReactNode, label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 text-gray-300 hover:text-white hover:bg-gray-800 px-4 py-3 rounded-xl transition-all">
      {icon}
      <span className="font-medium">{label}</span>
    </Link>
  );
}
