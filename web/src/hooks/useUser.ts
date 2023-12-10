import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "../utils/apiService";

export const useUser = () =>
  useQuery({ queryKey: ["user"], queryFn: getCurrentUser });
