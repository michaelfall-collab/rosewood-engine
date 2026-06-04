"use client";
import React, { useState, useEffect } from 'react';

export default function CapabilitiesEditor({ onClose }: { onClose: () => void }) {
  const [config, setConfig] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/config/pipedrive')
      .then(res => res.json())
      .then(data => {
        setConfig(JSON.stringify(data, null, 2));
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load configuration.');
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const parsedConfig = JSON.parse(config);
      const res = await fetch('/api/config/pipedrive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedConfig),
      });
      if (!res.ok) throw new Error('Failed to save');
      onClose();
    } catch (e) {
      setError('Invalid JSON or save failed.');
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-lg w-full max-w-2xl h-[80vh] flex flex-col">
        <h2 className="text-xl font-bold mb-4">Manage Capabilities</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <textarea
          className="flex-grow p-2 border border-gray-300 rounded mb-4 font-mono text-sm"
          value={config}
          onChange={(e) => setConfig(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
        </div>
      </div>
    </div>
  );
}
