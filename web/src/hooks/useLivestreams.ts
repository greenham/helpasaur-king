import { TwitchStream } from "../types/streams";
import { helpaApiFetcher } from "../utils/apiService";
import useSWR from "swr";

const useLivestreams = () => {
  const { data, error, isLoading } = useSWR(`/streams/live`, helpaApiFetcher);
  const streams: TwitchStream[] = data || [];
  return {
    data: streams,
    isLoading,
    isError: error,
  };
};

export default useLivestreams;
