import { helpaApiWithCredentialsFetcher } from "../utils/apiService";
import useSWR from "swr";
//import { Command } from "../types/commands";

const useUser = () => {
  const { data, error, isLoading } = useSWR(
    `/me`,
    helpaApiWithCredentialsFetcher
  );
  const user: any = data || [];
  return {
    data: user,
    isLoading,
    isError: error,
  };
};

export default useUser;
