// lib/useSession.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { auth } from "./auth";

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: () => auth.getSession(), // retorna { data, error }
    select: (res) => res.data,        // agora o `data` do query é só o payload
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}


// helper opcional para invalidar após login/logout
export function useRefreshSession() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["session"] });
}
