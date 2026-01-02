"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Edit, Trash2, RefreshCw, Layers, ArrowRight } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface WorkflowStep {
  id: string;
  workflow_id: string;
  step_order: number;
  code: string;
  name: string;
  description: string;
  step_type: string;
  assignee_type: string;
  sla_hours: number;
  is_active: boolean;
}

interface WorkflowDefinition {
  id: string;
  code: string;
  name: string;
  steps: WorkflowStep[];
}

interface ApiResponse {
  items: WorkflowDefinition[];
  total: number;
}

export default function WorkflowStepsPage() {
  const [definitions, setDefinitions] = useState<WorkflowDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);

  const fetchDefinitions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<ApiResponse>("/workflow/workflow-definitions");
      // Fetch steps for each workflow
      const definitionsWithSteps = await Promise.all(
        (data.items || []).map(async (def) => {
          try {
            const detail = await apiFetch<WorkflowDefinition>(`/workflow/workflow-definitions/${def.id}`);
            return detail;
          } catch {
            return { ...def, steps: [] };
          }
        })
      );
      setDefinitions(definitionsWithSteps);
      if (definitionsWithSteps.length > 0 && !selectedWorkflow) {
        setSelectedWorkflow(definitionsWithSteps[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDefinitions();
  }, []);

  const getStepTypeColor = (type: string) => {
    switch (type) {
      case "START": return "bg-green-100 text-green-700";
      case "END": return "bg-red-100 text-red-700";
      case "APPROVAL": return "bg-blue-100 text-blue-700";
      case "TASK": return "bg-yellow-100 text-yellow-700";
      case "CONDITION": return "bg-purple-100 text-purple-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const selectedDef = definitions.find(d => d.id === selectedWorkflow);
  const filteredSteps = selectedDef?.steps?.filter(
    s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         s.code.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-500">{error}</p>
        <button onClick={fetchDefinitions} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg">
          <RefreshCw className="w-4 h-4" /> Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflow Steps & Transitions</h1>
          <p className="text-gray-500">Quản lý các bước và chuyển tiếp trong quy trình</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchDefinitions} className="p-2 border rounded-lg hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            Thêm Step
          </button>
        </div>
      </div>

      {/* Workflow Selector */}
      <div className="flex items-center gap-4">
        <select
          value={selectedWorkflow || ""}
          onChange={(e) => setSelectedWorkflow(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          {definitions.map(def => (
            <option key={def.id} value={def.id}>
              {def.code} - {def.name}
            </option>
          ))}
        </select>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm step..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Steps Flow Visualization */}
      {selectedDef && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            {selectedDef.name} - Flow
          </h2>

          {filteredSteps.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Layers className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Chưa có step nào được định nghĩa</p>
              <p className="text-sm">Click "Thêm Step" để bắt đầu</p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              {filteredSteps.sort((a, b) => a.step_order - b.step_order).map((step, index) => (
                <div key={step.id} className="flex items-center gap-2">
                  <div className="bg-white border-2 rounded-lg p-4 min-w-[180px] hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-0.5 text-xs rounded ${getStepTypeColor(step.step_type)}`}>
                        {step.step_type}
                      </span>
                      <span className="text-xs text-gray-400">#{step.step_order}</span>
                    </div>
                    <p className="font-medium">{step.name}</p>
                    <p className="text-xs text-gray-500">{step.code}</p>
                    {step.sla_hours && (
                      <p className="text-xs text-gray-400 mt-1">SLA: {step.sla_hours}h</p>
                    )}
                    <div className="flex items-center gap-1 mt-2 pt-2 border-t">
                      <button className="p-1 hover:bg-gray-100 rounded" title="Edit">
                        <Edit className="w-3 h-3 text-gray-500" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded" title="Delete">
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </button>
                    </div>
                  </div>
                  {index < filteredSteps.length - 1 && (
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Steps Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Step</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assignee Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SLA</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredSteps.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Không có step nào
                </td>
              </tr>
            ) : (
              filteredSteps.sort((a, b) => a.step_order - b.step_order).map(step => (
                <tr key={step.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{step.step_order}</td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{step.name}</p>
                      <p className="text-xs text-gray-500">{step.code}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded ${getStepTypeColor(step.step_type)}`}>
                      {step.step_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{step.assignee_type || "-"}</td>
                  <td className="px-4 py-3 text-sm">{step.sla_hours ? `${step.sla_hours}h` : "-"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <Edit className="w-4 h-4 text-gray-500" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
