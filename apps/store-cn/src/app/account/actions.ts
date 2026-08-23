"use server";
import { shopperSignOut } from "../../shopper-auth";
export async function logoutShopper() { await shopperSignOut({ redirectTo: "/" }); }
