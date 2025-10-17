import { useQuery } from "@tanstack/react-query";

export function Me(){

  const { data } = useQuery({
    queryKey: ['profile'],
    queryFn: async () =>{
      const response = await fetch('http://localhost:3333/users/1',{
        credentials: 'include'
      });
      const data = await response.json();
      return data;
    }
  })
  return(<pre>{JSON.stringify(data,null,2)}</pre>)
}
