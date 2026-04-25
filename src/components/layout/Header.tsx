import { useAuth } from '../../contexts/AuthContext';
import { statusLabel } from '../../lib/helpers';

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const { fullName, role } = useAuth();

  return (
    <header className="header">
      <h1 className="header-title">{title}</h1>
      <div className="header-right">
        <span className="header-agent">{fullName || 'Agent'}</span>
        <span className="role-badge">{statusLabel(role)}</span>
      </div>
    </header>
  );
}
