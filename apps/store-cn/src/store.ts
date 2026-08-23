import { readStoreIdentity } from "@ocs/data";
import { cache } from "react";

export const getStoreIdentity = cache(() => readStoreIdentity("cn"));
