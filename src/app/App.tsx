
import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import DashboardPage from "../pages/DashboardPage";
import TransactionsPage from "../pages/TransactionsPage";
import ExpensesPage from "../pages/ExpensesPage";
import { Me } from "../components/me";
import { SignUp } from "../components/sign-up";
import { SignIn } from "../components/sign-in";
import { useSession } from "../lib/useSession";
import type { JSX } from "react";
import WealthHubPage from "../pages/HealthHubPage";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { data: session, isLoading } = useSession();

  if (isLoading) return <div className="p-6">Carregando…</div>;
  if (!session?.user) return <Navigate to="/sign-in" replace />;

  return children;
}

export default function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800">
        <nav className="mx-auto flex max-w-5xl items-center gap-4 p-4">
          <NavLink
            to="/bank"
            className={({ isActive }) =>
              isActive ? "text-emerald-400" : "text-zinc-300"
            }
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/transactions"
            className={({ isActive }) =>
              isActive ? "text-emerald-400" : "text-zinc-300"
            }
          >
            Transações
          </NavLink>

          <NavLink
            to="/expenses"
            className={({ isActive }) =>
              isActive ? "text-emerald-400" : "text-zinc-300"
            }
          >
            Despesas
          </NavLink>

          <NavLink
            to="/wealth"
            className={({ isActive }) =>
              isActive ? "text-emerald-400" : "text-zinc-300"
            }
          >
            Wealth Hub
          </NavLink>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl p-6">
        <Routes>
          {/* públicas */}
          <Route path="/" element={<SignUp />} />
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/me" element={<Me />} />

          {/* privadas */}
          <Route
            path="/bank"
            element={
              <RequireAuth>
                <DashboardPage />
              </RequireAuth>
            }
          />
          <Route
            path="/transactions"
            element={
              <RequireAuth>
                <TransactionsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/expenses"
            element={
              <RequireAuth>
                <ExpensesPage />
              </RequireAuth>
            }
          />
          <Route
            path="/wealth"
            element={
              <RequireAuth>
                <WealthHubPage />
              </RequireAuth>
            }
          />

          {/* fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
