import { helpaApiFetcher } from "../utils/apiService";
import useSWR from "swr";
import { Command } from "../types/commands";

const useCommands = () => {
  const { data, error, isLoading } = useSWR(`/commands`, helpaApiFetcher);
  const commands: Command[] = data || [];
  return {
    data: commands,
    isLoading,
    isError: error,
  };
};

export default useCommands;
