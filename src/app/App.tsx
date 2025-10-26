// src/app/App.tsx
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import DashboardPage from "../pages/DashboardPage";
import TransactionsPage from "../pages/TransactionsPage";
import { Me } from "../components/me";
import { SignUp } from "../components/sign-up";
import { SignIn } from "../components/sign-in";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <header className="border-b border-zinc-800">
          <nav className="mx-auto max-w-5xl flex items-center gap-4 p-4">
            <NavLink to="/bank" className={({isActive}) => isActive ? "text-emerald-400" : "text-zinc-300"}>Dashboard</NavLink>
            <NavLink to="/transactions" className={({isActive}) => isActive ? "text-emerald-400" : "text-zinc-300"}>Transações</NavLink>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl p-6">
          <Routes>
            <Route path="/me" element={<Me />} />
            <Route path="/" element={<SignUp />} />
            <Route path="/sign-in" element={<SignIn />} />
            <Route path="/bank" element={<DashboardPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
