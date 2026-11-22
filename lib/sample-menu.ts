import type { Diet } from "./billing";

type SampleItem = {
  name: string;
  description?: string;
  price?: number;
  diet?: Diet;
  available?: boolean;
  variants?: { name: string; price: number }[];
  addons?: { name: string; price: number }[];
};

/**
 * Cafe Baithakkhana's menu (from the café's menu_v2_final.xlsx), built into the site so any account
 * can add the whole menu with one button on the Menu page. Prices are in rupees.
 */
export const SAMPLE_MENU: { name: string; items: SampleItem[] }[] = [
  {
    name: "Tea & Coffee",
    items: [
      { name: "Milk Tea", price: 25 },
      { name: "Ginger Honey Tea", price: 29 },
      { name: "Lemon Tea", price: 19 },
      { name: "Regular Coffee", price: 29 },
      { name: "Black Coffee", price: 29 },
      { name: "Cold Coffee", price: 59 },
    ],
  },
  {
    name: "Breads & Burgers",
    items: [
      { name: "Veg Sandwich", price: 49 },
      { name: "Chicken Sandwich", price: 79, diet: "nonveg" },
      { name: "Chicken Cheese Sandwich", price: 89, diet: "nonveg" },
      { name: "Veg Burger", price: 59 },
      { name: "Chicken Burger", price: 79, diet: "nonveg" },
    ],
  },
  {
    name: "Refreshers Drinks",
    items: [
      { name: "Masala Soda", price: 49 },
      { name: "Virgin Mojito", price: 59 },
      { name: "Fresh Lime Soda", price: 49 },
      { name: "Blue Lagoon", price: 69 },
      { name: "Orange Mojito", price: 69 },
      { name: "Mango Mojito", price: 79 },
      { name: "Green Apple Mojito", price: 79 },
    ],
  },
  {
    name: "Sides & Snacks",
    items: [
      { name: "French Fries", price: 49 },
      { name: "Peri-peri Fries", price: 59 },
      { name: "Veg Cheese Ball", price: 59 },
      { name: "Chicken Cheese Ball", price: 79, diet: "nonveg" },
      { name: "Chicken Popcorn", price: 99, diet: "nonveg" },
      { name: "Chicken Nuggets", price: 109, diet: "nonveg" },
      { name: "Crispy Chicken", price: 119, diet: "nonveg" },
      { name: "Chicken Finger", price: 119, diet: "nonveg" },
      { name: "Fish Finger", price: 139, diet: "nonveg" },
    ],
  },
  {
    name: "Pasta & Wrap",
    items: [
      { name: "White Sauce Pasta (Veg)", price: 99 },
      { name: "White Sauce Pasta (Non-Veg)", price: 119, diet: "nonveg" },
      { name: "Red Sauce Pasta (Veg)", price: 99 },
      { name: "Red Sauce Pasta (Non-Veg)", price: 129, diet: "nonveg" },
      { name: "Veg Wrap", price: 49 },
      { name: "Chicken Wrap", price: 69, diet: "nonveg" },
    ],
  },
  {
    name: "Noodles",
    items: [
      { name: "Veg Hakka Noodles", price: 69 },
      { name: "Egg Hakka Noodles", price: 89, diet: "egg" },
      { name: "Chicken Hakka Noodles", price: 109, diet: "nonveg" },
      { name: "Egg Chicken Hakka Noodles", price: 129, diet: "nonveg" },
    ],
  },
  {
    name: "Momo",
    items: [
      { name: "Veg Steam Momo", price: 49 },
      { name: "Veg Fried Momo", price: 59 },
      { name: "Veg Pan-fried Momo", price: 79 },
      { name: "Chicken Steam Momo", price: 79, diet: "nonveg" },
      { name: "Chicken Fried Momo", price: 89, diet: "nonveg" },
      { name: "Chicken Pan-fried Momo", price: 99, diet: "nonveg" },
    ],
  },
  {
    name: "Pizza",
    items: [
      { name: "Classic Veg Pizza", price: 119 },
      { name: "Crispy Chicken Pizza", price: 149, diet: "nonveg" },
    ],
  },
];
