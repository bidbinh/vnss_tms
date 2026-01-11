"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  Building2,
  Users,
  User,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  Briefcase,
  MapPin,
  Calendar,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  position_id: string | null;
  position_name: string | null;
  department_id: string | null;
  department_name: string | null;
  branch_id: string | null;
  branch_name: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  employee_type: string;
  manager_id: string | null;
  join_date: string | null;
}

interface Stats {
  total_employees: number;
  total_departments: number;
  total_branches: number;
}

interface OrgNode {
  employee: Employee;
  children: OrgNode[];
  level: number;
}

export default function OrgChartPage() {
  const t = useTranslations("hrm.orgChartPage");

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<Stats>({ total_employees: 0, total_departments: 0, total_branches: 0 });
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [hoveredEmployee, setHoveredEmployee] = useState<Employee | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchData();
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [branchesData, deptData, firstPage] = await Promise.all([
        apiFetch<any[]>("/hrm/branches"),
        apiFetch<any[]>("/hrm/departments"),
        apiFetch<{ items: Employee[]; total: number }>("/hrm/employees?page_size=200"),
      ]);

      // Fetch remaining pages if needed
      let allEmployees = [...firstPage.items];
      const total = firstPage.total || 0;
      const totalPages = Math.ceil(total / 200);

      if (totalPages > 1) {
        const remainingPages = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, i) =>
            apiFetch<{ items: Employee[] }>(`/hrm/employees?page=${i + 2}&page_size=200`)
          )
        );
        remainingPages.forEach(page => {
          allEmployees = allEmployees.concat(page.items);
        });
      }

      setEmployees(allEmployees);
      setStats({
        total_employees: total,
        total_departments: deptData.length || 0,
        total_branches: branchesData.length || 0,
      });

      // Auto expand all management levels
      const initialExpanded = new Set<string>();
      allEmployees.forEach(emp => {
        const hasChildren = allEmployees.some(e => e.manager_id === emp.id);
        if (hasChildren) {
          initialExpanded.add(emp.id);
        }
      });
      setExpandedNodes(initialExpanded);
    } catch (error) {
      console.error("Failed to fetch org data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const buildOrgTree = (): OrgNode[] => {
    const nodeMap = new Map<string, OrgNode>();
    employees.forEach(emp => {
      nodeMap.set(emp.id, { employee: emp, children: [], level: 0 });
    });

    const roots: OrgNode[] = [];
    employees.forEach(emp => {
      const node = nodeMap.get(emp.id)!;
      if (emp.manager_id && nodeMap.has(emp.manager_id)) {
        nodeMap.get(emp.manager_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    const setLevels = (node: OrgNode, level: number) => {
      node.level = level;
      node.children.forEach(child => setLevels(child, level + 1));
    };
    roots.forEach(root => setLevels(root, 0));

    return roots;
  };

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return parts[0][0] + parts[parts.length - 1][0];
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getRoleType = (position: string | null, level: number, hasChildren: boolean): "ceo" | "branch_manager" | "dept_head" | "team_lead" | "staff" => {
    const pos = (position || "").toLowerCase();
    if (pos.includes("giám đốc điều hành") || pos.includes("ceo") || pos.includes("tổng giám đốc")) return "ceo";
    if (pos.includes("trưởng chi nhánh") || pos.includes("branch")) return "branch_manager";
    if (pos.includes("trưởng phòng") || pos.includes("department") || (level === 2 && hasChildren)) return "dept_head";
    if (pos.includes("team leader") || pos.includes("nhóm trưởng") || pos.includes("leader") || (level === 3 && hasChildren)) return "team_lead";
    return "staff";
  };

  const getNodeColors = (roleType: string) => {
    switch (roleType) {
      case "ceo": return { bg: "bg-gradient-to-br from-amber-500 to-orange-600", text: "text-white", avatar: "bg-white/20" };
      case "branch_manager": return { bg: "bg-gradient-to-br from-indigo-500 to-purple-600", text: "text-white", avatar: "bg-white/20" };
      case "dept_head": return { bg: "bg-gradient-to-br from-teal-500 to-emerald-600", text: "text-white", avatar: "bg-white/20" };
      case "team_lead": return { bg: "bg-gradient-to-br from-sky-500 to-blue-600", text: "text-white", avatar: "bg-white/20" };
      default: return { bg: "bg-white border border-gray-200", text: "text-gray-800", avatar: "bg-gray-100" };
    }
  };

  const getSubtitle = (emp: Employee, roleType: string): string => {
    switch (roleType) {
      case "ceo": return emp.position_name || t("legend.ceo");
      case "branch_manager": return emp.branch_name ? `${t("tooltip.branch")} ${emp.branch_name}` : (emp.position_name || t("legend.branchManager"));
      case "dept_head": return emp.department_name || (emp.position_name || t("legend.deptHead"));
      case "team_lead": return emp.department_name || (emp.position_name || t("legend.teamLead"));
      default: return emp.position_name || t("legend.staff");
    }
  };

  const handleMouseEnter = (e: React.MouseEvent, emp: Employee) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({ x: rect.right + 10, y: rect.top });

    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredEmployee(emp);
      setShowTooltip(true);
    }, 600);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setShowTooltip(false);
    setHoveredEmployee(null);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return t("tooltip.notUpdated");
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  // Render a single employee card
  const EmployeeCard = ({ emp, roleType, hasChildren, isExpanded, onToggle }: {
    emp: Employee;
    roleType: string;
    hasChildren: boolean;
    isExpanded: boolean;
    onToggle?: () => void;
  }) => {
    const colors = getNodeColors(roleType);
    const subtitle = getSubtitle(emp, roleType);
    const isStaff = roleType === "staff";

    return (
      <div
        className={`relative flex items-center gap-3 px-4 py-3 rounded-xl shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${colors.bg} ${colors.text}`}
        style={{ minWidth: isStaff ? "160px" : "200px", maxWidth: isStaff ? "180px" : "240px" }}
        onClick={onToggle}
        onMouseEnter={(e) => handleMouseEnter(e, emp)}
        onMouseLeave={handleMouseLeave}
      >
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${colors.avatar}`}>
          {getInitials(emp.full_name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{emp.full_name}</div>
          <div className={`text-xs truncate ${isStaff ? "text-gray-500" : "opacity-80"}`}>{subtitle}</div>
        </div>
        {hasChildren && (
          <div className="flex-shrink-0 opacity-70">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        )}
      </div>
    );
  };

  // Render staff group (vertical compact list)
  const StaffGroup = ({ nodes }: { nodes: OrgNode[] }) => {
    if (nodes.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-2 mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
        {nodes.map(node => (
          <EmployeeCard
            key={node.employee.id}
            emp={node.employee}
            roleType="staff"
            hasChildren={false}
            isExpanded={false}
          />
        ))}
      </div>
    );
  };

  // Render management level (horizontal layout with vertical connector)
  const renderManagerNode = (node: OrgNode): React.ReactNode => {
    const { employee, children, level } = node;
    const hasChildren = children.length > 0;
    const isExpanded = expandedNodes.has(employee.id);
    const roleType = getRoleType(employee.position_name, level, hasChildren);

    // Separate children into managers and staff
    const managerChildren = children.filter(c => {
      const childRoleType = getRoleType(c.employee.position_name, c.level, c.children.length > 0);
      return childRoleType !== "staff";
    });
    const staffChildren = children.filter(c => {
      const childRoleType = getRoleType(c.employee.position_name, c.level, c.children.length > 0);
      return childRoleType === "staff";
    });

    return (
      <div key={employee.id} className="flex flex-col items-center">
        {/* The manager card */}
        <EmployeeCard
          emp={employee}
          roleType={roleType}
          hasChildren={hasChildren}
          isExpanded={isExpanded}
          onToggle={() => hasChildren && toggleNode(employee.id)}
        />

        {/* Children section */}
        {hasChildren && isExpanded && (
          <div className="flex flex-col items-center mt-2">
            {/* Vertical connector line */}
            <div className="w-0.5 h-4 bg-gray-300" />

            {/* Staff members (compact grid) */}
            {staffChildren.length > 0 && (
              <StaffGroup nodes={staffChildren} />
            )}

            {/* Manager children (horizontal layout) */}
            {managerChildren.length > 0 && (
              <div className="relative">
                {/* Horizontal connector for multiple children */}
                {managerChildren.length > 1 && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 h-0.5 bg-gray-300"
                    style={{ width: `calc(100% - 100px)` }}
                  />
                )}

                <div className="flex gap-6 pt-4">
                  {managerChildren.map((child, index) => (
                    <div key={child.employee.id} className="relative flex flex-col items-center">
                      {/* Vertical line from horizontal connector */}
                      {managerChildren.length > 1 && (
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0.5 h-4 bg-gray-300 -mt-4" />
                      )}
                      {renderManagerNode(child)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const orgTree = buildOrgTree();

  return (
    <div className="p-6 space-y-6">
      {/* Tooltip */}
      {showTooltip && hoveredEmployee && (
        <div
          className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 min-w-[280px] animate-in fade-in duration-200"
          style={{
            left: Math.min(tooltipPosition.x, window.innerWidth - 320),
            top: Math.min(tooltipPosition.y, window.innerHeight - 280),
          }}
        >
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
              {getInitials(hoveredEmployee.full_name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900">{hoveredEmployee.full_name}</div>
              <div className="text-sm text-blue-600 font-medium">{hoveredEmployee.employee_code}</div>
            </div>
          </div>

          <div className="mt-4 space-y-2.5 text-sm">
            <div className="flex items-center gap-2.5 text-gray-700">
              <Briefcase className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>{hoveredEmployee.position_name || t("tooltip.noPosition")}</span>
            </div>

            {hoveredEmployee.department_name && (
              <div className="flex items-center gap-2.5 text-gray-700">
                <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>{hoveredEmployee.department_name}</span>
              </div>
            )}

            {hoveredEmployee.branch_name && (
              <div className="flex items-center gap-2.5 text-gray-700">
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>{t("tooltip.branch")} {hoveredEmployee.branch_name}</span>
              </div>
            )}

            {hoveredEmployee.phone && (
              <div className="flex items-center gap-2.5 text-gray-700">
                <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>{hoveredEmployee.phone}</span>
              </div>
            )}

            {hoveredEmployee.email && (
              <div className="flex items-center gap-2.5 text-gray-700">
                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="truncate">{hoveredEmployee.email}</span>
              </div>
            )}

            <div className="flex items-center gap-2.5 text-gray-700">
              <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>{t("tooltip.joinDate")}: {formatDate(hoveredEmployee.join_date)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-gray-600 mt-1">{t("subtitle")}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 rounded-lg">
              <Building2 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">{t("stats.branches")}</div>
              <div className="text-xl font-bold text-gray-900">{stats.total_branches}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-50 rounded-lg">
              <Building2 className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">{t("stats.departments")}</div>
              <div className="text-xl font-bold text-gray-900">{stats.total_departments}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 rounded-lg">
              <Users className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">{t("stats.totalEmployees")}</div>
              <div className="text-xl font-bold text-gray-900">{stats.total_employees}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Organization Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 overflow-x-auto">
        {orgTree.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="font-medium">{t("noEmployees")}</p>
            <p className="text-sm mt-2">{t("noEmployeesDesc")}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-8 min-w-max">
            {orgTree.map((root) => (
              <div key={root.employee.id}>
                {renderManagerNode(root)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="font-medium text-gray-900 mb-3">{t("legend.title")}</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600" />
            <span className="text-gray-600">{t("legend.ceo")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600" />
            <span className="text-gray-600">{t("legend.branchManager")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600" />
            <span className="text-gray-600">{t("legend.deptHead")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600" />
            <span className="text-gray-600">{t("legend.teamLead")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg bg-white border border-gray-200" />
            <span className="text-gray-600">{t("legend.staff")}</span>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          {t("hint")}
        </p>
      </div>
    </div>
  );
}
