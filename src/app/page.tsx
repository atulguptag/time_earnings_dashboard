"use client";

import { useState, useMemo, useCallback, ReactNode, memo } from "react";
import { Poppins, Space_Grotesk } from "next/font/google";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import {
  Upload,
  LayoutDashboard,
  BarChart2,
  PieChart as PieChartIcon,
  Filter,
  File,
  X,
  Calendar,
  DollarSign,
  Clock,
  Briefcase,
  Type,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  List,
} from "lucide-react";
import Papa from "papaparse";
import {
  format,
  parse,
  startOfWeek,
  startOfMonth,
  startOfYear,
} from "date-fns";

const poppins = Poppins({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
});
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"] });

// --- TYPE DEFINITIONS ---
interface CsvData {
  workDate: string;
  itemID: string;
  duration: number;
  durationString: string; // Keep original duration string
  rateApplied: string;
  payout: number;
  payType: string;
  projectName: string;
  status: string;
}

interface Filters {
  timeRange: string;
  projectName: string[];
  payType: string[];
  status: string;
  startDate: string;
  endDate: string;
  singleDate: string;
}

// --- HELPER FUNCTIONS & CONSTANTS ---
const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#ff4d4d",
];
const cardContent = [
  {
    icon: <DollarSign className="w-8 h-8 text-green-500" />,
    accessor: (data: CsvData[]) =>
      `$${data.reduce((acc, item) => acc + item.payout, 0).toFixed(2)}`,
    title: "Total Payout",
  },
  {
    icon: <Clock className="w-8 h-8 text-blue-500" />,
    accessor: (data: CsvData[]) => {
      const totalSeconds = data.reduce((acc, item) => acc + item.duration, 0);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    },
    title: "Total Hours Worked",
  },
  {
    icon: <Briefcase className="w-8 h-8 text-indigo-500" />,
    accessor: (data: CsvData[]) =>
      new Set(data.map((item) => item.projectName)).size,
    title: "Projects Worked On",
  },
  {
    icon: <CheckCircle className="w-8 h-8 text-cyan-500" />,
    accessor: (data: CsvData[]) =>
      new Set(data.map((item) => item.itemID)).size,
    title: "Tasks Completed",
  },
];

// --- UI COMPONENTS ---
const Card = memo(({ children }: { children: ReactNode }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6 transition-all duration-200 hover:shadow-lg">
    {children}
  </div>
));
Card.displayName = "Card";

const IconButton = memo(
  ({
    icon,
    onClick,
    children,
    className = "",
  }: {
    icon: ReactNode;
    onClick?: () => void;
    children: ReactNode;
    className?: string;
  }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-blue-500 text-white rounded-lg font-semibold cursor-pointer hover:bg-blue-600 transition-colors duration-200 text-sm sm:text-base ${className}`}
    >
      {icon}
      {children}
    </button>
  )
);
IconButton.displayName = "IconButton";

const FilterSelect = memo(
  ({
    label,
    options,
    value,
    onChange,
    icon,
  }: {
    label: string;
    options: string[];
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    icon: ReactNode;
  }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
        {icon}
        {label}
      </label>
      <select
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 hover:border-blue-400 text-sm sm:text-base"
      >
        <option value="">All {label}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  )
);
FilterSelect.displayName = "FilterSelect";

const MultiFilterSelect = memo(
  ({
    label,
    options,
    value,
    onChange,
    icon,
  }: {
    label: string;
    options: string[];
    value: string[];
    onChange: (values: string[]) => void;
    icon: ReactNode;
  }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleToggle = (option: string) => {
      if (value.includes(option)) {
        onChange(value.filter((v) => v !== option));
      } else {
        onChange([...value, option]);
      }
    };

    const handleClearAll = () => {
      onChange([]);
    };

    return (
      <div className="space-y-2 relative">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          {icon}
          {label} {value.length > 0 && `(${value.length})`}
        </label>

        <div className="relative">
          <div
            onClick={() => setIsOpen(!isOpen)}
            className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 hover:border-blue-400 text-sm sm:text-base min-h-[44px] flex items-center justify-between"
          >
            <div className="flex-1">
              {value.length === 0 ? (
                <span className="text-gray-500 dark:text-gray-400">
                  All {label}
                </span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {value.slice(0, 2).map((item) => (
                    <span
                      key={item}
                      className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs font-medium flex items-center gap-1"
                    >
                      {item.length > 12 ? `${item.substring(0, 12)}...` : item}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggle(item);
                        }}
                        className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5 transition-colors duration-150"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {value.length > 2 && (
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full text-xs font-medium">
                      +{value.length - 2} more
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="ml-2 flex-shrink-0">
              {isOpen ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </div>
          </div>

          {isOpen && (
            <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-hidden">
              <div className="p-3 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Select {label}
                </span>
                {value.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors duration-150 cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
                {options.map((option) => (
                  <div
                    key={option}
                    className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2 transition-colors duration-150 ${
                      value.includes(option)
                        ? "bg-blue-50 dark:bg-blue-900/30"
                        : ""
                    }`}
                    onClick={() => handleToggle(option)}
                  >
                    <input
                      type="checkbox"
                      checked={value.includes(option)}
                      onChange={() => {}}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-sm flex-1">{option}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Click outside to close */}
        {isOpen && (
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
        )}
      </div>
    );
  }
);
MultiFilterSelect.displayName = "MultiFilterSelect";

const DateInput = memo(
  ({
    label,
    value,
    onChange,
    icon,
  }: {
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    icon: ReactNode;
  }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
        {icon}
        {label}
      </label>
      <input
        type="date"
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 hover:border-blue-400 text-sm sm:text-base"
      />
    </div>
  )
);
DateInput.displayName = "DateInput";

const UploadView = ({
  onFileUpload,
  setErrorMessage,
}: {
  onFileUpload: (file: File) => void;
  setErrorMessage: (message: string) => void;
}) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== "text/csv") {
        setErrorMessage("Invalid file type. Please upload a CSV file.");
        return;
      }
      setErrorMessage("");
      onFileUpload(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      if (file.type !== "text/csv") {
        setErrorMessage("Invalid file type. Please upload a CSV file.");
        return;
      }
      setErrorMessage("");
      onFileUpload(file);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center bg-white dark:bg-gray-800 shadow-md cursor-pointer transition-all duration-300 hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        <div className="flex flex-col items-center justify-center space-y-4">
          <Upload className="w-16 h-16 text-blue-500" />
          <p
            className={`text-2xl font-semibold text-gray-700 dark:text-gray-200 ${poppins.className}`}
          >
            Drag & Drop your CSV file here
          </p>
          <p className="text-gray-500 dark:text-gray-400">or</p>
          <label
            htmlFor="file-upload"
            className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold cursor-pointer hover:bg-blue-600 transition-colors duration-300"
          >
            <File className="w-5 h-5" />
            Browse Files
          </label>
          <input
            id="file-upload"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
};

// --- Main Dashboard Component ---
const Dashboard = ({
  data,
  onReplaceCsv,
}: {
  data: CsvData[];
  onReplaceCsv: () => void;
}) => {
  const [filters, setFilters] = useState<Filters>({
    timeRange: "all",
    projectName: [],
    payType: [],
    status: "",
    startDate: "",
    endDate: "",
    singleDate: "",
  });

  const [isFilterCollapsed, setIsFilterCollapsed] = useState(false);

  const uniqueProjects = useMemo(
    () => Array.from(new Set(data.map((item) => item.projectName))),
    [data]
  );
  const uniquePayTypes = useMemo(
    () => Array.from(new Set(data.map((item) => item.payType))),
    [data]
  );
  const uniqueStatuses = useMemo(
    () => Array.from(new Set(data.map((item) => item.status))),
    [data]
  );

  const filteredData = useMemo(() => {
    let filtered = data;
    const now = new Date();

    // Single date filtering (highest priority)
    if (filters.singleDate) {
      const singleDate = new Date(filters.singleDate);
      filtered = filtered.filter((item) => {
        const itemDate = parse(item.workDate, "MMM d, yyyy", new Date());
        if (isNaN(itemDate.getTime())) return false;
        return (
          format(itemDate, "yyyy-MM-dd") === format(singleDate, "yyyy-MM-dd")
        );
      });
    }
    // Date range filtering
    else if (filters.startDate && filters.endDate) {
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);
      // Set time to start of day for start date and end of day for end date
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      filtered = filtered.filter((item) => {
        const itemDate = parse(item.workDate, "MMM d, yyyy", new Date());
        if (isNaN(itemDate.getTime())) return false;
        // Set time to start of day for comparison
        itemDate.setHours(0, 0, 0, 0);
        return itemDate >= startDate && itemDate <= endDate;
      });
    }
    // Quick select filtering
    else if (filters.timeRange !== "all") {
      filtered = filtered.filter((item) => {
        const itemDate = parse(item.workDate, "MMM d, yyyy", new Date());
        if (isNaN(itemDate.getTime())) return false;

        switch (filters.timeRange) {
          case "week": {
            const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday as start of week
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);
            return itemDate >= weekStart && itemDate <= weekEnd;
          }
          case "month": {
            const monthStart = startOfMonth(now);
            const monthEnd = new Date(monthStart);
            monthEnd.setMonth(monthEnd.getMonth() + 1);
            monthEnd.setDate(0); // Last day of current month
            monthEnd.setHours(23, 59, 59, 999);
            return itemDate >= monthStart && itemDate <= monthEnd;
          }
          case "year": {
            const yearStart = startOfYear(now);
            const yearEnd = new Date(yearStart);
            yearEnd.setFullYear(yearEnd.getFullYear() + 1);
            yearEnd.setDate(0); // Last day of current year
            yearEnd.setHours(23, 59, 59, 999);
            return itemDate >= yearStart && itemDate <= yearEnd;
          }
          default:
            return true;
        }
      });
    }

    if (filters.projectName.length > 0) {
      filtered = filtered.filter((item) =>
        filters.projectName.includes(item.projectName)
      );
    }
    if (filters.payType.length > 0) {
      filtered = filtered.filter((item) =>
        filters.payType.includes(item.payType)
      );
    }
    if (filters.status) {
      filtered = filtered.filter((item) => item.status === filters.status);
    }

    return filtered;
  }, [data, filters]);

  const handleFilterChange = (filterName: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
  };

  const handleMultiFilterChange = (
    filterName: keyof Filters,
    values: string[]
  ) => {
    setFilters((prev) => ({ ...prev, [filterName]: values }));
  };

  const dailyData = useMemo(() => {
    const grouped = filteredData.reduce((acc, item) => {
      const itemDate = parse(item.workDate, "MMM d, yyyy", new Date());
      if (isNaN(itemDate.getTime())) {
        return acc;
      }
      const date = format(itemDate, "yyyy-MM-dd");
      if (!acc[date]) {
        acc[date] = { date, earnings: 0, hours: 0 };
      }
      acc[date].earnings += item.payout;
      acc[date].hours += item.duration / 3600;
      return acc;
    }, {} as Record<string, { date: string; earnings: number; hours: number }>);
    return Object.values(grouped).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [filteredData]);

  const projectPayoutData = useMemo(() => {
    const grouped = filteredData.reduce((acc, item) => {
      if (!acc[item.projectName]) {
        acc[item.projectName] = 0;
      }
      acc[item.projectName] += item.payout;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  const payTypeData = useMemo(() => {
    const grouped = filteredData.reduce((acc, item) => {
      if (!acc[item.payType]) {
        acc[item.payType] = 0;
      }
      acc[item.payType] += item.payout;
      return acc;
    }, {} as Record<string, number>);
    const result = Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .filter((item) => item.value > 0) // Only include non-zero values
      .sort((a, b) => b.value - a.value);

    return result;
  }, [filteredData]);

  const getDateRangeText = (timeRange: string) => {
    if (timeRange === "all") return "";

    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (timeRange) {
      case "week": {
        startDate = startOfWeek(now, { weekStartsOn: 1 }); // Monday as start of week
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        break;
      }
      case "month": {
        startDate = startOfMonth(now);
        endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0); // Last day of current month
        break;
      }
      case "year": {
        startDate = startOfYear(now);
        endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + 1);
        endDate.setDate(0); // Last day of current year
        break;
      }
      default:
        return "";
    }

    return `${format(startDate, "MMM d, yyyy")} - ${format(
      endDate,
      "MMM d, yyyy"
    )}`;
  };

  const clearFilters = () => {
    setFilters({
      timeRange: "all",
      projectName: [],
      payType: [],
      status: "",
      startDate: "",
      endDate: "",
      singleDate: "",
    });
  };

  return (
    <div className={`p-3 sm:p-4 md:p-6 lg:p-8 ${spaceGrotesk.className}`}>
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <LayoutDashboard className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 flex-shrink-0" />
          <h1
            className={`text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 dark:text-white leading-tight ${poppins.className}`}
          >
            Earnings Dashboard
          </h1>
        </div>
        <div className="w-full sm:w-auto">
          <IconButton
            icon={<File className="w-4 h-4 sm:w-5 sm:h-5" />}
            onClick={onReplaceCsv}
          >
            Replace CSV
          </IconButton>
        </div>
      </header>

      {/* --- Filter Section --- */}
      <Card>
        <div
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 cursor-pointer"
          onClick={() => setIsFilterCollapsed(!isFilterCollapsed)}
        >
          <div className="flex items-center gap-3 mb-4 sm:mb-0">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Filter className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                Filter Data
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Customize your view with advanced filtering options
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearFilters();
              }}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 cursor-pointer"
            >
              Clear All Filters
            </button>
            <div className="p-2 text-gray-600 dark:text-gray-300">
              {isFilterCollapsed ? (
                <ChevronDown className="w-5 h-5" />
              ) : (
                <ChevronUp className="w-5 h-5" />
              )}
            </div>
          </div>
        </div>

        {!isFilterCollapsed && (
          <div className="space-y-6">
            {/* Date Range Section */}
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                Date Range
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <FilterSelect
                    label="Quick Select"
                    icon={<Calendar className="w-4 h-4" />}
                    options={["week", "month", "year"]}
                    value={filters.timeRange}
                    onChange={(e) => {
                      handleFilterChange("timeRange", e.target.value);
                      if (e.target.value !== "all") {
                        handleFilterChange("startDate", "");
                        handleFilterChange("endDate", "");
                        handleFilterChange("singleDate", "");
                      }
                    }}
                  />
                  {filters.timeRange !== "all" && filters.timeRange !== "" && (
                    <div className="mt-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                      <p className="text-xs text-blue-700 dark:text-blue-300 font-medium flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {getDateRangeText(filters.timeRange)}
                      </p>
                    </div>
                  )}
                </div>
                <DateInput
                  label="Single Date"
                  icon={<Calendar className="w-4 h-4" />}
                  value={filters.singleDate}
                  onChange={(e) => {
                    handleFilterChange("singleDate", e.target.value);
                    if (e.target.value) {
                      handleFilterChange("timeRange", "all");
                      handleFilterChange("startDate", "");
                      handleFilterChange("endDate", "");
                    }
                  }}
                />
                <DateInput
                  label="Start Date"
                  icon={<Calendar className="w-4 h-4" />}
                  value={filters.startDate}
                  onChange={(e) => {
                    handleFilterChange("startDate", e.target.value);
                    if (e.target.value) {
                      handleFilterChange("timeRange", "all");
                      handleFilterChange("singleDate", "");
                    }
                  }}
                />
                <DateInput
                  label="End Date"
                  icon={<Calendar className="w-4 h-4" />}
                  value={filters.endDate}
                  onChange={(e) => {
                    handleFilterChange("endDate", e.target.value);
                    if (e.target.value) {
                      handleFilterChange("timeRange", "all");
                      handleFilterChange("singleDate", "");
                    }
                  }}
                />
              </div>
            </div>

            {/* Other Filters Section */}
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <Filter className="w-5 h-5 text-blue-500" />
                Category Filters
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <MultiFilterSelect
                  label="Projects"
                  icon={<Briefcase className="w-4 h-4" />}
                  options={uniqueProjects}
                  value={filters.projectName}
                  onChange={(values) =>
                    handleMultiFilterChange("projectName", values)
                  }
                />
                <MultiFilterSelect
                  label="Pay Types"
                  icon={<Type className="w-4 h-4" />}
                  options={uniquePayTypes}
                  value={filters.payType}
                  onChange={(values) =>
                    handleMultiFilterChange("payType", values)
                  }
                />
                <FilterSelect
                  label="Status"
                  icon={<CheckCircle className="w-4 h-4" />}
                  options={uniqueStatuses}
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                />
              </div>
            </div>

            {/* Active Filters Display */}
            {(filters.timeRange !== "all" ||
              filters.projectName.length > 0 ||
              filters.payType.length > 0 ||
              filters.status ||
              filters.startDate ||
              filters.endDate ||
              filters.singleDate) && (
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Active filters:
                </span>
                {filters.timeRange !== "all" && (
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
                    {filters.timeRange}
                  </span>
                )}
                {filters.singleDate && (
                  <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded-full text-sm font-medium">
                    {filters.singleDate}
                  </span>
                )}
                {filters.startDate && filters.endDate && (
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm font-medium">
                    {filters.startDate} to {filters.endDate}
                  </span>
                )}
                {filters.projectName.length > 0 && (
                  <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-sm font-medium">
                    Projects ({filters.projectName.length})
                  </span>
                )}
                {filters.payType.length > 0 && (
                  <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded-full text-sm font-medium">
                    Pay Types ({filters.payType.length})
                  </span>
                )}
                {filters.status && (
                  <span className="px-3 py-1 bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200 rounded-full text-sm font-medium">
                    {filters.status}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* --- Stats Cards --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 my-8">
        {cardContent.map(({ icon, accessor, title }) => (
          <Card key={title}>
            <div className="flex items-center gap-4">
              {icon}
              <div>
                <p className="text-3xl font-bold text-gray-800 dark:text-white">
                  {accessor(filteredData)}
                </p>
                <p className="text-gray-500 dark:text-gray-400">{title}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* --- Charts --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-700 dark:text-white">
              Daily Earnings
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  color: "#333333",
                }}
                labelStyle={{ color: "#333333" }}
                formatter={(value: number) => [
                  `$${value.toFixed(2)}`,
                  "Earnings",
                ]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="earnings"
                stroke="#8884d8"
                strokeWidth={2}
                name="Earnings ($)"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-700 dark:text-white">
              Daily Hours Worked
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  color: "#333333",
                }}
                labelStyle={{ color: "#333333" }}
                formatter={(value: number) => [
                  `${value.toFixed(2)} hrs`,
                  "Hours Worked",
                ]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="hours"
                stroke="#82ca9d"
                strokeWidth={2}
                name="Hours Worked"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* --- Additional Charts --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-300" />
            <h3 className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-white">
              Payout by Project
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={500}>
            <PieChart>
              <Pie
                data={projectPayoutData}
                cx="50%"
                cy="45%"
                labelLine={false}
                outerRadius="60%"
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
              >
                {projectPayoutData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
              <Legend
                wrapperStyle={{
                  paddingTop: "20px",
                  fontSize: "14px",
                }}
                iconSize={18}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-700 dark:text-white">
              Earnings by Pay Type
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={500}>
            <BarChart
              data={payTypeData}
              margin={{ top: 20, right: 30, left: 40, bottom: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                scale="log"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
                allowDataOverflow={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  color: "#333333",
                }}
                labelStyle={{ color: "#333333" }}
                formatter={(value: number) => [
                  `$${value.toFixed(2)}`,
                  "Earnings",
                ]}
              />
              <Legend />
              <Bar
                dataKey="value"
                name="Earnings ($)"
                radius={[4, 4, 0, 0]}
                minPointSize={5}
              >
                {payTypeData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* --- Detailed Breakdown --- */}
      <div className="mt-8">
        <Card>
          <div className="flex items-center gap-2 mb-6">
            <List className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-700 dark:text-white">
              Detailed Breakdown
            </h3>
            <span className="ml-2 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
              {filteredData.length} records
            </span>
          </div>

          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full text-xs sm:text-sm text-left">
                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                  <tr>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      Date
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap hidden sm:table-cell">
                      Item ID
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      Duration
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap hidden md:table-cell">
                      Rate
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      Payout
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      Pay Type
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap hidden lg:table-cell">
                      Project
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {filteredData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                      >
                        No data matches your current filters
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((item, index) => (
                      <tr
                        key={`${item.itemID}-${index}`}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150"
                      >
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900 dark:text-white font-medium whitespace-nowrap">
                          {item.workDate}
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-600 dark:text-gray-300 font-mono text-xs hidden sm:table-cell">
                          {item.itemID}
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {item.durationString}
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-600 dark:text-gray-300 hidden md:table-cell">
                          {item.rateApplied}
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900 dark:text-white font-semibold whitespace-nowrap">
                          ${item.payout.toFixed(2)}
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3">
                          <span className="px-1 sm:px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs font-medium">
                            {item.payType}
                          </span>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-600 dark:text-gray-300 hidden lg:table-cell">
                          {item.projectName}
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3">
                          <span
                            className={`px-1 sm:px-2 py-1 rounded-full text-xs font-medium ${
                              item.status === "processed"
                                ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                                : "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

// --- Main Page Component ---
export default function HomePage() {
  const [csvData, setCsvData] = useState<CsvData[] | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [fileName, setFileName] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleFileUpload = useCallback((file: File) => {
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setErrorMessage("File size too large. Maximum allowed size is 10MB.");
      return;
    }

    // Validate file name
    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      preview: 10000, // Limit to 10k rows for performance
      complete: (results) => {
        // Basic validation for required columns
        const requiredColumns = [
          "workDate",
          "itemID",
          "duration",
          "rateApplied",
          "payout",
          "payType",
          "projectName",
          "status",
        ];
        const headers = results.meta.fields || [];
        const missingColumns = requiredColumns.filter(
          (col) => !headers.includes(col)
        );

        if (missingColumns.length > 0) {
          setErrorMessage(
            `CSV is missing required columns: ${missingColumns.join(", ")}`
          );
          setCsvData(null);
          return;
        }

        const parseDuration = (durationStr: unknown): number => {
          if (typeof durationStr !== "string" || durationStr === "-") return 0;
          let totalSeconds = 0;
          const hoursMatch = durationStr.match(/(\d+)\s*h/);
          const minutesMatch = durationStr.match(/(\d+)\s*m/);
          const secondsMatch = durationStr.match(/(\d+)\s*s/);
          if (hoursMatch) totalSeconds += parseInt(hoursMatch[1], 10) * 3600;
          if (minutesMatch) totalSeconds += parseInt(minutesMatch[1], 10) * 60;
          if (secondsMatch) totalSeconds += parseInt(secondsMatch[1], 10);
          return totalSeconds;
        };

        const cleanedData = (results.data as Record<string, unknown>[])
          .slice(0, 5000) // Limit processing to 5k rows
          .map((row: Record<string, unknown>) => {
            // Validate row structure
            if (!row || typeof row !== "object") return null;

            // Sanitize string inputs
            const sanitizeString = (str: unknown): string => {
              if (typeof str !== "string") return String(str || "");
              return str
                .replace(
                  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
                  ""
                )
                .substring(0, 200);
            };

            if (!row.workDate || typeof row.workDate !== "string") {
              return null;
            }

            const itemDate = parse(row.workDate, "MMM d, yyyy", new Date());
            if (isNaN(itemDate.getTime())) {
              return null;
            }

            return {
              workDate: sanitizeString(row.workDate),
              itemID: sanitizeString(row.itemID),
              duration: parseDuration(row.duration),
              durationString: sanitizeString(row.duration) || "-",
              rateApplied: sanitizeString(row.rateApplied),
              payout: Math.max(
                0,
                Math.min(
                  1000000,
                  typeof row.payout === "string"
                    ? parseFloat(row.payout.replace(/[^0-9.-]/g, "")) || 0
                    : typeof row.payout === "number"
                    ? row.payout
                    : 0
                )
              ),
              payType: sanitizeString(row.payType),
              projectName: sanitizeString(row.projectName),
              status: sanitizeString(row.status),
            };
          })
          .filter((row): row is CsvData => row !== null);

        setCsvData(cleanedData);
        setErrorMessage("");
      },
      error: (error) => {
        setErrorMessage(
          `Error parsing CSV: ${String(error.message).substring(0, 100)}`
        );
        setCsvData(null);
      },
    });
  }, []);

  const handleReplaceCsv = useCallback(() => {
    setCsvData(null);
    setFileName("");
    setErrorMessage("");
  }, []);

  return (
    <main
      className={`min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 ${spaceGrotesk.className}`}
    >
      <div className="container mx-auto px-4 py-8">
        {!csvData ? (
          <div className="flex flex-col items-center justify-center min-h-[80vh]">
            <div className="text-center mb-8">
              <h1
                className={`text-4xl md:text-5xl font-bold text-gray-800 dark:text-white mb-2 ${poppins.className}`}
              >
                Analyze Your Work Efforts
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Upload your CSV to generate an interactive earnings dashboard.
              </p>
            </div>
            <UploadView
              onFileUpload={handleFileUpload}
              setErrorMessage={setErrorMessage}
            />
            {errorMessage && (
              <div className="mt-4 flex items-center gap-2 text-red-500 bg-red-100 dark:bg-red-900/20 p-3 rounded-lg">
                <X className="w-5 h-5" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        ) : (
          <Dashboard data={csvData} onReplaceCsv={handleReplaceCsv} />
        )}
      </div>
    </main>
  );
}
