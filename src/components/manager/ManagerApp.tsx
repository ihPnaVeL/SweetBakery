import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ProductManagement } from "../seller/ProductManagement";
import { OrderManagement } from "../seller/OrderManagement";
import { UserManagement } from "./UserManagement";
import { CategoryManagement } from "./CategoryManagement";
import { ScheduleManagement } from "./ScheduleManagement";
import { Dashboard } from "./Dashboard";
import { Profile } from "../customer/Profile";

type Tab = "dashboard" | "products" | "orders" | "users" | "categories" | "schedules" | "profile";

export function ManagerApp({ userProfile }: { userProfile: any }) {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const pendingOrders = useQuery(api.orders.getAllOrders, { status: "pending" }) || [];

  const tabs = [
    { id: "dashboard" as Tab, label: "Dashboard", icon: "📊" },
    { id: "products" as Tab, label: "Products", icon: "📦" },
    { id: "orders" as Tab, label: `Orders (${pendingOrders.length})`, icon: "📋" },
    { id: "users" as Tab, label: "Users", icon: "👥" },
    { id: "categories" as Tab, label: "Categories", icon: "🏷️" },
    { id: "schedules" as Tab, label: "Schedules", icon: "📅" },
    { id: "profile" as Tab, label: "Profile", icon: "👤" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-600">
                Welcome, {userProfile.firstName}! (Manager)
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "dashboard" && <Dashboard />}
        {activeTab === "products" && <ProductManagement />}
        {activeTab === "orders" && <OrderManagement />}
        {activeTab === "users" && <UserManagement />}
        {activeTab === "categories" && <CategoryManagement />}
        {activeTab === "schedules" && <ScheduleManagement />}
        {activeTab === "profile" && <Profile userProfile={userProfile} />}
      </div>
    </div>
  );
}
