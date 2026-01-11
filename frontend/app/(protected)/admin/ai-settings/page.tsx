'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bot,
  Key,
  Settings,
  Check,
  X,
  AlertCircle,
  Loader2,
  Save,
  TestTube,
  ArrowUpDown,
  Zap,
  DollarSign,
  Activity,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Clock,
  Coins,
  TrendingUp,
  Hash,
} from 'lucide-react';

// ============================================================
// INTERFACES
// ============================================================

interface AIProvider {
  id: string;
  provider_code: string;
  provider_name: string;
  api_key_configured: boolean;
  api_endpoint: string | null;
  default_model: string | null;
  available_models: string[];
  is_enabled: boolean;
  is_configured: boolean;
  max_requests_per_minute: number;
  max_tokens_per_request: number;
  cost_per_1m_input_tokens: number;
  cost_per_1m_output_tokens: number;
}

interface AIFeature {
  id: string;
  feature_code: string;
  feature_name: string;
  description: string | null;
  module_code: string | null;
  provider_priority: string[];
  preferred_model: string | null;
  max_retries: number;
  timeout_seconds: number;
  fallback_enabled: boolean;
  is_enabled: boolean;
}

interface AIUsageTotals {
  total_requests: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  total_cost_usd: number;
  avg_latency_ms: number;
  success_rate: number;
}

interface AIUsageStat {
  provider_code: string;
  feature_code: string;
  total_requests: number;
  total_tokens: number;
  total_cost: number;
  success_rate: number;
  avg_latency_ms: number;
}

// ============================================================
// CONSTANTS
// ============================================================

const PROVIDER_COLORS: Record<string, string> = {
  claude: 'bg-orange-50 border-orange-300 text-orange-700',
  gemini: 'bg-blue-50 border-blue-300 text-blue-700',
  openai: 'bg-emerald-50 border-emerald-300 text-emerald-700',
  deepseek: 'bg-cyan-50 border-cyan-300 text-cyan-700',
  qwen: 'bg-purple-50 border-purple-300 text-purple-700',
  mistral: 'bg-indigo-50 border-indigo-300 text-indigo-700',
  groq: 'bg-amber-50 border-amber-300 text-amber-700',
  cohere: 'bg-rose-50 border-rose-300 text-rose-700',
  xai: 'bg-slate-50 border-slate-300 text-slate-700',
  perplexity: 'bg-teal-50 border-teal-300 text-teal-700',
  together: 'bg-fuchsia-50 border-fuchsia-300 text-fuchsia-700',
  openrouter: 'bg-violet-50 border-violet-300 text-violet-700',
};

const MODULE_NAMES: Record<string, string> = {
  fms: 'FMS',
  tms: 'TMS',
  wms: 'WMS',
  hrm: 'HRM',
  crm: 'CRM',
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function AISettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [features, setFeatures] = useState<AIFeature[]>([]);

  // Usage stats
  const [usageTotals, setUsageTotals] = useState<AIUsageTotals | null>(null);
  const [usageStats, setUsageStats] = useState<AIUsageStat[]>([]);
  const [usageDays, setUsageDays] = useState(30);

  // Edit states
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({});
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});

  // Show/hide unconfigured providers
  const [showAllProviders, setShowAllProviders] = useState(false);

  // Feature editing
  const [editingFeature, setEditingFeature] = useState<string | null>(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    return {
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    };
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [providersRes, featuresRes, totalsRes, statsRes] = await Promise.all([
        fetch('/api/v1/ai-config/providers', { headers: getAuthHeaders() }),
        fetch('/api/v1/ai-config/features', { headers: getAuthHeaders() }),
        fetch(`/api/v1/ai-config/usage/totals?days=${usageDays}`, { headers: getAuthHeaders() }),
        fetch(`/api/v1/ai-config/usage/stats?days=${usageDays}`, { headers: getAuthHeaders() }),
      ]);

      if (providersRes.ok) {
        const data = await providersRes.json();
        setProviders(data);
      }

      if (featuresRes.ok) {
        const data = await featuresRes.json();
        setFeatures(data);
      }

      if (totalsRes.ok) {
        const data = await totalsRes.json();
        setUsageTotals(data);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setUsageStats(data);
      }
    } catch (err) {
      setError('Failed to load AI configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProvider = async (providerCode: string) => {
    setSaving(providerCode);
    setError(null);
    setSuccess(null);

    const provider = providers.find((p) => p.provider_code === providerCode);
    if (!provider) return;

    try {
      const response = await fetch(`/api/v1/ai-config/providers/${providerCode}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          api_key: apiKeyInputs[providerCode] || undefined,
          is_enabled: provider.is_enabled,
          default_model: provider.default_model,
        }),
      });

      if (response.ok) {
        setSuccess(`${provider.provider_name} updated successfully`);
        setEditingProvider(null);
        setApiKeyInputs((prev) => ({ ...prev, [providerCode]: '' }));
        loadData();
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to save');
      }
    } catch (err) {
      setError('Failed to save provider settings');
    } finally {
      setSaving(null);
    }
  };

  const handleTestProvider = async (providerCode: string) => {
    setTesting(providerCode);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/v1/ai-config/providers/${providerCode}/test`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      const data = await response.json();
      if (data.status === 'success') {
        setSuccess(data.message);
      } else {
        setError(data.message || 'Test failed');
      }
    } catch (err) {
      setError('Failed to test provider');
    } finally {
      setTesting(null);
    }
  };

  const handleToggleProvider = async (providerCode: string, enabled: boolean) => {
    setProviders((prev) =>
      prev.map((p) => (p.provider_code === providerCode ? { ...p, is_enabled: enabled } : p))
    );

    try {
      await fetch(`/api/v1/ai-config/providers/${providerCode}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ is_enabled: enabled }),
      });
    } catch (err) {
      // Revert on error
      setProviders((prev) =>
        prev.map((p) => (p.provider_code === providerCode ? { ...p, is_enabled: !enabled } : p))
      );
    }
  };

  const handleUpdateFeaturePriority = async (featureCode: string, priority: string[]) => {
    try {
      await fetch(`/api/v1/ai-config/features/${featureCode}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ provider_priority: priority }),
      });

      setFeatures((prev) =>
        prev.map((f) => (f.feature_code === featureCode ? { ...f, provider_priority: priority } : f))
      );
    } catch (err) {
      setError('Failed to update feature priority');
    }
  };

  const handleToggleFeature = async (featureCode: string, enabled: boolean) => {
    setFeatures((prev) =>
      prev.map((f) => (f.feature_code === featureCode ? { ...f, is_enabled: enabled } : f))
    );

    try {
      await fetch(`/api/v1/ai-config/features/${featureCode}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ is_enabled: enabled }),
      });
    } catch (err) {
      setFeatures((prev) =>
        prev.map((f) => (f.feature_code === featureCode ? { ...f, is_enabled: !enabled } : f))
      );
    }
  };

  const seedFeatures = async () => {
    setSaving('features');
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/v1/ai-config/features/seed', {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(data.message);
        loadData();
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to seed features');
      }
    } catch (err) {
      setError('Failed to seed AI features');
    } finally {
      setSaving(null);
    }
  };

  const movePriority = (featureCode: string, providerCode: string, direction: 'up' | 'down') => {
    const feature = features.find((f) => f.feature_code === featureCode);
    if (!feature) return;

    const priority = [...feature.provider_priority];
    const idx = priority.indexOf(providerCode);
    if (idx === -1) return;

    if (direction === 'up' && idx > 0) {
      [priority[idx - 1], priority[idx]] = [priority[idx], priority[idx - 1]];
    } else if (direction === 'down' && idx < priority.length - 1) {
      [priority[idx], priority[idx + 1]] = [priority[idx + 1], priority[idx]];
    }

    handleUpdateFeaturePriority(featureCode, priority);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Separate configured and unconfigured providers
  const configuredProviders = providers.filter(p => p.is_configured);
  const unconfiguredProviders = providers.filter(p => !p.is_configured);

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Bot className="h-6 w-6 text-purple-600" />
            AI Configuration
          </h1>
          <p className="text-sm text-gray-500">Manage AI providers and features</p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2.5 flex items-center gap-2 text-sm">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <span className="text-red-700 flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 border border-green-200 px-4 py-2.5 flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
          <span className="text-green-700 flex-1">{success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* AI Providers Section */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-gray-500" />
            <h2 className="text-base font-semibold">AI Providers</h2>
            <span className="text-sm text-gray-400">
              ({configuredProviders.length} configured, {unconfiguredProviders.length} available)
            </span>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* Configured Providers */}
          {configuredProviders.map((provider) => (
            <div
              key={provider.provider_code}
              className={`rounded-lg border p-3 transition-all ${
                provider.is_enabled ? 'border-green-300 bg-green-50/50' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  {/* Provider Name */}
                  <div className={`px-2.5 py-1 rounded border text-sm font-medium ${PROVIDER_COLORS[provider.provider_code] || 'bg-gray-100 border-gray-200'}`}>
                    {provider.provider_name}
                  </div>

                  {/* Status */}
                  <span className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-700 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Ready
                  </span>

                  {provider.is_enabled && (
                    <span className="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-700 flex items-center gap-1">
                      <Zap className="h-3 w-3" /> Active
                    </span>
                  )}

                  {/* Cost */}
                  <span className="text-xs text-gray-400 hidden sm:inline">
                    ${provider.cost_per_1m_input_tokens}/${provider.cost_per_1m_output_tokens} per 1M
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Toggle */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={provider.is_enabled}
                      onChange={(e) => handleToggleProvider(provider.provider_code, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                  </label>

                  {/* Test */}
                  <button
                    onClick={() => handleTestProvider(provider.provider_code)}
                    disabled={testing === provider.provider_code}
                    className="p-2 text-sm rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-50"
                    title="Test connection"
                  >
                    {testing === provider.provider_code ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <TestTube className="h-4 w-4" />
                    )}
                  </button>

                  {/* Configure */}
                  <button
                    onClick={() => setEditingProvider(editingProvider === provider.provider_code ? null : provider.provider_code)}
                    className={`p-2 text-sm rounded border ${editingProvider === provider.provider_code ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:bg-gray-100'}`}
                    title="Configure"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Expanded Config */}
              {editingProvider === provider.provider_code && (
                <div className="mt-3 pt-3 border-t border-dashed space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        API Key {provider.is_configured && '(leave empty to keep)'}
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKey[provider.provider_code] ? 'text' : 'password'}
                          value={apiKeyInputs[provider.provider_code] || ''}
                          onChange={(e) => setApiKeyInputs((prev) => ({ ...prev, [provider.provider_code]: e.target.value }))}
                          placeholder="••••••••"
                          className="w-full px-3 py-1.5 text-sm border rounded pr-8"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey((prev) => ({ ...prev, [provider.provider_code]: !prev[provider.provider_code] }))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                          {showApiKey[provider.provider_code] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Model</label>
                      <select
                        value={provider.default_model || ''}
                        onChange={(e) => {
                          setProviders((prev) =>
                            prev.map((p) => p.provider_code === provider.provider_code ? { ...p, default_model: e.target.value } : p)
                          );
                        }}
                        className="w-full px-3 py-1.5 text-sm border rounded"
                      >
                        {provider.available_models.map((model) => (
                          <option key={model} value={model}>{model}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleSaveProvider(provider.provider_code)}
                      disabled={saving === provider.provider_code}
                      className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {saving === provider.provider_code ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Unconfigured Providers (Collapsible) */}
          {unconfiguredProviders.length > 0 && (
            <div className="border-t pt-3 mt-3">
              <button
                onClick={() => setShowAllProviders(!showAllProviders)}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3"
              >
                {showAllProviders ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showAllProviders ? 'Hide' : 'Show'} {unconfiguredProviders.length} more providers
              </button>

              {showAllProviders && (
                <div className="space-y-3">
                  {unconfiguredProviders.map((provider) => (
                    <div
                      key={provider.provider_code}
                      className="rounded-lg border border-dashed border-gray-200 p-3 bg-gray-50/50"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <div className={`px-2.5 py-1 rounded border text-sm font-medium opacity-70 ${PROVIDER_COLORS[provider.provider_code] || 'bg-gray-100 border-gray-200'}`}>
                            {provider.provider_name}
                          </div>
                          <span className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-500">
                            Not configured
                          </span>
                          <span className="text-xs text-gray-400 hidden sm:inline">
                            ${provider.cost_per_1m_input_tokens}/${provider.cost_per_1m_output_tokens} per 1M
                          </span>
                        </div>
                        <button
                          onClick={() => setEditingProvider(editingProvider === provider.provider_code ? null : provider.provider_code)}
                          className={`px-3 py-1.5 text-sm rounded border ${editingProvider === provider.provider_code ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-100'}`}
                        >
                          Configure
                        </button>
                      </div>

                      {/* Expanded Config for unconfigured */}
                      {editingProvider === provider.provider_code && (
                        <div className="mt-3 pt-3 border-t border-dashed space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">API Key</label>
                              <div className="relative">
                                <input
                                  type={showApiKey[provider.provider_code] ? 'text' : 'password'}
                                  value={apiKeyInputs[provider.provider_code] || ''}
                                  onChange={(e) => setApiKeyInputs((prev) => ({ ...prev, [provider.provider_code]: e.target.value }))}
                                  placeholder="Enter API key"
                                  className="w-full px-3 py-1.5 text-sm border rounded pr-8"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowApiKey((prev) => ({ ...prev, [provider.provider_code]: !prev[provider.provider_code] }))}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                                >
                                  {showApiKey[provider.provider_code] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Model</label>
                              <select
                                value={provider.default_model || ''}
                                onChange={(e) => {
                                  setProviders((prev) =>
                                    prev.map((p) => p.provider_code === provider.provider_code ? { ...p, default_model: e.target.value } : p)
                                  );
                                }}
                                className="w-full px-3 py-1.5 text-sm border rounded"
                              >
                                {provider.available_models.map((model) => (
                                  <option key={model} value={model}>{model}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <button
                              onClick={() => handleSaveProvider(provider.provider_code)}
                              disabled={saving === provider.provider_code}
                              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-1.5"
                            >
                              {saving === provider.provider_code ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                              Save
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* AI Features Section */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-gray-500" />
            <h2 className="text-base font-semibold">AI Features & Priority</h2>
            <span className="text-xs text-gray-400">({features.length} features)</span>
          </div>
          <button
            onClick={seedFeatures}
            disabled={saving === 'features'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md border border-blue-200 disabled:opacity-50"
          >
            {saving === 'features' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}
            Sync Features
          </button>
        </div>

        <div className="p-4">
          <div className="space-y-3">
            {features.map((feature) => (
              <div key={feature.feature_code} className="flex items-center gap-4 py-2.5 border-b last:border-b-0">
                {/* Feature Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{feature.feature_name}</span>
                    {feature.module_code && (
                      <span className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-500">
                        {MODULE_NAMES[feature.module_code] || feature.module_code}
                      </span>
                    )}
                  </div>
                  {feature.description && (
                    <p className="text-xs text-gray-400 truncate">{feature.description}</p>
                  )}
                </div>

                {/* Priority */}
                <div className="flex items-center gap-1.5">
                  {feature.provider_priority.slice(0, 3).map((providerCode, idx) => {
                    const provider = providers.find((p) => p.provider_code === providerCode);
                    const isActive = provider?.is_enabled && provider?.is_configured;
                    return (
                      <div
                        key={providerCode}
                        className={`flex items-center gap-1 px-2 py-1 rounded border text-xs ${
                          isActive ? PROVIDER_COLORS[providerCode] || 'bg-gray-50' : 'bg-gray-50 border-gray-200 text-gray-400'
                        }`}
                      >
                        <span className="font-bold text-gray-400">#{idx + 1}</span>
                        <span className="font-medium">{providerCode}</span>
                        <div className="flex flex-col -my-0.5">
                          <button
                            onClick={() => movePriority(feature.feature_code, providerCode, 'up')}
                            disabled={idx === 0}
                            className="text-gray-400 hover:text-gray-600 disabled:opacity-30 leading-none"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => movePriority(feature.feature_code, providerCode, 'down')}
                            disabled={idx === feature.provider_priority.length - 1}
                            className="text-gray-400 hover:text-gray-600 disabled:opacity-30 leading-none"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {feature.provider_priority.length > 3 && (
                    <span className="text-xs text-gray-400">+{feature.provider_priority.length - 3}</span>
                  )}
                </div>

                {/* Toggle */}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={feature.is_enabled}
                    onChange={(e) => handleToggleFeature(feature.feature_code, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Usage Section */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-gray-500" />
            <h2 className="text-base font-semibold">AI Usage</h2>
            <span className="text-sm text-gray-400">Last {usageDays} days</span>
          </div>
          <select
            value={usageDays}
            onChange={(e) => {
              setUsageDays(Number(e.target.value));
              // Reload data when days change
              setTimeout(() => loadData(), 100);
            }}
            className="px-2 py-1 text-sm border rounded"
          >
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
        </div>

        <div className="p-4">
          {/* Summary Cards */}
          {usageTotals && (
            <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                <div className="flex items-center gap-2 text-purple-600 mb-1">
                  <Hash className="h-4 w-4" />
                  <span className="text-xs font-medium">Total Requests</span>
                </div>
                <div className="text-xl font-bold text-purple-700">
                  {usageTotals.total_requests.toLocaleString()}
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <Activity className="h-4 w-4" />
                  <span className="text-xs font-medium">Total Tokens</span>
                </div>
                <div className="text-xl font-bold text-blue-700">
                  {(usageTotals.total_tokens / 1000).toFixed(1)}K
                </div>
                <div className="text-xs text-blue-500">
                  In: {(usageTotals.total_input_tokens / 1000).toFixed(1)}K / Out: {(usageTotals.total_output_tokens / 1000).toFixed(1)}K
                </div>
              </div>

              <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                <div className="flex items-center gap-2 text-red-600 mb-1">
                  <Coins className="h-4 w-4" />
                  <span className="text-xs font-medium">AI Cost</span>
                </div>
                <div className="text-xl font-bold text-red-700">
                  ${usageTotals.total_cost_usd.toFixed(2)}
                </div>
                <div className="text-xs text-red-500">
                  ≈ {(usageTotals.total_cost_usd * 25500).toLocaleString('vi-VN')} VND
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                <div className="flex items-center gap-2 text-green-600 mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xs font-medium">Revenue (10x)</span>
                </div>
                <div className="text-xl font-bold text-green-700">
                  ${(usageTotals.total_cost_usd * 10).toFixed(2)}
                </div>
                <div className="text-xs text-green-500">
                  ≈ {(usageTotals.total_cost_usd * 10 * 25500).toLocaleString('vi-VN')} VND
                </div>
              </div>
            </div>

            {/* Second row - Performance metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                <div className="flex items-center gap-2 text-amber-600 mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs font-medium">Success Rate</span>
                </div>
                <div className="text-xl font-bold text-amber-700">
                  {usageTotals.success_rate.toFixed(1)}%
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs font-medium">Avg Latency</span>
                </div>
                <div className="text-xl font-bold text-gray-700">
                  {usageTotals.avg_latency_ms.toFixed(0)}ms
                </div>
              </div>

              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                <div className="flex items-center gap-2 text-emerald-600 mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs font-medium">Profit Margin</span>
                </div>
                <div className="text-xl font-bold text-emerald-700">
                  ${(usageTotals.total_cost_usd * 9).toFixed(2)}
                </div>
                <div className="text-xs text-emerald-500">
                  90% margin (Revenue - Cost)
                </div>
              </div>
            </div>
            </>
          )}

          {/* Usage by Feature */}
          {usageStats.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Feature</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Provider</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">Requests</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">Tokens</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600 text-red-600">Cost</th>
                    <th className="text-right px-3 py-2 font-medium text-green-600">Revenue</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">Success</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {usageStats.map((stat, idx) => (
                    <tr key={idx} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{stat.feature_code}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${PROVIDER_COLORS[stat.provider_code] || 'bg-gray-100'}`}>
                          {stat.provider_code}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">{stat.total_requests.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">{(stat.total_tokens / 1000).toFixed(1)}K</td>
                      <td className="px-3 py-2 text-right text-red-600">${stat.total_cost.toFixed(3)}</td>
                      <td className="px-3 py-2 text-right text-green-600 font-medium">${(stat.total_cost * 10).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">
                        <span className={stat.success_rate >= 95 ? 'text-green-600' : stat.success_rate >= 80 ? 'text-amber-600' : 'text-red-600'}>
                          {stat.success_rate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-500">{stat.avg_latency_ms.toFixed(0)}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No AI usage data yet</p>
              <p className="text-xs">Usage will appear here once AI features are used</p>
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
        <p className="text-sm text-blue-700">
          <strong>Priority:</strong> System tries providers in order. If one fails, it falls back to next. Only enabled providers with API keys are used.
        </p>
      </div>
    </div>
  );
}
