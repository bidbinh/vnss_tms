"use client";

import { useEffect, useState } from "react";
import {
  Target,
  Plus,
  Search,
  Users,
  BarChart3,
  Star,
  Edit,
  Filter,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Skill {
  id: string;
  name: string;
  category: string;
  description?: string;
}

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  position?: string;
  department?: string;
}

interface EmployeeSkill {
  employee_id: string;
  employee?: Employee;
  skill_id: string;
  skill?: Skill;
  level: number;
  certified: boolean;
  last_assessed?: string;
}

const SKILL_CATEGORIES = [
  { value: "TECHNICAL", label: "Kỹ thuật", color: "bg-blue-100 text-blue-700" },
  { value: "SOFT", label: "Kỹ năng mềm", color: "bg-green-100 text-green-700" },
  { value: "LANGUAGE", label: "Ngoại ngữ", color: "bg-purple-100 text-purple-700" },
  { value: "DRIVING", label: "Lái xe", color: "bg-yellow-100 text-yellow-700" },
  { value: "MANAGEMENT", label: "Quản lý", color: "bg-red-100 text-red-700" },
  { value: "OTHER", label: "Khác", color: "bg-gray-100 text-gray-700" },
];

const SKILL_LEVELS = [
  { value: 1, label: "Cơ bản", color: "bg-gray-200" },
  { value: 2, label: "Trung bình", color: "bg-blue-300" },
  { value: 3, label: "Khá", color: "bg-green-300" },
  { value: 4, label: "Giỏi", color: "bg-yellow-300" },
  { value: 5, label: "Xuất sắc", color: "bg-purple-300" },
];

export default function SkillsMatrixPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeSkills, setEmployeeSkills] = useState<EmployeeSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [viewMode, setViewMode] = useState<"matrix" | "list">("list");

  const [skillForm, setSkillForm] = useState({
    name: "",
    category: "TECHNICAL",
    description: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Mock data
      const mockSkills: Skill[] = [
        { id: "s1", name: "Lái xe container", category: "DRIVING" },
        { id: "s2", name: "Lái xe FC", category: "DRIVING" },
        { id: "s3", name: "Microsoft Excel", category: "TECHNICAL" },
        { id: "s4", name: "Giao tiếp", category: "SOFT" },
        { id: "s5", name: "Tiếng Anh", category: "LANGUAGE" },
        { id: "s6", name: "Quản lý đội xe", category: "MANAGEMENT" },
        { id: "s7", name: "An toàn lao động", category: "TECHNICAL" },
      ];

      const mockEmployees: Employee[] = [
        { id: "e1", employee_code: "TX001", full_name: "Nguyen Van A", position: "Tài xế", department: "Vận tải" },
        { id: "e2", employee_code: "TX002", full_name: "Tran Van B", position: "Tài xế", department: "Vận tải" },
        { id: "e3", employee_code: "NV001", full_name: "Le Thi C", position: "Kế toán", department: "Kế toán" },
        { id: "e4", employee_code: "QL001", full_name: "Pham Van D", position: "Quản lý", department: "Vận tải" },
      ];

      const mockEmployeeSkills: EmployeeSkill[] = [
        { employee_id: "e1", skill_id: "s1", level: 5, certified: true },
        { employee_id: "e1", skill_id: "s2", level: 5, certified: true },
        { employee_id: "e1", skill_id: "s7", level: 4, certified: true },
        { employee_id: "e2", skill_id: "s1", level: 4, certified: true },
        { employee_id: "e2", skill_id: "s7", level: 3, certified: true },
        { employee_id: "e3", skill_id: "s3", level: 5, certified: false },
        { employee_id: "e3", skill_id: "s4", level: 4, certified: false },
        { employee_id: "e3", skill_id: "s5", level: 3, certified: true },
        { employee_id: "e4", skill_id: "s4", level: 5, certified: false },
        { employee_id: "e4", skill_id: "s6", level: 4, certified: false },
        { employee_id: "e4", skill_id: "s5", level: 4, certified: true },
      ];

      setSkills(mockSkills);
      setEmployees(mockEmployees);
      setEmployeeSkills(mockEmployeeSkills);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeSkillLevel = (employeeId: string, skillId: string) => {
    const skill = employeeSkills.find(
      (es) => es.employee_id === employeeId && es.skill_id === skillId
    );
    return skill?.level || 0;
  };

  const renderSkillLevel = (level: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((l) => (
          <div
            key={l}
            className={`w-4 h-4 rounded-sm ${
              l <= level ? SKILL_LEVELS[level - 1]?.color || "bg-gray-200" : "bg-gray-100"
            }`}
          />
        ))}
      </div>
    );
  };

  const filteredSkills = skills.filter((skill) => {
    const matchesSearch = skill.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || skill.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredEmployees = employees.filter((emp) => {
    const matchesDept = !filterDept || emp.department === filterDept;
    return matchesDept;
  });

  const uniqueDepts = [...new Set(employees.map((e) => e.department).filter(Boolean))];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Skills Matrix</h1>
          <p className="text-gray-600 mt-1">Ma trận kỹ năng nhân viên</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === "matrix" ? "list" : "matrix")}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <BarChart3 className="w-4 h-4" />
            {viewMode === "matrix" ? "Xem danh sách" : "Xem ma trận"}
          </button>
          <button
            onClick={() => setShowSkillModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Thêm kỹ năng
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Tổng kỹ năng</div>
              <div className="text-2xl font-bold text-gray-900">{skills.length}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Nhân viên</div>
              <div className="text-2xl font-bold text-green-600">{employees.length}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Star className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Đánh giá</div>
              <div className="text-2xl font-bold text-purple-600">{employeeSkills.length}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <BarChart3 className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">TB Level</div>
              <div className="text-2xl font-bold text-yellow-600">
                {employeeSkills.length > 0
                  ? (
                      employeeSkills.reduce((sum, es) => sum + es.level, 0) / employeeSkills.length
                    ).toFixed(1)
                  : 0}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kỹ năng..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Tất cả nhóm KN</option>
            {SKILL_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Tất cả phòng ban</option>
            {uniqueDepts.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : viewMode === "matrix" ? (
        /* Matrix View */
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10">
                  Nhân viên
                </th>
                {filteredSkills.map((skill) => (
                  <th
                    key={skill.id}
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase min-w-[100px]"
                  >
                    <div>{skill.name}</div>
                    <div className="text-gray-400 font-normal mt-1">
                      {SKILL_CATEGORIES.find((c) => c.value === skill.category)?.label}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 sticky left-0 bg-white z-10">
                    <div className="font-medium text-gray-900">{emp.full_name}</div>
                    <div className="text-sm text-gray-500">
                      {emp.position} - {emp.department}
                    </div>
                  </td>
                  {filteredSkills.map((skill) => {
                    const level = getEmployeeSkillLevel(emp.id, skill.id);
                    return (
                      <td key={skill.id} className="px-4 py-3 text-center">
                        {level > 0 ? (
                          renderSkillLevel(level)
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* List View - Skills by Employee */
        <div className="space-y-4">
          {filteredEmployees.map((emp) => {
            const empSkills = employeeSkills.filter((es) => es.employee_id === emp.id);
            return (
              <div
                key={emp.id}
                className="bg-white rounded-lg shadow border border-gray-200 p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{emp.full_name}</h3>
                    <p className="text-sm text-gray-500">
                      {emp.employee_code} - {emp.position} - {emp.department}
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">{empSkills.length} kỹ năng</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {empSkills.map((es) => {
                    const skill = skills.find((s) => s.id === es.skill_id);
                    const catConfig = SKILL_CATEGORIES.find((c) => c.value === skill?.category);
                    const levelConfig = SKILL_LEVELS[es.level - 1];
                    return (
                      <div
                        key={es.skill_id}
                        className={`px-3 py-2 rounded-lg border ${catConfig?.color} flex items-center gap-2`}
                      >
                        <span className="font-medium">{skill?.name}</span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((l) => (
                            <Star
                              key={l}
                              className={`w-3 h-3 ${
                                l <= es.level
                                  ? "text-yellow-400 fill-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                        {es.certified && (
                          <span className="text-xs bg-green-500 text-white px-1 rounded">CC</span>
                        )}
                      </div>
                    );
                  })}
                  {empSkills.length === 0 && (
                    <span className="text-gray-400 text-sm">Chưa có kỹ năng</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Skill Level Legend */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <h3 className="font-medium text-gray-700 mb-3">Chú thích mức độ</h3>
        <div className="flex flex-wrap gap-4">
          {SKILL_LEVELS.map((level) => (
            <div key={level.value} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded ${level.color}`} />
              <span className="text-sm text-gray-600">
                {level.value} - {level.label}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-2 ml-4">
            <span className="text-xs bg-green-500 text-white px-1 rounded">CC</span>
            <span className="text-sm text-gray-600">Có chứng chỉ</span>
          </div>
        </div>
      </div>

      {/* Add Skill Modal */}
      {showSkillModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Thêm kỹ năng</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên kỹ năng <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={skillForm.name}
                  onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nhóm</label>
                <select
                  value={skillForm.category}
                  onChange={(e) => setSkillForm({ ...skillForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {SKILL_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                <textarea
                  value={skillForm.description}
                  onChange={(e) => setSkillForm({ ...skillForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setShowSkillModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                disabled={!skillForm.name}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Thêm mới
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
