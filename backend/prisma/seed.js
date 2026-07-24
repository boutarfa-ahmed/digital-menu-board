const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();

  // Create categories
  const pizzas = await prisma.category.create({ data: { name: 'Pizzas' } });
  const burgers = await prisma.category.create({ data: { name: 'Burgers' } });
  const boisson = await prisma.category.create({ data: { name: 'Boissons' } });
  const desserts = await prisma.category.create({ data: { name: 'Desserts' } });
  const sides = await prisma.category.create({ data: { name: 'Accompagnements' } });

  // Create menu items
  const items = [
    // Pizzas
    { name: 'Pizza Margherita', description: 'Sauce tomate, mozzarella, basilic frais', price: 8.50, categoryId: pizzas.id },
    { name: 'Pizza Pepperoni', description: 'Sauce tomate, mozzarella, pepperoni', price: 9.90, categoryId: pizzas.id },
    { name: 'Pizza 4 Fromages', description: 'Mozzarella, gorgonzola, parmesan, chèvre', price: 10.50, categoryId: pizzas.id },
    { name: 'Pizza Hawaïenne', description: 'Sauce tomate, mozzarella, jambon, ananas', price: 9.90, categoryId: pizzas.id },

    // Burgers
    { name: 'Classic Burger', description: 'Steak 150g, salade, tomate, oignon, sauce maison', price: 11.90, categoryId: burgers.id },
    { name: 'Cheese Burger', description: 'Steak 150g, double cheddar, cornichons, sauce burger', price: 12.90, categoryId: burgers.id },
    { name: 'Chicken Burger', description: 'Poulet croustillant, salade, tomate, sauce yaourt', price: 11.50, categoryId: burgers.id },

    // Boissons
    { name: 'Coca-Cola', description: '33cl', price: 2.50, categoryId: boisson.id },
    { name: 'Eau Minérale', description: '50cl', price: 1.50, categoryId: boisson.id },
    { name: 'Jus d\'Orange', description: 'Fait maison, 30cl', price: 3.50, categoryId: boisson.id },
    { name: 'Thé Glacé', description: 'Menthe ou thé vert, 33cl', price: 3.00, categoryId: boisson.id },

    // Desserts
    { name: 'Tiramisu', description: 'Recette italienne traditionnelle', price: 5.50, categoryId: desserts.id },
    { name: 'Brownie Chocolat', description: 'Avec boules de glace vanille', price: 6.50, categoryId: desserts.id },
    { name: 'Crème Brûlée', description: 'Crème vanille caramélisée', price: 5.00, categoryId: desserts.id },

    // Accompagnements
    { name: 'Frites', description: 'Portion régulière', price: 3.50, categoryId: sides.id },
    { name: 'Frites Spéciales', description: 'Avec fromage et bacon', price: 5.50, categoryId: sides.id },
    { name: 'Salade Verte', description: 'Mesclun, vinaigrette maison', price: 4.00, categoryId: sides.id },
  ];

  for (const item of items) {
    await prisma.menuItem.create({ data: item });
  }

  console.log('Seed completed: 5 categories, ' + items.length + ' items created');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
