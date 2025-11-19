import { ClientProfile } from '../types';

const CLIENTS_KEY = 'cw_clients';

export const clientService = {
  getClients: (): ClientProfile[] => {
    const stored = localStorage.getItem(CLIENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  saveClient: (client: ClientProfile): void => {
    const clients = clientService.getClients();
    const existingIndex = clients.findIndex(c => c.id === client.id);
    
    if (existingIndex >= 0) {
      clients[existingIndex] = client;
    } else {
      clients.push(client);
    }
    
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
  },

  deleteClient: (id: string): void => {
    const clients = clientService.getClients().filter(c => c.id !== id);
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
  },

  createClient: (data: Omit<ClientProfile, 'id' | 'createdAt'>): ClientProfile => {
    const newClient: ClientProfile = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: Date.now()
    };
    clientService.saveClient(newClient);
    return newClient;
  }
};
