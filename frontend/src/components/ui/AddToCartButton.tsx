"use client";

import { ShoppingCart } from "lucide-react";
import { useState } from "react";

import { useCart } from "@/context/CartContext";

import { Button } from "./Button";

export function AddToCartButton({
  productId,
  title,
  disabled,
  variantId,
  editionId,
  quantity = 1,
  className = "w-full",
  variant = "primary",
  size = "md",
  label = "Add to Cart",
}: {
  productId: number;
  title: string;
  disabled?: boolean;
  variantId?: number | null;
  editionId?: number | null;
  quantity?: number;
  className?: string;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  label?: string;
}) {
  const { add } = useCart();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled={disabled}
      loading={busy}
      aria-label={disabled ? `${title} is out of stock` : `Add ${title} to cart`}
      onClick={async () => {
        setBusy(true);
        await add(productId, { variantId, editionId, quantity });
        setBusy(false);
      }}
    >
      {!busy && <ShoppingCart aria-hidden="true" className="size-4" />}
      {disabled ? "Out of stock" : label}
    </Button>
  );
}
