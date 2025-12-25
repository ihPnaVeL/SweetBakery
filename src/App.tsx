import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { CustomerApp } from "./components/customer/CustomerApp";
import { SellerApp } from "./components/seller/SellerApp";
import { ManagerApp } from "./components/manager/ManagerApp";
import { ProfileSetup } from "./components/auth/ProfileSetup";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <h2 className="text-xl font-semibold text-primary">SweetBakery</h2>
        <Authenticated>
          <SignOutButton />
        </Authenticated>
      </header>
      <main className="flex-1">
        <Content />
      </main>
      <Toaster />
    </div>
  );
}

function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const userProfile = useQuery(api.users.getCurrentProfile);

  if (loggedInUser === undefined || userProfile === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Unauthenticated>
        <div className="flex items-center justify-center min-h-[400px] p-8">
          <div className="w-full max-w-md mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-primary mb-4">Welcome</h1>
              <p className="text-xl text-secondary">Sign in to access the system</p>
            </div>
            <SignInForm />
          </div>
        </div>
      </Unauthenticated>

      <Authenticated>
        {!userProfile ? (
          <ProfileSetup />
        ) : (
          <RoleBasedApp userProfile={userProfile} />
        )}
      </Authenticated>
    </div>
  );
}

function RoleBasedApp({ userProfile }: { userProfile: any }) {
  switch (userProfile.role) {
    case "customer":
      return <CustomerApp userProfile={userProfile} />;
    case "seller":
      return <SellerApp userProfile={userProfile} />;
    case "manager":
      return <ManagerApp userProfile={userProfile} />;
    default:
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-2">Invalid Role</h2>
            <p className="text-gray-600">Please contact an administrator.</p>
          </div>
        </div>
      );
  }
}
