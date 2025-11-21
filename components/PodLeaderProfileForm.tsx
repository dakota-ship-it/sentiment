import React, { useState, useEffect } from 'react';
import { PodLeaderProfile } from '../types';
import { dbService } from '../services/dbService';

interface PodLeaderProfileFormProps {
  userId: string;
  userEmail: string;
  userName: string;
  onClose: () => void;
  onSave?: () => void;
}

export const PodLeaderProfileForm: React.FC<PodLeaderProfileFormProps> = ({
  userId,
  userEmail,
  userName,
  onClose,
  onSave
}) => {
  const [profile, setProfile] = useState<PodLeaderProfile>({
    id: userId,
    name: userName,
    email: userEmail,
    pod: '',
    personalitySummary: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const existingProfile = await dbService.getPodLeaderProfile(userId);
      if (existingProfile) {
        setProfile(existingProfile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await dbService.savePodLeaderProfile(profile);
      alert('Profile saved successfully!');
      if (onSave) {
        onSave();
      }
      onClose();
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-3xl w-full mx-4">
          <p className="text-center text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Your Pod Leader Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>What this does:</strong> Your personality profile helps the AI identify blind spots you might have
            when analyzing client relationships. The analysis remains objective, but adds a personalized layer
            highlighting signals your personality type might naturally overlook.
          </p>
        </div>

        {/* Basic Info */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name
            </label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pod (Optional)
            </label>
            <select
              value={profile.pod || ''}
              onChange={(e) => setProfile({ ...profile, pod: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a pod...</option>
              <option value="The Peas">The Peas</option>
              <option value="Advengers">Advengers</option>
              <option value="Cakota">Cakota</option>
              <option value="PSTQ">PSTQ</option>
              <option value="Charland's Angels">Charland's Angels</option>
            </select>
          </div>
        </div>

        {/* Personality Summary */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Personality Summary</h3>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Personality Profile
              <span className="text-gray-500 font-normal ml-2">
                (Enneagram, MBTI, DISC, or any personality framework summary)
              </span>
            </label>
            <textarea
              value={profile.personalitySummary || ''}
              onChange={(e) => setProfile({ ...profile, personalitySummary: e.target.value })}
              placeholder="Paste your personality report here. Include your Enneagram type, MBTI, DISC profile, or any other personality assessment results. Be as detailed as you like - the AI will use this to identify what you might naturally miss in client interactions.

Example:
- Enneagram Type 8 (The Challenger)
- MBTI: ENTJ
- DISC: High D, High I
- Strengths: Direct communication, strategic thinking, decisive action
- Blind spots: May overlook emotional nuances, can be impatient with process, tendency to push forward without checking for buy-in"
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-2">
              💡 Tip: The more detailed your personality summary, the more precise the blind spot analysis will be.
              Include your known tendencies, strengths, and areas where you typically need to compensate.
            </p>
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
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  );
};
