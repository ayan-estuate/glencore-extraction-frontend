import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Cpu,
  KeyRound,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  X,
  Info,
  Plug,
} from "lucide-react";
import { useAppStore } from "../../stores/useAppStore";
import { useSnackbar } from "../../hooks/useSnackbar";
import {
  apiAddLlmProvider,
  apiDeleteLlmProvider,
  apiListTenantLlmProviders,
  apiTestLlmConnection,
  apiUpdateLlmProvider,
  normalizeError,
} from "../../lib/apiClient";
import { effectiveTenantId } from "../../lib/tenantScope";
import { DiscoveredLlmModel, LlmModelInput, LlmProvider, LlmProviderType } from "../../types/api";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";

/** A ready-made provider choice: picking one fills in the type, label and base URL. */
interface ProviderPreset {
  id: string;
  name: string;
  providerType: LlmProviderType;
  baseUrl: string;
}

const CUSTOM_PRESET_ID = "custom";

const PROVIDER_PRESETS: ProviderPreset[] = [
  { id: "anthropic", name: "Anthropic (Claude)", providerType: "ANTHROPIC", baseUrl: "" },
  { id: "openai", name: "OpenAI", providerType: "OPENAI_COMPATIBLE", baseUrl: "https://api.openai.com/v1" },
  {
    id: "gemini",
    name: "Google Gemini",
    providerType: "OPENAI_COMPATIBLE",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
  },
  { id: "groq", name: "Groq", providerType: "OPENAI_COMPATIBLE", baseUrl: "https://api.groq.com/openai/v1" },
  { id: "mistral", name: "Mistral AI", providerType: "OPENAI_COMPATIBLE", baseUrl: "https://api.mistral.ai/v1" },
  { id: "deepseek", name: "DeepSeek", providerType: "OPENAI_COMPATIBLE", baseUrl: "https://api.deepseek.com/v1" },
  { id: "xai", name: "xAI (Grok)", providerType: "OPENAI_COMPATIBLE", baseUrl: "https://api.x.ai/v1" },
  { id: "together", name: "Together AI", providerType: "OPENAI_COMPATIBLE", baseUrl: "https://api.together.xyz/v1" },
  {
    id: "fireworks",
    name: "Fireworks AI",
    providerType: "OPENAI_COMPATIBLE",
    baseUrl: "https://api.fireworks.ai/inference/v1",
  },
  { id: "cerebras", name: "Cerebras", providerType: "OPENAI_COMPATIBLE", baseUrl: "https://api.cerebras.ai/v1" },
  { id: "openrouter", name: "OpenRouter", providerType: "OPENAI_COMPATIBLE", baseUrl: "https://openrouter.ai/api/v1" },
  {
    id: CUSTOM_PRESET_ID,
    name: "Other OpenAI-compatible (Azure, vLLM, self-hosted, ...)",
    providerType: "OPENAI_COMPATIBLE",
    baseUrl: "",
  },
];

const presetById = (id: string) => PROVIDER_PRESETS.find((p) => p.id === id);

/** Work out which preset a saved provider matches, so editing shows the same choice it was added with. */
const presetForProvider = (p: LlmProvider): string => {
  if (p.providerType === "ANTHROPIC") return "anthropic";
  const norm = (u: string) => u.trim().replace(/\/+$/, "").toLowerCase();
  const match = PROVIDER_PRESETS.find((x) => x.baseUrl && p.baseUrl && norm(x.baseUrl) === norm(p.baseUrl));
  return match?.id ?? CUSTOM_PRESET_ID;
};

/** A model chosen for this provider. Prices are normally looked up by the server. */
interface ChosenModel {
  id: string;
  /** Looked-up price in USD micros per million tokens; null = none found yet. */
  inputMicros: number | null;
  outputMicros: number | null;
  /** USD per million tokens typed by the admin, only for a model whose price couldn't be found. */
  inputUsd: string;
  outputUsd: string;
}

interface Draft {
  editingId: string | null;
  presetId: string;
  providerType: LlmProviderType;
  label: string;
  baseUrl: string;
  apiKey: string;
  chosen: ChosenModel[];
}

const emptyDraft = (): Draft => ({
  editingId: null,
  presetId: "gemini",
  providerType: "OPENAI_COMPATIBLE",
  label: "Google Gemini",
  baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
  apiKey: "",
  chosen: [],
});

const perMillion = (micros: number) => `$${(micros / 1_000_000).toFixed(micros % 10000 === 0 ? 2 : 3)}`;

const fromDiscovered = (m: DiscoveredLlmModel): ChosenModel => ({
  id: m.id,
  inputMicros: m.inputMicrosPerMillion,
  outputMicros: m.outputMicrosPerMillion,
  inputUsd: "",
  outputUsd: "",
});

const usdToMicros = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 1_000_000) : NaN;
};

export function LlmProvidersPanel() {
  const { adminApiKey, adminRole, adminScopeTenantId, activeTenantId, apiKeyIdentity, tenants, fetchTenantsAdmin } =
    useAppStore();
  const { success, error: errorSnackbar } = useSnackbar();

  const tenantId = effectiveTenantId({
    adminRole,
    adminScopeTenantId,
    activeTenantId,
    tenants,
    identityTenantId: apiKeyIdentity?.tenantId,
  });
  const [pickedTenant, setPickedTenant] = useState<string | null>(null);
  const managedTenant = adminRole === "PLATFORM_ADMIN" && pickedTenant && tenants.some((t) => t.id === pickedTenant)
    ? pickedTenant
    : tenantId;

  const [providers, setProviders] = useState<LlmProvider[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  // Connection test state (nothing is saved by testing).
  const [isTesting, setIsTesting] = useState(false);
  const [discovered, setDiscovered] = useState<DiscoveredLlmModel[] | null>(null);
  const [modelSearch, setModelSearch] = useState("");
  const [manualModel, setManualModel] = useState("");

  useEffect(() => {
    if (adminApiKey && adminRole === "PLATFORM_ADMIN") fetchTenantsAdmin().catch(() => undefined);
  }, [adminApiKey, adminRole, fetchTenantsAdmin]);

  const load = useCallback(async () => {
    if (!adminApiKey || !managedTenant) return;
    setIsLoading(true);
    try {
      setProviders(await apiListTenantLlmProviders(adminApiKey, managedTenant));
    } catch (err: unknown) {
      setProviders([]);
      errorSnackbar(normalizeError(err).message, "Could not load LLM providers");
    } finally {
      setIsLoading(false);
    }
  }, [adminApiKey, managedTenant, errorSnackbar]);

  useEffect(() => {
    load();
  }, [load]);

  const closeDraft = () => {
    setDraft(null);
    setDiscovered(null);
    setModelSearch("");
    setManualModel("");
  };

  const filteredDiscovered = useMemo(() => {
    const q = modelSearch.trim().toLowerCase();
    return (discovered ?? []).filter((m) => !q || m.id.toLowerCase().includes(q));
  }, [discovered, modelSearch]);

  if (!adminApiKey || !adminRole) {
    return (
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
        <span>
          Managing LLM providers needs a <strong>TENANT_ADMIN</strong> or <strong>PLATFORM_ADMIN</strong> key. Sign in
          with one.
        </span>
      </div>
    );
  }

  const startEdit = (p: LlmProvider) => {
    setDiscovered(null);
    setDraft({
      editingId: p.id,
      presetId: presetForProvider(p),
      providerType: p.providerType,
      label: p.label,
      baseUrl: p.baseUrl ?? "",
      apiKey: "",
      chosen: p.models.map((m) => ({
        id: m.id,
        inputMicros: m.inputMicrosPerMillion,
        outputMicros: m.outputMicrosPerMillion,
        inputUsd: "",
        outputUsd: "",
      })),
    });
  };

  const pickPreset = (presetId: string) => {
    const preset = presetById(presetId);
    if (!preset || !draft) return;
    const previous = presetById(draft.presetId);
    setDiscovered(null);
    setDraft({
      ...draft,
      presetId,
      providerType: preset.providerType,
      baseUrl: preset.baseUrl,
      // Keep a label the admin typed; replace one we filled in ourselves.
      label:
        !draft.label.trim() || draft.label === previous?.name
          ? presetId === CUSTOM_PRESET_ID
            ? ""
            : preset.name
          : draft.label,
      // Models from another provider make no sense here.
      chosen: [],
    });
  };

  const toggleModel = (m: DiscoveredLlmModel) =>
    setDraft((d) => {
      if (!d) return d;
      return d.chosen.some((c) => c.id === m.id)
        ? { ...d, chosen: d.chosen.filter((c) => c.id !== m.id) }
        : { ...d, chosen: [...d.chosen, fromDiscovered(m)] };
    });

  const addManualModel = () => {
    const id = manualModel.trim().replace(/^models\//, "");
    if (!id || !draft) return;
    if (!draft.chosen.some((c) => c.id === id)) {
      const known = discovered?.find((m) => m.id === id);
      setDraft({
        ...draft,
        chosen: [
          ...draft.chosen,
          known ? fromDiscovered(known) : { id, inputMicros: null, outputMicros: null, inputUsd: "", outputUsd: "" },
        ],
      });
    }
    setManualModel("");
  };

  const testConnection = async () => {
    if (!draft) return;
    if (!draft.apiKey.trim() && !draft.editingId) {
      errorSnackbar("Enter the API key first.", "Nothing to test");
      return;
    }
    setIsTesting(true);
    try {
      const result = await apiTestLlmConnection(adminApiKey, managedTenant, {
        providerType: draft.providerType,
        baseUrl: draft.baseUrl.trim() || null,
        apiKey: draft.apiKey.trim() || undefined,
        providerId: draft.editingId ?? undefined,
      });
      setDiscovered(result.models);
      // Fill in prices for models already chosen, now that the server has looked them up.
      setDraft((d) =>
        d && {
          ...d,
          chosen: d.chosen.map((c) => {
            const found = result.models.find((m) => m.id === c.id);
            return found && c.inputMicros === null ? fromDiscovered(found) : c;
          }),
        }
      );
      success(`Connected: ${result.models.length} models available`, "Connection OK");
    } catch (err: unknown) {
      setDiscovered(null);
      errorSnackbar(normalizeError(err).message, "Connection failed");
    } finally {
      setIsTesting(false);
    }
  };

  const save = async () => {
    if (!draft) return;
    const models: LlmModelInput[] = [];
    for (const c of draft.chosen) {
      const input = usdToMicros(c.inputUsd);
      const output = usdToMicros(c.outputUsd);
      if (Number.isNaN(input) || Number.isNaN(output)) {
        errorSnackbar(`The price for "${c.id}" must be a non-negative number`, "Invalid price");
        return;
      }
      // Only send a price the admin typed. Otherwise the server looks the price up.
      models.push({ id: c.id, inputMicrosPerMillion: input, outputMicrosPerMillion: output });
    }
    if (!draft.label.trim() || models.length === 0) {
      errorSnackbar("A label and at least one model are required.", "Incomplete provider");
      return;
    }
    if (!draft.editingId && !draft.apiKey.trim()) {
      errorSnackbar("An API key is required.", "Incomplete provider");
      return;
    }
    // A saved model keeps its stored price unless the admin overrides it.
    const withStored = models.map((m, i) => {
      const c = draft.chosen[i];
      if (m.inputMicrosPerMillion === undefined && c.inputMicros !== null) m.inputMicrosPerMillion = c.inputMicros;
      if (m.outputMicrosPerMillion === undefined && c.outputMicros !== null) m.outputMicrosPerMillion = c.outputMicros;
      return m;
    });

    setIsSaving(true);
    try {
      if (draft.editingId) {
        await apiUpdateLlmProvider(adminApiKey, managedTenant, draft.editingId, {
          label: draft.label.trim(),
          baseUrl: draft.baseUrl.trim() || null,
          apiKey: draft.apiKey.trim() || undefined,
          models: withStored,
        });
      } else {
        await apiAddLlmProvider(adminApiKey, managedTenant, {
          providerType: draft.providerType,
          label: draft.label.trim(),
          baseUrl: draft.baseUrl.trim() || null,
          apiKey: draft.apiKey.trim(),
          models: withStored,
        });
      }
      success(`Saved "${draft.label.trim()}" for tenant ${managedTenant}`, "LLM provider saved");
      closeDraft();
      await load();
    } catch (err: unknown) {
      errorSnackbar(normalizeError(err).message, "Could not save LLM provider");
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (p: LlmProvider) => {
    if (!window.confirm(`Remove "${p.label}" from tenant ${managedTenant}? Its stored API key is deleted.`)) return;
    try {
      await apiDeleteLlmProvider(adminApiKey, managedTenant, p.id);
      success(`Removed "${p.label}"`, "LLM provider removed");
      await load();
    } catch (err: unknown) {
      errorSnackbar(normalizeError(err).message, "Could not remove LLM provider");
    }
  };

  const setChosen = (id: string, patch: Partial<ChosenModel>) =>
    setDraft((d) => d && { ...d, chosen: d.chosen.map((c) => (c.id === id ? { ...c, ...patch } : c)) });

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">LLM Providers</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              The providers and models this tenant's users can choose from when extracting.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {adminRole === "PLATFORM_ADMIN" && tenants.length > 0 ? (
              <Select
                value={managedTenant}
                onChange={(e) => {
                  closeDraft();
                  setPickedTenant(e.target.value);
                }}
                options={tenants.map((t) => ({ value: t.id, label: t.id }))}
                className="min-w-[160px]"
              />
            ) : (
              <span className="text-xs font-mono text-slate-600 dark:text-slate-300">Tenant: {managedTenant}</span>
            )}
            {!draft && (
              <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setDraft(emptyDraft())}>
                Add provider
              </Button>
            )}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-500" />
          <span>
            API keys are encrypted before they are stored and never shown again (only the last 4 characters). Model
            prices are looked up automatically; you don't enter them.
          </span>
        </div>

        {isLoading ? (
          <p className="text-xs text-slate-500">Loading providers...</p>
        ) : providers.length === 0 && !draft ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No LLM provider is configured for <strong>{managedTenant}</strong> yet. Extraction is unavailable until one
            is added.
          </p>
        ) : (
          <div className="space-y-3">
            {providers.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-start justify-between gap-3"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{p.label}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {p.providerType}
                    </span>
                  </div>
                  {p.baseUrl && <div className="text-[11px] font-mono text-slate-500 truncate">{p.baseUrl}</div>}
                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <KeyRound className="w-3 h-3" /> Key ••••{p.apiKeyLast4}
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {p.models.map((m, i) => (
                      <span
                        key={m.id}
                        className="text-[11px] px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                        title="Price per million tokens (input / output)"
                      >
                        <span className="font-mono">{m.id}</span>
                        {i === 0 && <span className="text-blue-600 dark:text-blue-400"> · default</span>}
                        <span className="text-slate-400">
                          {" "}
                          {perMillion(m.inputMicrosPerMillion)} / {perMillion(m.outputMicrosPerMillion)}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" leftIcon={<Pencil className="w-3.5 h-3.5" />} onClick={() => startEdit(p)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="danger" leftIcon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => remove(p)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {draft && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {draft.editingId ? `Edit "${draft.label}"` : `Add a provider for ${managedTenant}`}
            </h3>
            <button onClick={closeDraft} className="text-slate-400 hover:text-slate-600 cursor-pointer" aria-label="Cancel">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>Provider</span>
              <Select
                value={draft.presetId}
                disabled={!!draft.editingId}
                onChange={(e) => pickPreset(e.target.value)}
                options={PROVIDER_PRESETS.map((p) => ({ value: p.id, label: p.name }))}
                className="w-full"
              />
            </label>
            <label className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>Label (shown to users)</span>
              <Input
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                placeholder={draft.presetId === CUSTOM_PRESET_ID ? "My provider" : "Shown to users"}
              />
            </label>
            <label className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>
                Base URL{" "}
                {draft.presetId === CUSTOM_PRESET_ID
                  ? "(required)"
                  : draft.providerType === "ANTHROPIC"
                    ? "(optional, blank = Anthropic's API)"
                    : "(filled in for you)"}
              </span>
              <Input
                value={draft.baseUrl}
                onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })}
                placeholder={draft.presetId === CUSTOM_PRESET_ID ? "https://your-host/v1" : ""}
              />
            </label>
            <label className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>API key {draft.editingId ? "(blank = keep the saved one)" : ""}</span>
              <Input
                type="password"
                autoComplete="off"
                value={draft.apiKey}
                onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" leftIcon={<Plug className="w-4 h-4" />} onClick={testConnection} isLoading={isTesting}>
              Test connection &amp; load models
            </Button>
            {discovered && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Connected, {discovered.length} models available
              </span>
            )}
          </div>

          {/* Models the provider offers */}
          {discovered && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <Input
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  placeholder={`Search ${discovered.length} models...`}
                />
              </div>
              <div className="max-h-56 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDiscovered.length === 0 ? (
                  <div className="p-3 text-xs text-slate-500">No matching models.</div>
                ) : (
                  filteredDiscovered.map((m) => (
                    <label
                      key={m.id}
                      className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={draft.chosen.some((c) => c.id === m.id)}
                          onChange={() => toggleModel(m)}
                        />
                        <span className="font-mono truncate">{m.id}</span>
                      </span>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {m.inputMicrosPerMillion !== null && m.outputMicrosPerMillion !== null
                          ? `${perMillion(m.inputMicrosPerMillion)} / ${perMillion(m.outputMicrosPerMillion)} per M`
                          : "price unknown"}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Chosen models */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Models users can pick{" "}
              <span className="font-normal text-slate-400">(the first is the default)</span>
            </div>
            {draft.chosen.length === 0 && (
              <p className="text-[11px] text-slate-500">
                {discovered ? "Tick models above." : "Test the connection to pick from the provider's models, or type a model id below."}
              </p>
            )}
            {draft.chosen.map((c) => {
              const priced = c.inputMicros !== null && c.outputMicros !== null;
              return (
                <div key={c.id} className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono min-w-[200px] text-slate-800 dark:text-slate-200">{c.id}</span>
                  {priced ? (
                    <span className="text-[11px] text-slate-500">
                      {perMillion(c.inputMicros as number)} / {perMillion(c.outputMicros as number)} per M tokens
                    </span>
                  ) : (
                    <>
                      <span className="text-[11px] text-amber-600 dark:text-amber-400">
                        No published price found. Enter USD per million tokens (or leave blank to look it up on save):
                      </span>
                      <Input
                        className="!w-24"
                        value={c.inputUsd}
                        onChange={(e) => setChosen(c.id, { inputUsd: e.target.value })}
                        placeholder="input $"
                      />
                      <Input
                        className="!w-24"
                        value={c.outputUsd}
                        onChange={(e) => setChosen(c.id, { outputUsd: e.target.value })}
                        placeholder="output $"
                      />
                    </>
                  )}
                  <button
                    onClick={() => setDraft({ ...draft, chosen: draft.chosen.filter((x) => x.id !== c.id) })}
                    className="text-slate-400 hover:text-rose-600 cursor-pointer"
                    aria-label={`Remove ${c.id}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
            <div className="flex gap-2 pt-1">
              <Input
                value={manualModel}
                onChange={(e) => setManualModel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addManualModel()}
                placeholder="or type a model id and press Enter"
              />
              <Button size="sm" variant="outline" onClick={addManualModel}>
                Add
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeDraft}>
              Cancel
            </Button>
            <Button onClick={save} isLoading={isSaving}>
              {draft.editingId ? "Save changes" : "Add provider"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
