import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SignIn } from "./components/sign-in"
import { SignUp } from "./components/sign-up"
import { Me } from "./components/me"
import { useState } from "react"

export function App() {

  const [ queryClient ] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <div>
        <SignUp />
        <SignIn />
        <Me />
      </div>
    </QueryClientProvider>
  )
}

export default App
