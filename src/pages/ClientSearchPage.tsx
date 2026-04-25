import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import Spinner from '../components/ui/Spinner';
import Banner from '../components/ui/Banner';
import { searchClients } from '../lib/api/cs';
import type { ClientSearchResult } from '../lib/types';
import { Search, User, Phone, Car } from 'lucide-react';

export default function ClientSearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ClientSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    try {
      setLoading(true);
      setHasSearched(true);
      const data = await searchClients(q.trim());
      setResults(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  return (
    <DashboardLayout title="Client Search">
      {error && (
        <Banner type="error" message={error} onDismiss={() => setError(null)} autoDismissMs={4000} />
      )}

      <div style={{ maxWidth: 700, margin: '40px auto 0' }}>
        <div className="search-bar-wrapper">
          <Search />
          <input
            className="search-bar"
            type="text"
            placeholder="Search by name, phone number, or license plate…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            id="client-search-input"
          />
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '32px auto 0' }}>
        {loading ? (
          <Spinner />
        ) : !hasSearched ? (
          <div className="empty-state">
            <Search />
            <h3>Find a Client</h3>
            <p>Search by name, phone number, or license plate</p>
          </div>
        ) : results.length === 0 ? (
          <div className="empty-state">
            <User />
            <h3>No clients found</h3>
            <p>Try a different search term.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {results.map((client) => (
              <div
                key={client.id}
                className="card"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/clients/${client.id}`)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: 'var(--color-gold-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <User size={20} color="var(--color-gold)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                      {client.full_name}
                    </div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <span className="card-meta-item">
                        <Phone size={12} />
                        {client.phone_number || '—'}
                      </span>
                      {(client.plates || []).map((plate) => (
                        <span key={plate} className="card-meta-item">
                          <Car size={12} />
                          {plate}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
