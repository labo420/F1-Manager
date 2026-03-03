import { useQuery } from "@tanstack/react-query";
import { type Driver, type Constructor } from "@shared/schema";

export function useDrivers() {
  return useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
    queryFn: async () => {
      const res = await fetch("/api/drivers", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch drivers");
      return res.json();
    },
  });
}

export function useConstructors() {
  return useQuery<Constructor[]>({
    queryKey: ["/api/constructors"],
    queryFn: async () => {
      const res = await fetch("/api/constructors", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch constructors");
      return res.json();
    },
  });
}
