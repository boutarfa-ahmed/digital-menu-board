const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.screen.deleteMany();

  // Create categories
  const catDefs = [
    { name: 'Pizzas', order: 1, icon: 'pizza', color: '#ef4444' },
    { name: 'Burgers', order: 2, icon: 'burger', color: '#f97316' },
    { name: 'Accompagnements', order: 3, icon: 'fries', color: '#eab308' },
    { name: 'Boissons', order: 4, icon: 'drink', color: '#3b82f6' },
    { name: 'Desserts', order: 5, icon: 'dessert', color: '#ec4899' },
  ];
  const cats = {};
  for (const def of catDefs) {
    const c = await prisma.category.create({ data: def });
    cats[def.name] = c;
  }
  const pizzas = cats['Pizzas'];
  const burgers = cats['Burgers'];
  const boisson = cats['Boissons'];
  const desserts = cats['Desserts'];
  const sides = cats['Accompagnements'];

  // Create menu items
  const items = [
    // Pizzas
    { name: 'Pizza Margherita', description: 'Sauce tomate, mozzarella, basilic frais', price: 8.50, categoryId: pizzas.id, order: 1, tags: ['vegan'] },
    { name: 'Pizza Pepperoni', description: 'Sauce tomate, mozzarella, pepperoni', price: 9.90, categoryId: pizzas.id, order: 2, tags: ['spicy'] },
    { name: 'Pizza 4 Fromages', description: 'Mozzarella, gorgonzola, parmesan, chèvre', price: 10.50, categoryId: pizzas.id, order: 3, tags: [] },
    { name: 'Pizza Hawaïenne', description: 'Sauce tomate, mozzarella, jambon, ananas', price: 9.90, categoryId: pizzas.id, order: 4, tags: [] },

    // Burgers
    { name: 'Classic Burger', description: 'Steak 150g, salade, tomate, oignon, sauce maison', price: 11.90, categoryId: burgers.id, order: 1, tags: [] },
    { name: 'Cheese Burger', description: 'Steak 150g, double cheddar, cornichons, sauce burger', price: 12.90, categoryId: burgers.id, order: 2, tags: ['promo'] },
    { name: 'Chicken Burger', description: 'Poulet croustillant, salade, tomate, sauce yaourt', price: 11.50, categoryId: burgers.id, order: 3, tags: [] },

    // Boissons
    { name: 'Coca-Cola', description: '33cl', price: 2.50, categoryId: boisson.id, order: 1, tags: [] },
    { name: 'Eau Minérale', description: '50cl', price: 1.50, categoryId: boisson.id, order: 2, tags: ['vegan'] },
    { name: 'Jus d\'Orange', description: 'Fait maison, 30cl', price: 3.50, categoryId: boisson.id, order: 3, tags: ['vegan'] },
    { name: 'Thé Glacé', description: 'Menthe ou thé vert, 33cl', price: 3.00, categoryId: boisson.id, order: 4, tags: [] },

    // Desserts
    { name: 'Tiramisu', description: 'Recette italienne traditionnelle', price: 5.50, categoryId: desserts.id, order: 1, tags: [] },
    { name: 'Brownie Chocolat', description: 'Avec boules de glace vanille', price: 6.50, categoryId: desserts.id, order: 2, tags: ['promo'] },
    { name: 'Crème Brûlée', description: 'Crème vanille caramélisée', price: 5.00, categoryId: desserts.id, order: 3, tags: [] },

    // Accompagnements
    { name: 'Frites', description: 'Portion régulière', price: 3.50, categoryId: sides.id, order: 1, tags: ['vegan'] },
    { name: 'Frites Spéciales', description: 'Avec fromage et bacon', price: 5.50, categoryId: sides.id, order: 2, tags: [] },
    { name: 'Salade Verte', description: 'Mesclun, vinaigrette maison', price: 4.00, categoryId: sides.id, order: 3, tags: ['vegan'] },
  ];

  for (const item of items) {
    await prisma.menuItem.create({
      data: {
        name: item.name,
        description: item.description,
        price: item.price,
        categoryId: item.categoryId,
        order: item.order || 0,
        tags: JSON.stringify(item.tags || []),
        status: item.status || 'available',
        available: (item.status || 'available') === 'available',
      },
    });
  }

  // Create screens (TV1..TV5)
  const screens = [
    { name: 'TV1', location: 'Salle principale' },
    { name: 'TV2', location: 'Terrasse' },
    { name: 'TV3', location: 'Comptoir' },
    { name: 'TV4', location: 'Étage' },
    { name: 'TV5', location: 'Vitrine' },
  ];

  for (const screen of screens) {
    await prisma.screen.create({ data: screen });
  }

  // Sample assignments: TV1 shows Pizzas + Burgers, TV2 shows Boissons + Desserts, TV3 shows a single item
  const allScreens = await prisma.screen.findMany({ orderBy: { id: 'asc' } });
  const allItems = await prisma.menuItem.findMany();
  const s = (i) => allScreens[i];
  const it = (name) => allItems.find((x) => x.name === name);

  await prisma.screen.update({
    where: { id: s(0).id },
    data: {
      categories: { set: [pizzas, burgers].map((c) => ({ id: c.id })) },
      items: { set: [] },
    },
  });
  await prisma.screen.update({
    where: { id: s(1).id },
    data: {
      categories: { set: [boisson, desserts].map((c) => ({ id: c.id })) },
      items: { set: [] },
    },
  });
  await prisma.screen.update({
    where: { id: s(2).id },
    data: {
      categories: { set: [] },
      items: { set: [it('Pizza Margherita'), it('Classic Burger')].filter(Boolean).map((x) => ({ id: x.id })) },
    },
  });

  // T6.1: Zone-based layout for TV1 (1 screen, 1 layout, 3 zones)
  const layout = await prisma.screenLayout.create({
    data: {
      screenId: s(0).id,
      name: 'Layout principal',
      status: 'published',
      settings: JSON.stringify({ showPrices: true, showImages: true }),
    },
  });

  const banner = await prisma.zone.create({
    data: {
      layoutId: layout.id,
      name: 'Bannière',
      zoneType: 'banner',
      x: 0, y: 0, w: 4, h: 1,
      order: 1,
      gridConfig: JSON.stringify({ rows: 1, cols: 1 }),
    },
  });
  const pizzaGrid = await prisma.zone.create({
    data: {
      layoutId: layout.id,
      name: 'Pizzas',
      zoneType: 'grid',
      x: 0, y: 1, w: 2, h: 2,
      order: 2,
      gridConfig: JSON.stringify({ rows: 2, cols: 2 }),
      cardTemplate: 'compact',
    },
  });
  const drinksList = await prisma.zone.create({
    data: {
      layoutId: layout.id,
      name: 'Boissons',
      zoneType: 'list',
      x: 2, y: 1, w: 2, h: 2,
      order: 3,
      gridConfig: JSON.stringify({ rows: 3, cols: 1 }),
    },
  });

  const zoneItemDefs = [
    { zone: pizzaGrid, itemName: 'Pizza Margherita', row: 0, col: 0, index: 0 },
    { zone: pizzaGrid, itemName: 'Pizza Pepperoni', row: 0, col: 1, index: 1 },
    { zone: pizzaGrid, itemName: 'Pizza 4 Fromages', row: 1, col: 0, index: 2 },
    { zone: pizzaGrid, itemName: 'Pizza Hawaïenne', row: 1, col: 1, index: 3 },
    { zone: drinksList, itemName: 'Coca-Cola', index: 0 },
    { zone: drinksList, itemName: 'Eau Minérale', index: 1 },
    { zone: drinksList, itemName: 'Jus d\'Orange', index: 2 },
  ];
  for (const zi of zoneItemDefs) {
    const item = it(zi.itemName);
    if (!item) continue;
    await prisma.zoneItem.create({
      data: {
        zoneId: zi.zone.id,
        itemId: item.id,
        row: zi.row ?? null,
        col: zi.col ?? null,
        index: zi.index ?? null,
        order: zi.index ?? 0,
      },
    });
  }

  console.log(
    'Seed completed: 5 categories, ' + items.length + ' items, ' + screens.length + ' screens, ' +
      '1 layout (' + layout.id + ') with 3 zones and 7 zone items created'
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
