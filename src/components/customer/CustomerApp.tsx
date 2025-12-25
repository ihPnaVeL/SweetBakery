import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ProductGrid } from "./ProductGrid";
import { Cart } from "./Cart";
import { OrderHistory } from "./OrderHistory";
import { Profile } from "./Profile";

type Tab = "products" | "cart" | "orders" | "profile";

export function CustomerApp({ userProfile }: { userProfile: any }) {
  const [activeTab, setActiveTab] = useState<Tab>("products");
  const cartItems = useQuery(api.cart.getCart) || [];

  const tabs = [
    { id: "products" as Tab, label: "Products", icon: "🛍️" },
    { id: "cart" as Tab, label: `Cart (${cartItems.length})`, icon: "🛒" },
    { id: "orders" as Tab, label: "Orders", icon: "📦" },
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
                Welcome, {userProfile.firstName}!
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "products" && <ProductGrid />}
        {activeTab === "cart" && <Cart />}
        {activeTab === "orders" && <OrderHistory />}
        {activeTab === "profile" && <Profile userProfile={userProfile} />}
      </div>
    </div>
  );
}
