import React, { useState, useEffect } from 'react';
import { ClientProfile } from '../types';
import { clientService } from '../services/clientService';
import { dbService } from '../services/dbService';
import { auth } from '../services/firebase';

interface ClientDashboardProps {
  onSelectClient: (client: ClientProfile) => void;
  onAddClient: () => void;
  onEditClient: (client: ClientProfile) => void;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({
  onSelectClient,
  onAddClient,
  onEditClient,
}) => {
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadClients = async () => {
      try {
        console.log("Loading all clients for organization");
        const data = await dbService.getClients();
        console.log("Loaded clients:", data);
        setClients(data);
      } catch (error) {
        console.error("Failed to load clients", error);
      }
      setLoading(false);
    };
    loadClients();
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this client profile?')) {
      clientService.deleteClient(id);
      setClients(clientService.getClients());
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 pb-6 border-b border-brand-muted">
        <div>
          <div className="mb-4">
            <div className="text-2xl font-bold tracking-tighter font-sans text-white flex items-center gap-1">
              ADCLASS <span className="text-brand-cyan">.</span>
            </div>
          </div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-white">Client Portfolio</h1>
            <span className="px-3 py-1 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan text-xs font-bold uppercase tracking-wider">
              Sentiment AI
            </span>
          </div>
          <p className="text-brand-muted">Select a client to begin analysis or manage your portfolio.</p>
        </div>
        <div className="flex gap-4 mt-4 md:mt-0">
          <button
            onClick={onAddClient}
            className="px-6 py-2 bg-brand-cyan hover:bg-brand-cyan/80 text-brand-dark font-bold rounded-lg transition-all shadow-lg shadow-brand-cyan/20 flex items-center gap-2"
          >
            <span>+</span> Add New Client
          </button>
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="text-center py-20 bg-brand-surface/50 rounded-2xl border border-brand-muted border-dashed">
          <div className="w-16 h-16 bg-brand-surface rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-muted">
            <span className="text-3xl text-brand-muted">+</span>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No Clients Yet</h3>
          <p className="text-brand-muted mb-6 max-w-md mx-auto">Create your first client profile to start tracking relationship health and analyzing meeting transcripts.</p>
          <button
            onClick={onAddClient}
            className="text-brand-cyan hover:text-white font-medium underline transition-colors"
          >
            Create Client Profile
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map(client => (
            <div
              key={client.id}
              onClick={() => onSelectClient(client)}
              className="group bg-brand-surface border border-brand-muted rounded-xl p-6 cursor-pointer hover:border-brand-cyan/50 hover:bg-brand-surface/80 transition-all relative overflow-hidden shadow-lg shadow-black/20"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-brand-muted group-hover:bg-brand-cyan transition-colors"></div>

              <div className="flex justify-between items-start mb-4 pl-2">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-brand-cyan mb-1">
                    {client.pod || 'Unassigned Pod'}
                  </div>
                  <h3 className="text-xl font-bold text-white truncate pr-2">{client.name}</h3>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); onEditClient(client); }}
                    className="p-2 hover:bg-brand-dark rounded text-brand-muted hover:text-white"
                    title="Edit"
                  >
                    ✎
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, client.id)}
                    className="p-2 hover:bg-red-900/30 rounded text-brand-muted hover:text-red-400"
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="space-y-2 pl-2 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-brand-muted">Avg. Spend</span>
                  <span className="text-brand-white font-mono">{client.monthlySpend}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-brand-muted">Tenure</span>
                  <span className="text-brand-white">{client.duration}</span>
                </div>
              </div>

              <div className="pl-2 mt-4 pt-4 border-t border-brand-muted/30 flex justify-between items-center">
                <span className="text-xs font-bold text-brand-cyan/80 uppercase tracking-wider group-hover:text-brand-cyan">Analyze Relationship</span>
                <span className="text-brand-muted group-hover:text-brand-cyan transition-colors">→</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
