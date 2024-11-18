"use client";
import {
  getAnnotatorDashboard,
  getAnnotatorTaskStats,
  getAnnotatorTimeStats,
  getAnnotatorPerformanceTrends,
} from "@/app/actions/annonatorDashboard";
import { getAnnotatorTasks } from "@/app/actions/annotatorTask";
import Loader from "@/components/ui/Loader/Loader";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AverageTaskTimeCardComponent from "./_components/average-task-time-card";
import TaskSubmissionChartComponent from "./_components/task-submission-chart";
import AnnotatorOverviewCardComponent from "./_components/annotator-project-overview-card";
import PersonalProgressChartComponent from "./_components/personal-progress-chart";

interface ServerResponse {
  error?: string;
  data?: string;
}

interface TaskData {
  _id: string;
  timeTaken: number;
  submitted: boolean;
  status: string;
  updatedAt: string;
}

interface TaskStats {
  _id: string;
  count: number;
}

interface TimeStats {
  averageTime: number;
  totalTime: number;
  taskCount: number;
}

interface PerformanceTrend {
  _id: string;
  completedTasks: number;
  totalTasks: number;
  averageTime: number;
}

interface AnnotatorDashboardData {
  tasksData: {
    totalAssignedTasks: number;
    averageTime: number;
    submittedTasks: number;
    pendingTasks: number;
    completionRate: number;
    taskStatuses: string[];
    accuracyRate: number;
  };
  personalStats: {
    accuracyRate: number;
    weeklyProgress: number;
    monthlyProgress: number;
  };
}

// Debug component to help visualize data
const DashboardDebug: React.FC<{
  dashboardData: AnnotatorDashboardData;
  taskStats: TaskStats[];
  timeStats: TimeStats;
  performanceTrends: PerformanceTrend[];
}> = ({ dashboardData, taskStats, timeStats, performanceTrends }) => (
  <div className="mt-8 p-4 bg-gray-50 rounded-lg">
    <h2 className="text-lg font-semibold mb-4">Debug Information</h2>
    <pre className="text-xs overflow-auto">
      {JSON.stringify(
        { dashboardData, taskStats, timeStats, performanceTrends },
        null,
        2
      )}
    </pre>
  </div>
);

export default function AnnotatorDashboardPage() {
  const [dashboardData, setDashboardData] = useState<AnnotatorDashboardData>({
    tasksData: {
      totalAssignedTasks: 0,
      averageTime: 0,
      submittedTasks: 0,
      pendingTasks: 0,
      completionRate: 0,
      taskStatuses: [],
      accuracyRate: 0,
    },
    personalStats: {
      accuracyRate: 0,
      weeklyProgress: 0,
      monthlyProgress: 0,
    },
  });

  const [taskStats, setTaskStats] = useState<TaskStats[]>([]);
  const [timeStats, setTimeStats] = useState<TimeStats>({
    averageTime: 0,
    totalTime: 0,
    taskCount: 0,
  });
  const [performanceTrends, setPerformanceTrends] = useState<PerformanceTrend[]>([]);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    if (session) {
      if (session?.user?.role === "project manager") {
        router.push("/dashboard");
        return;
      }
      init();
    }
  }, [session, router]);

  async function init() {
    try {
      console.log("Initializing dashboard...");
      
      // Get all necessary data
      const [tasksRes, dashboardRes, taskStatsRes, timeStatsRes, trendsRes] =
        await Promise.all([
          getAnnotatorTasks(),
          getAnnotatorDashboard(),
          getAnnotatorTaskStats(),
          getAnnotatorTimeStats(),
          getAnnotatorPerformanceTrends(),
        ]);

      console.log("Raw responses:", {
        tasksRes,
        dashboardRes,
        taskStatsRes,
        timeStatsRes,
        trendsRes,
      });

      // Process dashboard data
      if (dashboardRes && 'data' in dashboardRes && dashboardRes.data) {
        try {
          const parsedData: AnnotatorDashboardData = JSON.parse(dashboardRes.data);
          console.log("Parsed dashboard data:", parsedData);
          setDashboardData(parsedData);
        } catch (error) {
          console.error("Error parsing dashboard data:", error);
          setError("Failed to parse dashboard data");
        }
      } else if (dashboardRes && 'error' in dashboardRes) {
        console.error("Dashboard error:", dashboardRes.error);
        setError(dashboardRes.error ?? "Unknown error");
      }

      // Process task statistics
      if (taskStatsRes && "data" in taskStatsRes && taskStatsRes.data) {
        try {
          const parsedTaskStats: TaskStats[] = JSON.parse(taskStatsRes.data);
          console.log("Parsed task stats:", parsedTaskStats);
          setTaskStats(parsedTaskStats);
        } catch (error) {
          console.error("Error parsing task stats:", error);
        }
      }

      // Process time statistics
      if (timeStatsRes && "data" in timeStatsRes && timeStatsRes.data) {
        try {
          const parsedTimeStats: TimeStats = JSON.parse(timeStatsRes.data);
          console.log("Parsed time stats:", parsedTimeStats);
          setTimeStats(parsedTimeStats);
        } catch (error) {
          console.error("Error parsing time stats:", error);
        }
      }

      // Process performance trends
      if (trendsRes && "data" in trendsRes && trendsRes.data) {
        try {
          const parsedTrends: PerformanceTrend[] = JSON.parse(trendsRes.data);
          console.log("Parsed performance trends:", parsedTrends);
          setPerformanceTrends(parsedTrends);
        } catch (error) {
          console.error("Error parsing performance trends:", error);
        }
      }
    } catch (error) {
      console.error("Error in init function:", error);
      setError("Failed to initialize dashboard");
    }
  }

  if (!session) {
    return <Loader />;
  }

  if (error) {
    return (
      <div className="min-h-screen p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="font-medium">Error loading dashboard</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (session?.user?.role === "annotator")
    return (
      <div className="min-h-screen">
        <header className="bg-white">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              My Dashboard
            </h1>
          </div>
        </header>
        <main className="w-full mx-auto space-y-5 sm:px-6 lg:px-8">
          <div className="flex gap-5">
            <PersonalProgressChartComponent
              taskStatuses={dashboardData.tasksData.taskStatuses}
              totalTasks={dashboardData.tasksData.totalAssignedTasks}
              completionRate={dashboardData.tasksData.completionRate}
            />
            <AverageTaskTimeCardComponent
              time={dashboardData.tasksData.averageTime}
              totalTasks={dashboardData.tasksData.totalAssignedTasks}
            />
            <TaskSubmissionChartComponent
              totalTasks={dashboardData.tasksData.totalAssignedTasks}
              submittedTasks={dashboardData.tasksData.submittedTasks}
            />
          </div>
            <AnnotatorOverviewCardComponent
            totalTasks={dashboardData.tasksData.totalAssignedTasks}
            pendingTasks={dashboardData.tasksData.pendingTasks}
            accuracyRate={dashboardData.personalStats.accuracyRate}
            ratings={0}
            earnings={0}
            // weeklyProgress={dashboardData.personalStats.weeklyProgress}
            // monthlyProgress={dashboardData.personalStats.monthlyProgress}
            />
            
            {/* Debug component - remove in production
            <DashboardDebug
            dashboardData={dashboardData}
            taskStats={taskStats}
            timeStats={timeStats}
            performanceTrends={performanceTrends}
            /> */}
          </main>
      </div>
    );

  return null;
}