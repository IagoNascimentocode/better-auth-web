import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SignIn } from "./components/sign-in";
import { SignUp } from "./components/sign-up";
import { Me } from "./components/me";
import { useState } from "react";

export function App() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<SignUp />} />
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/me" element={<Me />} />
          {/* Adicione aqui uma nova rota */}
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
