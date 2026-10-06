import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Settings2,
  Sparkles,
  Languages,
  MessageSquare,
  Code2,
  ShieldCheck,
  Cpu,
  FileCheck,
  Info,
  CheckCircle2,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { API_CONFIG } from "../../config/api.config";
import { ExtractionOptions } from "../../types/api";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { useLlmProviders } from "../../hooks/useLlmProviders";
import { Link } from "react-router-dom";

export interface UploadFormProps {
  options: ExtractionOptions;
  setOptions: React.Dispatch<React.SetStateAction<ExtractionOptions>>;
  onExtract: () => void;
  isExtracting: boolean;
  disabled: boolean;
  /** How many files are staged, to label the button. */
  fileCount?: number;
}

const SCHEMA_PRESETS = [
  {
    id: "standard",
    name: "Standard Statutory Obligation Register (Default)",
    description: "Extracts documentId, title, entity, and statutory obligations with sections, owners, and due dates.",
    schema: "",
  },
  {
    id: "environmental",
    name: "Environmental Limits & Monitoring Conditions",
    description: "Targets quantitative emission parameters, sampling frequencies, and threshold breach conditions.",
    schema: JSON.stringify(
      {
        type: "object",
        properties: {
          documentId: { type: "string" },
          entity: { type: "string" },
          obligations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                obligationId: { type: "string" },
                obligationTitle: { type: "string" },
                parameter: { type: "string", description: "e.g. SO2, NOx, Water pH, Noise dB" },
                limitValue: { type: "string", description: "Numerical limit or threshold" },
                samplingFrequency: { type: "string", description: "e.g. Continuous, Monthly, Annual" },
                obligationDescription: { type: "string" },
                section: { type: "string" },
                dueDate: { type: "string" },
              },
              required: ["obligationId", "obligationDescription", "section"],
            },
          },
        },
        required: ["documentId", "obligations"],
      },
      null,
      2
    ),
  },
  {
    id: "liabilities",
    name: "Statutory Liabilities & Enforcement Penalties",
    description: "Focuses on regulatory non-compliance consequences, enforcement remedies, and reporting authorities.",
    schema: JSON.stringify(
      {
        type: "object",
        properties: {
          documentId: { type: "string" },
          entity: { type: "string" },
          obligations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                obligationId: { type: "string" },
                obligationTitle: { type: "string" },
                penaltyOrRemedy: { type: "string", description: "Statutory consequence or enforcement action" },
                regulatoryAuthority: { type: "string" },
                obligationDescription: { type: "string" },
                section: { type: "string" },
                obligationOwner: { type: "string" },
              },
              required: ["obligationId", "obligationDescription", "section"],
            },
          },
        },
        required: ["documentId", "obligations"],
      },
      null,
      2
    ),
  },
  {
    id: "custom",
    name: "Custom JSON Output Schema",
    description: "Specify a custom JSON schema to dictate the exact structured response from the backend.",
    schema: "",
  },
];

export function UploadForm({
  options,
  setOptions,
  onExtract,
  isExtracting,
  fileCount = 1,
  disabled,
}: UploadFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedSchemaPreset, setSelectedSchemaPreset] = useState<string>("standard");

  const { providers, isLoading: providersLoading, error: providersError } = useLlmProviders();
  const activeProvider = providers.find((p) => p.id === options.llmProviderId) || providers[0];
  const noProviders = !providersLoading && !providersError && providers.length === 0;

  // Always submit an explicit, real choice: the selected (or first) provider and model.
  React.useEffect(() => {
    if (!activeProvider) return;
    const modelOk = activeProvider.models.some((m) => m.id === options.model);
    if (options.llmProviderId !== activeProvider.id || !modelOk) {
      setOptions((prev) => ({
        ...prev,
        llmProviderId: activeProvider.id,
        model: modelOk ? prev.model : activeProvider.models[0]?.id,
      }));
    }
  }, [activeProvider, options.llmProviderId, options.model, setOptions]);

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const found = providers.find((p) => p.id === e.target.value);
    setOptions((prev) => ({ ...prev, llmProviderId: found?.id, model: found?.models[0]?.id }));
  };

  const handleSchemaPresetChange = (presetId: string) => {
    setSelectedSchemaPreset(presetId);
    const found = SCHEMA_PRESETS.find((p) => p.id === presetId);
    if (presetId === "standard") {
      setOptions((prev) => ({ ...prev, responseSchema: undefined }));
    } else if (found && found.schema) {
      setOptions((prev) => ({ ...prev, responseSchema: found.schema }));
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Accordion Card */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden transition-colors">
        <div
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors select-none"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Settings2 className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Advanced Extraction Configuration & Backend Guardrails
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configure LLM extraction options, confidence thresholds, and validation rules.
              </p>
            </div>
          </div>

          <div className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            {showAdvanced ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>

        {/* Advanced Options Content */}
        {showAdvanced && (
          <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 space-y-4 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Provider Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
                LLM Provider & Engine
              </label>
              {providers.length > 0 ? (
                <Select
                  value={activeProvider?.id ?? ""}
                  onChange={handleProviderChange}
                  options={providers.map((p) => ({ value: p.id, label: `${p.label} (${p.providerType})` }))}
                  className="w-full"
                />
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {providersLoading ? "Loading providers..." : providersError || "No provider configured."}
                </p>
              )}
            </div>

            {/* Model Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-purple-500 shrink-0" />
                Specific Model
              </label>
              {activeProvider ? (
                <Select
                  value={options.model || activeProvider.models[0]?.id || ""}
                  onChange={(e) => setOptions((prev) => ({ ...prev, model: e.target.value }))}
                  options={activeProvider.models.map((m) => ({ value: m.id, label: m.id }))}
                  className="w-full"
                />
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">—</p>
              )}
            </div>

            {/* Language Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Languages className="w-4 h-4 text-blue-500 shrink-0" />
                Output & OCR Language
              </label>
              <Select
                value={options.language || "source"}
                onChange={(e) => setOptions((prev) => ({ ...prev, language: e.target.value }))}
                options={API_CONFIG.LANGUAGES.map((l) => ({ value: l.code, label: l.name }))}
                className="w-full"
              />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                Italian (ita) includes Tesseract multi-language accent preservation.
              </span>
            </div>

            {/* Response Schema Preset Selection */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-indigo-500 shrink-0" />
                Response Schema / Output Structure (responseSchema)
              </label>
              <Select
                value={selectedSchemaPreset}
                onChange={(e) => handleSchemaPresetChange(e.target.value)}
                options={SCHEMA_PRESETS.map((p) => ({ value: p.id, label: p.name }))}
                className="w-full"
              />
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {SCHEMA_PRESETS.find((p) => p.id === selectedSchemaPreset)?.description}
              </p>
            </div>

            {/* Custom JSON Schema Textarea (if custom or selected) */}
            {(selectedSchemaPreset === "custom" || options.responseSchema) && (
              <div className="space-y-1.5 md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Code2 className="w-4 h-4 text-indigo-500 shrink-0" />
                    Custom JSON Schema Definition
                  </label>
                  {selectedSchemaPreset !== "custom" && (
                    <button
                      type="button"
                      onClick={() => handleSchemaPresetChange("standard")}
                      className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                    >
                      Reset to Standard Schema
                    </button>
                  )}
                </div>
                <textarea
                  rows={4}
                  value={options.responseSchema || ""}
                  onChange={(e) => setOptions((prev) => ({ ...prev, responseSchema: e.target.value }))}
                  placeholder='{\n  "type": "object",\n  "properties": { ... }\n}'
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 font-mono text-[11px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                />
              </div>
            )}

            {/* Natural Language Instruction */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-blue-500 shrink-0" />
                Custom Extraction Prompt / Specific Guidance (instruction)
              </label>
              <textarea
                rows={2}
                value={options.instruction || ""}
                onChange={(e) => setOptions((prev) => ({ ...prev, instruction: e.target.value }))}
                placeholder="E.g., Focus on water effluent limits, noise decibel boundaries, and statutory reporting frequencies."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          {/* Backend Guardrails & System Specs Box */}
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-blue-50/40 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-900 dark:text-blue-300">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Backend Architecture & Enterprise Guardrails</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-[11px] text-slate-600 dark:text-slate-400">
              <div className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>100MB Document Limit:</strong> Direct disk-to-disk spooling with zero heap memory overhead.
                </span>
              </div>

              <div className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>300 DPI OCR Engine:</strong> Automatic high-resolution OCR fallback with multi-language accent support.
                </span>
              </div>

              <div className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Anti-Hallucination Gate:</strong> 50% candidate coverage threshold and Jaccard duplicate suppression.
                </span>
              </div>

              <div className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>PII & Entity Masking:</strong> Local legal harvest shields sensitive entity names prior to cloud LLM submission.
                </span>
              </div>

              <div className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>7-Day SHA-256 Cache:</strong> Re-uploading identical documents instantly returns verified results.
                </span>
              </div>

              <div className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Durable Queue:</strong> 15-minute lease protection prevents timeout failure on complex permits.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

      {noProviders && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
          No LLM provider is configured for this tenant, so extraction is unavailable. An admin can add one under{" "}
          <Link to="/settings" state={{ tab: "llm" }} className="font-semibold underline">
            Settings &gt; LLM Providers
          </Link>
          .
        </div>
      )}

      {/* Primary Action Button */}
      <button
        type="button"
        onClick={onExtract}
        disabled={disabled || isExtracting || !activeProvider}
        className="w-full py-3.5 sm:py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isExtracting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Uploading...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            <span>{fileCount > 1 ? `Extract ${fileCount} documents` : "Extract Obligations & Data"}</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </>
        )}
      </button>
    </div>
  );
}
