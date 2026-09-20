import { UnsupportedSearchFeatureError } from "@priemskiyyy/scout";
import { ADAPTER_NAME } from "src/utils/constants/adapterName";

export const refuse = (feature: string, message: string): never => {
  throw new UnsupportedSearchFeatureError({
    adapter: ADAPTER_NAME,
    feature,
    message,
  });
};
