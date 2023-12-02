import { helpaApiFetcher } from "../utils/apiService";
import useSWR from "swr";
import { UserContextType } from "../types/users";

const useUser = () => {
  const { data, error, isLoading }: UserContextType = useSWR(
    `/me`,
    helpaApiFetcher
  );
  return { data, error, isLoading };
};

export default useUser;
