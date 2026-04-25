import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  AlertCircle,
  MessageSquare,
  Send,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { path: '/queue', label: 'Queue', icon: LayoutDashboard },
  { path: '/clients', label: 'Client Search', icon: Search },
  { path: '/complaints', label: 'Complaints', icon: AlertCircle },
  { path: '/tickets', label: 'Support Tickets', icon: MessageSquare },
  { path: '/operational-requests', label: 'Operational Requests', icon: Send },
];

export default function Sidebar() {
  const { fullName, signOut } = useAuth();
  const location = useLocation();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h1>Enaya CS</h1>
        <span>Customer Service</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={() => {
              const isActive =
                location.pathname === path ||
                location.pathname.startsWith(path + '/');
              return `sidebar-nav-item ${isActive ? 'active' : ''}`;
            }}
          >
            <Icon />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="agent-name">{fullName || 'Agent'}</div>
        <button className="sign-out-btn" onClick={signOut}>
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
