import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ProductManagement } from "./ProductManagement";
import { OrderManagement } from "./OrderManagement";
import { Schedule } from "./Schedule";
import { Profile } from "../customer/Profile";

type Tab = "products" | "orders" | "schedule" | "profile";

export function SellerApp({ userProfile }: { userProfile: any }) {
  const [activeTab, setActiveTab] = useState<Tab>("products");
  const pendingOrders = useQuery(api.orders.getAllOrders, { status: "pending" }) || [];

  const tabs = [
    { id: "products" as Tab, label: "Products", icon: "📦" },
    { id: "orders" as Tab, label: `Orders (${pendingOrders.length})`, icon: "📋" },
    { id: "schedule" as Tab, label: "Schedule", icon: "📅" },
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
                Welcome, {userProfile.firstName}! (Seller)
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "products" && <ProductManagement />}
        {activeTab === "orders" && <OrderManagement />}
        {activeTab === "schedule" && <Schedule userProfile={userProfile} />}
        {activeTab === "profile" && <Profile userProfile={userProfile} />}
      </div>
    </div>
  );
}
