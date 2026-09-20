"use client";

import { clearCart } from "@/lib/cart";
import { useEffect } from "react";

export function ClearCartOnOk() {
  useEffect(() => {
    clearCart();
  }, []);
  return null;
}
