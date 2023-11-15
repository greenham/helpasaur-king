import { StreamAlertsConfig } from "../types/streams";
import { helpaApiFetcher } from "../utils/apiService";
import useSWR from "swr";

const useConfig = () => {
  const { data, error, isLoading } = useSWR(`/web/config`, helpaApiFetcher);
  const config: StreamAlertsConfig = data || {};
  return {
    data: config,
    isLoading,
    isError: error,
  };
};

export default useConfig;
