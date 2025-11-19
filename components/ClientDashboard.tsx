import React, { useState, useEffect } from 'react';
import { ClientProfile } from '../types';
import { dbService } from '../services/dbService';

interface ClientDashboardProps {
  onSelectClient: (client: ClientProfile) => void;
  onAddClient: () => void;
  onEditClient: (client: ClientProfile) => void;
}

interface ClientWithSentiment extends ClientProfile {
  lastAnalysis?: {
    date: Date;
    churnRisk: string;
    confidence: number;
    trajectory: string;
  };
}

const PODS = ['The Peas', 'Advengers', 'Cakota', 'PSTQ', "Charland's Angels"];

export const ClientDashboard: React.FC<ClientDashboardProps> = ({
  onSelectClient,
  onAddClient,
  onEditClient,
}) => {
  const [clients, setClients] = useState<ClientWithSentiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClientSelector, setShowClientSelector] = useState(false);

  useEffect(() => {
    const loadClientsWithSentiment = async () => {
      try {
        console.log("Loading all clients for organization");
        const clientData = await dbService.getClients();

        // Load latest analysis for each client
        const clientsWithSentiment = await Promise.all(
          clientData.map(async (client) => {
            try {
              const history = await dbService.getAnalysisHistory(client.id);
              if (history.length > 0) {
                const latest = history[0];
                return {
                  ...client,
                  lastAnalysis: {
                    date: latest.date.toDate(),
                    churnRisk: latest.result.bottomLine.churnRisk,
                    confidence: latest.result.bottomLine.clientConfidence,
                    trajectory: latest.result.bottomLine.trajectory,
                  }
                };
              }
              return client;
            } catch (error) {
              console.error(`Failed to load analysis for ${client.name}`, error);
              return client;
            }
          })
        );

        setClients(clientsWithSentiment);
      } catch (error) {
        console.error("Failed to load clients", error);
      }
      setLoading(false);
    };
    loadClientsWithSentiment();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this client profile?')) {
      // TODO: Implement delete in dbService
      const updatedClients = clients.filter(c => c.id !== id);
      setClients(updatedClients);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'High': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'Immediate': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-brand-muted/20 text-brand-muted border-brand-muted/30';
    }
  };

  const getTrajectoryIcon = (trajectory: string) => {
    switch (trajectory) {
      case 'Strengthening': return '↗';
      case 'Stable': return '→';
      case 'Declining': return '↘';
      case 'Critical': return '⚠';
      default: return '—';
    }
  };

  const groupedClients = PODS.reduce((acc, pod) => {
    acc[pod] = clients.filter(c => c.pod === pod);
    return acc;
  }, {} as Record<string, ClientWithSentiment[]>);

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
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
          <p className="text-brand-muted">Overview of all client relationships and sentiment analysis</p>
        </div>
        <div className="flex gap-4 mt-4 md:mt-0">
          <button
            onClick={() => setShowClientSelector(true)}
            className="px-6 py-3 bg-brand-cyan hover:bg-brand-cyan/80 text-brand-dark font-bold rounded-lg transition-all shadow-lg shadow-brand-cyan/20 flex items-center gap-2"
          >
            <span>⚡</span> Begin New Sentiment Analysis
          </button>
        </div>
      </div>

      {/* Client Selector Modal */}
      {showClientSelector && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-brand-surface border border-brand-muted rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Select Client to Analyze</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {clients.map(client => (
                <button
                  key={client.id}
                  onClick={() => {
                    setShowClientSelector(false);
                    onSelectClient(client);
                  }}
                  className="w-full text-left p-3 rounded-lg bg-brand-dark hover:bg-brand-dark/50 border border-brand-muted hover:border-brand-cyan transition-all"
                >
                  <div className="font-medium text-white">{client.name}</div>
                  <div className="text-xs text-brand-muted">{client.pod}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowClientSelector(false)}
              className="mt-4 w-full py-2 text-brand-muted hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Pod Groups */}
      {PODS.map(pod => {
        const podClients = groupedClients[pod];
        if (podClients.length === 0) return null;

        return (
          <div key={pod} className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-brand-cyan">●</span> {pod}
              <span className="text-sm text-brand-muted font-normal">({podClients.length})</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {podClients.map(client => (
                <div
                  key={client.id}
                  onClick={() => onSelectClient(client)}
                  className="group bg-brand-surface border border-brand-muted rounded-xl p-5 cursor-pointer hover:border-brand-cyan/50 hover:bg-brand-surface/80 transition-all relative overflow-hidden shadow-lg shadow-black/20"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-brand-muted group-hover:bg-brand-cyan transition-colors"></div>

                  {/* Client Name */}
                  <div className="pl-3 mb-3">
                    <h3 className="text-lg font-bold text-white truncate">{client.name}</h3>
                    <div className="flex gap-2 text-xs text-brand-muted mt-1">
                      <span>{client.monthlySpend}</span>
                      <span>•</span>
                      <span>{client.duration}</span>
                    </div>
                  </div>

                  {/* Sentiment Indicators */}
                  {client.lastAnalysis ? (
                    <div className="pl-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-brand-muted">Churn Risk</span>
                        <span className={`px-2 py-1 rounded text-xs font-bold border ${getRiskColor(client.lastAnalysis.churnRisk)}`}>
                          {client.lastAnalysis.churnRisk}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-brand-muted">Confidence</span>
                        <span className="text-sm font-bold text-white">
                          {client.lastAnalysis.confidence}/10
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-brand-muted">Trajectory</span>
                        <span className="text-sm text-brand-cyan font-medium flex items-center gap-1">
                          <span>{getTrajectoryIcon(client.lastAnalysis.trajectory)}</span>
                          {client.lastAnalysis.trajectory}
                        </span>
                      </div>

                      <div className="text-xs text-brand-muted/70 pt-2 border-t border-brand-muted/30">
                        Last analyzed {new Date(client.lastAnalysis.date).toLocaleDateString()}
                      </div>
                    </div>
                  ) : (
                    <div className="pl-3 py-4 text-center">
                      <span className="text-sm text-brand-muted italic">No analysis yet</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pl-3 mt-4 pt-3 border-t border-brand-muted/30 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs font-bold text-brand-cyan uppercase tracking-wider">View Analysis</span>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); onEditClient(client); }}
                        className="p-1 hover:bg-brand-dark rounded text-brand-muted hover:text-white text-sm"
                        title="Edit"
                      >
                        ✎
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, client.id)}
                        className="p-1 hover:bg-red-900/30 rounded text-brand-muted hover:text-red-400 text-sm"
                        title="Delete"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {clients.length === 0 && (
        <div className="text-center py-20 bg-brand-surface/50 rounded-2xl border border-brand-muted border-dashed">
          <div className="w-16 h-16 bg-brand-surface rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-muted">
            <span className="text-3xl text-brand-muted">+</span>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No Clients Yet</h3>
          <p className="text-brand-muted mb-6 max-w-md mx-auto">Create your first client profile to start tracking relationship health.</p>
          <button
            onClick={onAddClient}
            className="text-brand-cyan hover:text-white font-medium underline transition-colors"
          >
            Create Client Profile
          </button>
        </div>
      )}
    </div>
  );
};
