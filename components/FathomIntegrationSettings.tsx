import React, { useState, useEffect } from 'react';
import { ClientProfile } from '../types';
import { dbService, ClientMeetingMapping, NotificationPreferences } from '../services/dbService';

interface FathomIntegrationSettingsProps {
  client: ClientProfile;
  onClose: () => void;
}

export const FathomIntegrationSettings: React.FC<FathomIntegrationSettingsProps> = ({ client, onClose }) => {
  const [mapping, setMapping] = useState<ClientMeetingMapping>({
    clientId: client.id,
    participantEmails: [],
    titlePattern: '',
    autoDetect: false,
  });

  const [notifications, setNotifications] = useState<NotificationPreferences>({
    clientId: client.id,
    podLeaderEmail: '',
    notifyOnNewTranscript: false,
    notifyOnAutoAnalysis: true,
    slackWebhookUrl: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailInput, setEmailInput] = useState('');

  useEffect(() => {
    loadSettings();
  }, [client.id]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const existingMapping = await dbService.getClientMapping(client.id);
      if (existingMapping) {
        setMapping(existingMapping);
      }

      const existingNotifs = await dbService.getNotificationPreferences(client.id);
      if (existingNotifs) {
        setNotifications(existingNotifs);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmail = () => {
    if (emailInput && !mapping.participantEmails?.includes(emailInput)) {
      setMapping({
        ...mapping,
        participantEmails: [...(mapping.participantEmails || []), emailInput],
      });
      setEmailInput('');
    }
  };

  const handleRemoveEmail = (email: string) => {
    setMapping({
      ...mapping,
      participantEmails: mapping.participantEmails?.filter(e => e !== email) || [],
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      console.log('Attempting to save mapping:', mapping);
      await dbService.setClientMapping(mapping);
      console.log('Mapping saved successfully');

      console.log('Attempting to save notifications:', notifications);
      await dbService.setNotificationPreferences(notifications);
      console.log('Notifications saved successfully');

      alert('Fathom integration settings saved successfully!');
      onClose();
    } catch (error: any) {
      console.error('Error saving settings:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      alert(`Failed to save settings: ${errorMessage}\n\nPlease check the browser console for more details.`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
          <p className="text-center text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Fathom Integration Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          Configure how Fathom meetings are automatically matched to <strong>{client.name}</strong>
        </p>

        {/* Meeting Mapping Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Meeting Mapping</h3>

          {/* Participant Emails */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Participant Emails
              <span className="text-gray-500 font-normal ml-2">
                (Meetings with these attendees will auto-match)
              </span>
            </label>

            <div className="flex gap-2 mb-2">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddEmail()}
                placeholder="client@example.com"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
              />
              <button
                onClick={handleAddEmail}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Add
              </button>
            </div>

            {mapping.participantEmails && mapping.participantEmails.length > 0 && (
              <div className="space-y-1">
                {mapping.participantEmails.map((email) => (
                  <div
                    key={email}
                    className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded"
                  >
                    <span className="text-sm text-gray-700">{email}</span>
                    <button
                      onClick={() => handleRemoveEmail(email)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Title Pattern */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Meeting Title Pattern (Regex)
              <span className="text-gray-500 font-normal ml-2">
                (Optional - match by meeting title)
              </span>
            </label>
            <input
              type="text"
              value={mapping.titlePattern || ''}
              onChange={(e) => setMapping({ ...mapping, titlePattern: e.target.value })}
              placeholder="e.g., Weekly Sync|Client Check-in"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
            />
            <p className="text-xs text-gray-500 mt-1">
              Example: "Weekly.*Client" matches "Weekly Client Sync" or "Weekly Client Review"
            </p>
          </div>

          {/* Auto-detect toggle */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoDetect"
              checked={mapping.autoDetect || false}
              onChange={(e) => setMapping({ ...mapping, autoDetect: e.target.checked })}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="autoDetect" className="ml-2 text-sm text-gray-700">
              Enable AI auto-detection (experimental)
            </label>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h3>

          {/* Pod Leader Email */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pod Leader Email
            </label>
            <input
              type="email"
              value={notifications.podLeaderEmail}
              onChange={(e) => setNotifications({ ...notifications, podLeaderEmail: e.target.value })}
              placeholder="pod.leader@adclass.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
            />
          </div>

          {/* Slack Webhook URL */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Slack Webhook URL (Optional)
            </label>
            <input
              type="url"
              value={notifications.slackWebhookUrl || ''}
              onChange={(e) => setNotifications({ ...notifications, slackWebhookUrl: e.target.value })}
              placeholder="https://hooks.slack.com/services/..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
            />
          </div>

          {/* Notification Toggles */}
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="notifyOnNewTranscript"
                checked={notifications.notifyOnNewTranscript || false}
                onChange={(e) =>
                  setNotifications({ ...notifications, notifyOnNewTranscript: e.target.checked })
                }
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="notifyOnNewTranscript" className="ml-2 text-sm text-gray-700">
                Notify when new transcript is added
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="notifyOnAutoAnalysis"
                checked={notifications.notifyOnAutoAnalysis !== false}
                onChange={(e) =>
                  setNotifications({ ...notifications, notifyOnAutoAnalysis: e.target.checked })
                }
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="notifyOnAutoAnalysis" className="ml-2 text-sm text-gray-700">
                Notify when auto-analysis is complete
              </label>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};
