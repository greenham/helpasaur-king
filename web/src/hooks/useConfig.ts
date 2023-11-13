import { helpaApiFetcher } from "../utils/apiService";
import useSWR from "swr";

const useConfig = (id: string) => {
  const { data, error, isLoading } = useSWR(`/configs/${id}`, helpaApiFetcher);
  return {
    config: data,
    isLoading,
    isError: error,
  };
};

export default useConfig;
