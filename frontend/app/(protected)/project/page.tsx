"use client";

import { useState, useEffect } from "react";
import {
  FolderKanban,
  ListChecks,
  Milestone,
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface ProjectStats {
  total_projects: number;
  active_projects: number;
  total_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  team_members: number;
}

interface Project {
  id: string;
  name: string;
  status: string;
  progress_percent: number;
  end_date: string;
}

interface Task {
  id: string;
  status: string;
}

interface ApiResponse<T> {
  items: T[];
  total: number;
}

export default function ProjectDashboard() {
  const [stats, setStats] = useState<ProjectStats>({
    total_projects: 0,
    active_projects: 0,
    total_tasks: 0,
    completed_tasks: 0,
    overdue_tasks: 0,
    team_members: 0,
  });
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectsRes, tasksRes] = await Promise.all([
          apiFetch<ApiResponse<Project>>("/project/projects"),
          apiFetch<ApiResponse<Task>>("/project/tasks"),
        ]);

        const projects = projectsRes.items || [];
        const tasks = tasksRes.items || [];

        setStats({
          total_projects: projects.length,
          active_projects: projects.filter(p => p.status === "IN_PROGRESS").length,
          total_tasks: tasks.length,
          completed_tasks: tasks.filter(t => t.status === "DONE").length,
          overdue_tasks: 0,
          team_members: 0,
        });

        setRecentProjects(projects.slice(0, 4).map(p => ({
          id: p.id,
          name: p.name,
          status: p.status === "IN_PROGRESS" ? "In Progress" : p.status === "COMPLETED" ? "Completed" : p.status,
          progress_percent: p.progress_percent || 0,
          end_date: p.end_date || "",
        })));
      } catch (err) {
        console.error("Failed to fetch project stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Dashboard</h1>
          <p className="text-gray-500">Quản lý dự án và công việc</p>
        </div>
        <a
          href="/project/projects"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <FolderKanban className="w-4 h-4" />
          Tạo dự án mới
        </a>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FolderKanban className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tổng dự án</p>
              <p className="text-xl font-bold">{stats.total_projects}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Đang thực hiện</p>
              <p className="text-xl font-bold">{stats.active_projects}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ListChecks className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tổng tasks</p>
              <p className="text-xl font-bold">{stats.total_tasks}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Hoàn thành</p>
              <p className="text-xl font-bold">{stats.completed_tasks}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Quá hạn</p>
              <p className="text-xl font-bold text-red-600">{stats.overdue_tasks}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Users className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Thành viên</p>
              <p className="text-xl font-bold">{stats.team_members}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Projects */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Dự án gần đây</h2>
        <div className="space-y-4">
          {recentProjects.map((project) => (
            <div key={project.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{project.name}</h3>
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${
                      project.status === "Completed"
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {project.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {project.end_date}
                  </span>
                </div>
              </div>
              <div className="w-32">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        project.progress_percent === 100 ? "bg-green-500" : "bg-blue-500"
                      }`}
                      style={{ width: `${project.progress_percent}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{project.progress_percent}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <a
          href="/project/projects"
          className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border hover:bg-gray-50"
        >
          <FolderKanban className="w-5 h-5 text-blue-500" />
          <span>Dự án</span>
        </a>
        <a
          href="/project/tasks"
          className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border hover:bg-gray-50"
        >
          <ListChecks className="w-5 h-5 text-purple-500" />
          <span>Tasks</span>
        </a>
        <a
          href="/project/milestones"
          className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border hover:bg-gray-50"
        >
          <Milestone className="w-5 h-5 text-green-500" />
          <span>Milestones</span>
        </a>
        <a
          href="/project/resources"
          className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border hover:bg-gray-50"
        >
          <Users className="w-5 h-5 text-orange-500" />
          <span>Resources</span>
        </a>
      </div>
    </div>
  );
}
