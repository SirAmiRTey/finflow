import React from "react";
import {
  ShoppingCart,
  Utensils,
  Home,
  Car,
  Laptop,
  HeartPulse,
  Gamepad2,
  CircleDollarSign,
  Briefcase,
  Code,
  TrendingUp,
  Gift,
  Coins,
  CreditCard,
  Coffee,
  Plane,
  Fuel,
  Film,
  Dumbbell,
  Shield,
  Tag,
  LucideProps,
} from "lucide-react";

interface CategoryIconProps extends Omit<LucideProps, "ref"> {
  name: string;
}

const ICON_MAP: Record<string, React.FC<LucideProps>> = {
  "shopping-cart": ShoppingCart,
  utensils: Utensils,
  home: Home,
  car: Car,
  laptop: Laptop,
  "heart-pulse": HeartPulse,
  "gamepad-2": Gamepad2,
  "circle-dollar-sign": CircleDollarSign,
  briefcase: Briefcase,
  code: Code,
  "trending-up": TrendingUp,
  gift: Gift,
  coins: Coins,
  "credit-card": CreditCard,
  coffee: Coffee,
  plane: Plane,
  fuel: Fuel,
  film: Film,
  dumbbell: Dumbbell,
  shield: Shield,
  tag: Tag,
};

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, ...props }) => {
  const normalizedKey = (name || "").toLowerCase().trim();
  const IconComponent = ICON_MAP[normalizedKey] || Tag;
  return <IconComponent {...props} />;
};
