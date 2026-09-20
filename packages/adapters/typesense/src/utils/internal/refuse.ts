import { SearchConfigurationError } from "@priemskiyyy/scout";

export const refuse = (path: string, message: string): never => {
  throw new SearchConfigurationError({ path, message });
};
