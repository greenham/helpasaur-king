import { StreamAlertsConfig } from "../types/streams";
import { helpaApiFetcher } from "../utils/apiService";
import useSWR from "swr";

const useConfig = (id: string) => {
  const { data, error, isLoading } = useSWR(`/configs/${id}`, helpaApiFetcher);
  const config: StreamAlertsConfig = data?.config || {};
  return {
    data: config,
    isLoading,
    isError: error,
  };
};

export default useConfig;
