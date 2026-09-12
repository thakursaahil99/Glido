import { PrismaClient } from "@prisma/client";
import { DEFAULT_PERMISSIONS_BY_ADMIN_ROLE } from "@glido/shared";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "sahilthakur961999@gmail.com";
const ADMIN_PASSWORD = "Sahil@123";

async function main() {
  console.log("Seeding Glido demo data...");

  // Mumbai is configured as a real service zone (center + radius) so Cab
  // booking's zone check has something to validate against out of the box —
  // pickups outside this circle are rejected with a friendly message.
  const city = await prisma.city.upsert({
    where: { name: "Mumbai" },
    update: { centerLat: 18.9647, centerLng: 72.8258, serviceRadiusKm: 25 },
    create: { name: "Mumbai", state: "Maharashtra", centerLat: 18.9647, centerLng: 72.8258, serviceRadiusKm: 25 },
  });
  await prisma.city.upsert({
    where: { name: "Pune" },
    update: { centerLat: 18.5204, centerLng: 73.8567, serviceRadiusKm: 20 },
    create: { name: "Pune", state: "Maharashtra", centerLat: 18.5204, centerLng: 73.8567, serviceRadiusKm: 20 },
  });

  // --- Owner admin account — logs in with email + password at /admin/login,
  // not OTP. Change the password from the Admin Panel (or reseed with a new
  // ADMIN_PASSWORD above) before using this anywhere but locally. ---
  const adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const superAdminPermissions = DEFAULT_PERMISSIONS_BY_ADMIN_ROLE.SUPER_ADMIN;
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      role: "ADMIN",
      adminRole: "SUPER_ADMIN",
      permissions: superAdminPermissions,
      passwordHash: adminPasswordHash,
    },
    create: {
      email: ADMIN_EMAIL,
      name: "Sahil Thakur",
      role: "ADMIN",
      adminRole: "SUPER_ADMIN",
      permissions: superAdminPermissions,
      passwordHash: adminPasswordHash,
      wallet: { create: { balance: 0 } },
    },
  });

  // --- Demo customer (logs in with email + password, same as everyone else) ---
  const customerPasswordHash = await bcrypt.hash("Customer@123", 10);
  const customer = await prisma.user.upsert({
    where: { email: "customer@glido.app" },
    update: { passwordHash: customerPasswordHash },
    create: {
      email: "customer@glido.app",
      name: "Demo Customer",
      role: "CUSTOMER",
      passwordHash: customerPasswordHash,
      wallet: { create: { balance: 250 } },
      addresses: {
        create: {
          label: "Home",
          line1: "12 Marine Drive",
          line2: "Near Chowpatty",
          cityId: city.id,
          pincode: "400002",
          isDefault: true,
        },
      },
    },
  });

  // --- Demo restaurants ---
  const restaurantsSeed = [
    {
      name: "Spice Route Kitchen",
      description: "North Indian & Mughlai favourites, made fresh.",
      cuisineTags: "North Indian,Mughlai,Curries",
      imageUrl: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800",
      deliveryFee: 25,
      packagingFee: 10,
      minOrderAmount: 99,
      categories: ["Starters", "Main Course", "Breads", "Desserts"],
      items: [
        { cat: "Starters", name: "Paneer Tikka", price: 220, isVeg: true, desc: "Char-grilled cottage cheese skewers.", img: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400" },
        { cat: "Starters", name: "Chicken Seekh Kebab", price: 260, isVeg: false, desc: "Minced chicken skewers, smoky and spiced.", img: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400" },
        { cat: "Main Course", name: "Butter Chicken", price: 320, isVeg: false, desc: "Classic creamy tomato curry.", img: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400" },
        { cat: "Main Course", name: "Dal Makhani", price: 210, isVeg: true, desc: "Slow-cooked black lentils.", img: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400" },
        { cat: "Breads", name: "Butter Naan", price: 55, isVeg: true, desc: "", img: "https://images.unsplash.com/photo-1626074353765-517a681e40be?w=400" },
        { cat: "Desserts", name: "Gulab Jamun (2 pc)", price: 90, isVeg: true, desc: "", img: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400" },
      ],
    },
    {
      name: "Sushi & Bowl Co.",
      description: "Fresh sushi rolls and Japanese rice bowls.",
      cuisineTags: "Japanese,Sushi,Healthy",
      imageUrl: "https://images.unsplash.com/photo-1553621042-f6e147245754?w=800",
      deliveryFee: 35,
      packagingFee: 15,
      minOrderAmount: 149,
      categories: ["Sushi Rolls", "Rice Bowls", "Sides"],
      items: [
        { cat: "Sushi Rolls", name: "California Roll", price: 280, isVeg: false, desc: "Crab, avocado, cucumber.", img: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400" },
        { cat: "Sushi Rolls", name: "Veg Tempura Roll", price: 240, isVeg: true, desc: "Crispy veg tempura, spicy mayo.", img: "https://images.unsplash.com/photo-1617196034183-421b4917c92d?w=400" },
        { cat: "Rice Bowls", name: "Teriyaki Chicken Bowl", price: 310, isVeg: false, desc: "Grilled chicken, teriyaki glaze.", img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400" },
        { cat: "Sides", name: "Miso Soup", price: 90, isVeg: true, desc: "", img: "https://images.unsplash.com/photo-1607301405390-d831c242f59b?w=400" },
      ],
    },
    {
      name: "Pizza Bros",
      description: "Wood-fired pizzas with a Glido twist.",
      cuisineTags: "Italian,Pizza,Fast Food",
      imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800",
      deliveryFee: 20,
      packagingFee: 10,
      minOrderAmount: 0,
      categories: ["Pizzas", "Sides", "Beverages"],
      items: [
        { cat: "Pizzas", name: "Margherita", price: 249, isVeg: true, desc: "Classic tomato, mozzarella, basil.", img: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400" },
        { cat: "Pizzas", name: "Pepperoni Feast", price: 349, isVeg: false, desc: "Loaded pepperoni, mozzarella.", img: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400" },
        { cat: "Sides", name: "Garlic Bread", price: 120, isVeg: true, desc: "", img: "https://images.unsplash.com/photo-1608039755401-742074f0548d?w=400" },
        { cat: "Beverages", name: "Coke (500ml)", price: 60, isVeg: true, desc: "", img: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400" },
      ],
    },
  ];

  for (const r of restaurantsSeed) {
    const restaurant = await prisma.restaurant.upsert({
      where: { id: `seed-${r.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` },
      update: {},
      create: {
        id: `seed-${r.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        name: r.name,
        description: r.description,
        cuisineTags: r.cuisineTags,
        imageUrl: r.imageUrl,
        cityId: city.id,
        addressLine: "Glido Food Court, Mumbai",
        status: "APPROVED",
        isOpen: true,
        deliveryFee: r.deliveryFee,
        packagingFee: r.packagingFee,
        minOrderAmount: r.minOrderAmount,
        commissionPercent: 15,
      },
    });

    const categoryMap = new Map<string, string>();
    for (let i = 0; i < r.categories.length; i++) {
      const catName = r.categories[i];
      const existing = await prisma.menuCategory.findFirst({
        where: { restaurantId: restaurant.id, name: catName },
      });
      const cat =
        existing ??
        (await prisma.menuCategory.create({
          data: { restaurantId: restaurant.id, name: catName, sortOrder: i },
        }));
      categoryMap.set(catName, cat.id);
    }

    for (const item of r.items) {
      const existingItem = await prisma.menuItem.findFirst({
        where: { restaurantId: restaurant.id, name: item.name },
      });
      if (existingItem) {
        if (!existingItem.imageUrl) {
          await prisma.menuItem.update({ where: { id: existingItem.id }, data: { imageUrl: item.img } });
        }
        continue;
      }
      await prisma.menuItem.create({
        data: {
          restaurantId: restaurant.id,
          categoryId: categoryMap.get(item.cat),
          name: item.name,
          description: item.desc || undefined,
          imageUrl: item.img,
          price: item.price,
          isVeg: item.isVeg,
          isAvailable: true,
          addons:
            item.cat === "Pizzas" || item.cat === "Main Course"
              ? { create: [{ name: "Extra Spicy", price: 0 }, { name: "Extra Cheese", price: 40 }] }
              : undefined,
        },
      });
    }
  }

  // --- A restaurant pending admin approval, to demonstrate the approval flow ---
  await prisma.restaurant.upsert({
    where: { id: "seed-new-partner-awaiting-approval" },
    update: {},
    create: {
      id: "seed-new-partner-awaiting-approval",
      name: "Coastal Curry House (New Partner)",
      description: "Newly onboarded partner awaiting Glido admin approval.",
      cuisineTags: "Coastal,Seafood",
      cityId: city.id,
      status: "PENDING",
      deliveryFee: 30,
      packagingFee: 10,
    },
  });

  // --- Demo coupon ---
  await prisma.coupon.upsert({
    where: { code: "GLIDO50" },
    update: {},
    create: {
      code: "GLIDO50",
      type: "PERCENT",
      value: 50,
      maxDiscount: 100,
      minOrderAmount: 150,
      usageLimit: 500,
      perUserLimit: 1,
      isActive: true,
    },
  });
  await prisma.coupon.upsert({
    where: { code: "FLAT50" },
    update: {},
    create: {
      code: "FLAT50",
      type: "FLAT",
      value: 50,
      minOrderAmount: 200,
      usageLimit: 1000,
      perUserLimit: 3,
      isActive: true,
    },
  });

  // --- Glido Grocery categories + products ---
  const groceryCategoriesSeed = [
    {
      name: "Fruits & Vegetables",
      imageUrl: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400",
      products: [
        { name: "Banana", brand: "Farm Fresh", unit: "6 pcs", mrp: 60, price: 48, stockQty: 120, img: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=300" },
        { name: "Tomato", brand: "Farm Fresh", unit: "1 kg", mrp: 50, price: 40, stockQty: 100, img: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300" },
        { name: "Onion", brand: "Farm Fresh", unit: "1 kg", mrp: 45, price: 36, stockQty: 150, img: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=300" },
        { name: "Spinach", brand: "Farm Fresh", unit: "250 g", mrp: 25, price: 20, stockQty: 60, img: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=300" },
      ],
    },
    {
      name: "Dairy & Breakfast",
      imageUrl: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400",
      products: [
        { name: "Toned Milk", brand: "Glido Dairy", unit: "500 ml", mrp: 30, price: 28, stockQty: 200, img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300" },
        { name: "Farm Eggs", brand: "Glido Dairy", unit: "6 pcs", mrp: 48, price: 42, stockQty: 90, img: "https://images.unsplash.com/photo-1518569656558-1f25e69d93d7?w=300" },
        { name: "Bread", brand: "Harvest Gold", unit: "400 g", mrp: 45, price: 40, stockQty: 70, img: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300" },
        { name: "Paneer", brand: "Glido Dairy", unit: "200 g", mrp: 90, price: 80, stockQty: 50, img: "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=300" },
      ],
    },
    {
      name: "Snacks & Munchies",
      imageUrl: "https://images.unsplash.com/photo-1600952841320-db92ec4047ca?w=400",
      products: [
        { name: "Potato Chips", brand: "Lays", unit: "52 g", mrp: 20, price: 20, stockQty: 200, img: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=300" },
        { name: "Chocolate Bar", brand: "Dairy Milk", unit: "40 g", mrp: 40, price: 38, stockQty: 150, img: "https://images.unsplash.com/photo-1511381939415-e44015466834?w=300" },
        { name: "Biscuits", brand: "Parle-G", unit: "200 g", mrp: 25, price: 22, stockQty: 180, img: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=300" },
      ],
    },
    {
      name: "Beverages",
      imageUrl: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400",
      products: [
        { name: "Cola (500ml)", brand: "Coca-Cola", unit: "500 ml", mrp: 40, price: 38, stockQty: 120, img: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=300" },
        { name: "Orange Juice", brand: "Real", unit: "1 L", mrp: 110, price: 99, stockQty: 60, img: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=300" },
        { name: "Instant Coffee", brand: "Nescafé", unit: "50 g", mrp: 150, price: 139, stockQty: 40, img: "https://images.unsplash.com/photo-1509785307050-d4066910ec1e?w=300" },
      ],
    },
    {
      name: "Household",
      imageUrl: "https://images.unsplash.com/photo-1585421514738-01798e348b17?w=400",
      products: [
        { name: "Dishwash Liquid", brand: "Vim", unit: "500 ml", mrp: 130, price: 115, stockQty: 70, img: "https://images.unsplash.com/photo-1585421514738-01798e348b17?w=300" },
        { name: "Laundry Detergent", brand: "Surf Excel", unit: "1 kg", mrp: 180, price: 165, stockQty: 55, img: "https://images.unsplash.com/photo-1583947581924-860bda6a26df?w=300" },
      ],
    },
    {
      name: "Personal Care",
      imageUrl: "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400",
      products: [
        { name: "Shampoo", brand: "Head & Shoulders", unit: "180 ml", mrp: 199, price: 179, stockQty: 45, img: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300" },
        { name: "Toothpaste", brand: "Colgate", unit: "150 g", mrp: 95, price: 85, stockQty: 90, img: "https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=300" },
      ],
    },
  ];

  for (let i = 0; i < groceryCategoriesSeed.length; i++) {
    const cat = groceryCategoriesSeed[i];
    const category = await prisma.groceryCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: { name: cat.name, imageUrl: cat.imageUrl, sortOrder: i },
    });
    for (const p of cat.products) {
      const { img, ...rest } = p;
      const existing = await prisma.groceryProduct.findFirst({
        where: { categoryId: category.id, name: p.name },
      });
      if (existing) {
        if (!existing.imageUrl) {
          await prisma.groceryProduct.update({ where: { id: existing.id }, data: { imageUrl: img } });
        }
        continue;
      }
      await prisma.groceryProduct.create({
        data: { ...rest, imageUrl: img, categoryId: category.id },
      });
    }
  }

  // --- Demo restaurant partner account — logs in at /partner/login with
  // email + password, same as everyone else, and manages Pizza Bros only. ---
  const partnerPasswordHash = await bcrypt.hash("Partner@123", 10);
  const partnerOwner = await prisma.user.upsert({
    where: { email: "partner@glido.app" },
    update: { passwordHash: partnerPasswordHash, role: "RESTAURANT_OWNER" },
    create: {
      email: "partner@glido.app",
      name: "Pizza Bros Owner",
      role: "RESTAURANT_OWNER",
      passwordHash: partnerPasswordHash,
    },
  });
  await prisma.restaurant.update({ where: { id: "seed-pizza-bros" }, data: { ownerUserId: partnerOwner.id } });

  // --- Glido Cab: ride types + demo drivers (Mumbai / Marine Drive area) ---
  const rideTypesSeed = [
    { name: "Bike", baseFare: 20, perKmFare: 6, perMinuteFare: 0.5, minFare: 25, cancellationFee: 10, capacity: 1, sortOrder: 0, imageUrl: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=200" },
    { name: "Auto", baseFare: 30, perKmFare: 9, perMinuteFare: 0.8, minFare: 35, cancellationFee: 15, capacity: 3, sortOrder: 1, imageUrl: "https://images.unsplash.com/photo-1601987177651-8edfe6c20009?w=200" },
    { name: "Mini", baseFare: 40, perKmFare: 12, perMinuteFare: 1.2, minFare: 50, cancellationFee: 20, capacity: 4, sortOrder: 2, imageUrl: "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=200" },
    { name: "Sedan", baseFare: 60, perKmFare: 15, perMinuteFare: 1.5, minFare: 80, cancellationFee: 30, capacity: 4, sortOrder: 3, imageUrl: "https://images.unsplash.com/photo-1550355291-bbee04a92027?w=200" },
    { name: "SUV", baseFare: 90, perKmFare: 20, perMinuteFare: 2, minFare: 120, cancellationFee: 40, capacity: 6, sortOrder: 4, imageUrl: "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=200" },
  ];

  const rideTypeIdByName = new Map<string, string>();
  for (const rt of rideTypesSeed) {
    const created = await prisma.rideType.upsert({
      where: { name: rt.name },
      update: {},
      create: rt,
    });
    rideTypeIdByName.set(rt.name, created.id);
  }

  const driversSeed = [
    { name: "Ramesh Yadav", phone: "+919800000001", vehicleNumber: "MH01 AB 1234", vehicleModel: "Hero Splendor", rideType: "Bike", lat: 18.945, lng: 72.822 },
    { name: "Suresh Patil", phone: "+919800000002", vehicleNumber: "MH02 CD 5678", vehicleModel: "Bajaj RE Auto", rideType: "Auto", lat: 18.94, lng: 72.828 },
    { name: "Amit Verma", phone: "+919800000003", vehicleNumber: "MH03 EF 9012", vehicleModel: "Maruti Swift", rideType: "Mini", lat: 18.95, lng: 72.83 },
    { name: "Vikas Shinde", phone: "+919800000004", vehicleNumber: "MH04 GH 3456", vehicleModel: "Honda City", rideType: "Sedan", lat: 18.948, lng: 72.818 },
    { name: "Rahul Deshmukh", phone: "+919800000005", vehicleNumber: "MH05 IJ 7890", vehicleModel: "Toyota Innova", rideType: "SUV", lat: 18.942, lng: 72.835 },
  ];

  for (const d of driversSeed) {
    const rideTypeId = rideTypeIdByName.get(d.rideType)!;
    await prisma.driver.upsert({
      where: { phone: d.phone },
      update: {},
      create: {
        name: d.name,
        phone: d.phone,
        vehicleNumber: d.vehicleNumber,
        vehicleModel: d.vehicleModel,
        rideTypeId,
        cityId: city.id,
        status: "APPROVED",
        isOnline: true,
        isAvailable: true,
        currentLat: d.lat,
        currentLng: d.lng,
        ratingAvg: 4.7,
        ratingCount: 120,
      },
    });
  }

  // --- Food/Grocery delivery partners (separate from Cab drivers — not tied to a RideType) ---
  const deliveryPartnersSeed = [
    { name: "Rakesh Jadhav", phone: "+919811000001", vehicleType: "Bike", vehicleNumber: "MH06 KL 1122", lat: 18.946, lng: 72.824 },
    { name: "Sandeep Rane", phone: "+919811000002", vehicleType: "Bike", vehicleNumber: "MH06 MN 3344", lat: 18.943, lng: 72.826 },
    { name: "Prakash Gaikwad", phone: "+919811000003", vehicleType: "Bicycle", vehicleNumber: "MH06 OP 5566", lat: 18.949, lng: 72.82 },
  ];

  for (const dp of deliveryPartnersSeed) {
    await prisma.deliveryPartner.upsert({
      where: { phone: dp.phone },
      update: {},
      create: {
        name: dp.name,
        phone: dp.phone,
        vehicleType: dp.vehicleType,
        vehicleNumber: dp.vehicleNumber,
        cityId: city.id,
        status: "APPROVED",
        isOnline: true,
        isAvailable: true,
        currentLat: dp.lat,
        currentLng: dp.lng,
        ratingAvg: 4.6,
        ratingCount: 85,
      },
    });
  }
  const rakesh = await prisma.deliveryPartner.findFirst({ where: { phone: "+919811000001" } });
  const sandeep = await prisma.deliveryPartner.findFirst({ where: { phone: "+919811000002" } });
  const prakash = await prisma.deliveryPartner.findFirst({ where: { phone: "+919811000003" } });

  // --- Demo delivery partner account — logs in at /delivery-partner/login
  // with email + password, and manages Rakesh's own deliveries only. ---
  if (rakesh) {
    const deliveryPasswordHash = await bcrypt.hash("Delivery@123", 10);
    const deliveryOwner = await prisma.user.upsert({
      where: { email: "delivery@glido.app" },
      update: { passwordHash: deliveryPasswordHash, role: "DELIVERY_PARTNER" },
      create: {
        email: "delivery@glido.app",
        name: "Rakesh Jadhav",
        role: "DELIVERY_PARTNER",
        passwordHash: deliveryPasswordHash,
      },
    });
    await prisma.deliveryPartner.update({ where: { id: rakesh.id }, data: { userId: deliveryOwner.id } });
  }

  // --- Demo order/ride history for the demo customer, across every status,
  // so Admin lists and "my orders" screens show real activity immediately
  // instead of empty tables on a fresh seed. ---
  const demoAddress = await prisma.address.findFirst({ where: { userId: customer.id } });
  const spiceRoute = await prisma.menuItem.findMany({ where: { restaurantId: "seed-spice-route-kitchen" } });
  const pizzaBros = await prisma.menuItem.findMany({ where: { restaurantId: "seed-pizza-bros" } });
  const sushiBowl = await prisma.menuItem.findMany({ where: { restaurantId: "seed-sushi-bowl-co-" } });
  const findItem = (items: typeof spiceRoute, name: string) => items.find((i) => i.name === name)!;

  const groceryProducts = await prisma.groceryProduct.findMany();
  const findProduct = (name: string) => groceryProducts.find((p) => p.name === name)!;

  const miniDriver = await prisma.driver.findFirst({ where: { phone: "+919800000003" } });
  const rideTypeMini = rideTypeIdByName.get("Mini")!;
  const rideTypeAuto = rideTypeIdByName.get("Auto")!;

  async function ensureFoodOrder(params: {
    orderNumber: string;
    restaurantId: string;
    items: { item: (typeof spiceRoute)[number]; qty: number }[];
    deliveryFee: number;
    packagingFee: number;
    status: "PENDING" | "ACCEPTED" | "PREPARING" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";
    daysAgo: number;
    paymentStatus?: "PENDING" | "PAID";
    review?: { rating: number; comment: string };
    deliveryPartnerId?: string;
  }) {
    const existing = await prisma.order.findUnique({ where: { orderNumber: params.orderNumber } });
    if (existing || !demoAddress) return;

    const subtotal = params.items.reduce((sum, { item, qty }) => sum + item.price * qty, 0);
    const taxAmount = Math.round(subtotal * 0.05 * 100) / 100;
    const totalAmount = subtotal + params.deliveryFee + params.packagingFee + taxAmount;
    const createdAt = new Date(Date.now() - params.daysAgo * 24 * 60 * 60 * 1000);

    const order = await prisma.order.create({
      data: {
        orderNumber: params.orderNumber,
        userId: customer.id,
        restaurantId: params.restaurantId,
        addressId: demoAddress.id,
        status: params.status,
        subtotal,
        deliveryFee: params.deliveryFee,
        packagingFee: params.packagingFee,
        taxAmount,
        totalAmount,
        paymentMethod: "ONLINE",
        paymentStatus: params.paymentStatus ?? (params.status === "CANCELLED" ? "REFUNDED" : "PENDING"),
        cancelReason: params.status === "CANCELLED" ? "Changed my mind" : undefined,
        deliveryPartnerId: params.deliveryPartnerId,
        createdAt,
        updatedAt: createdAt,
        items: {
          create: params.items.map(({ item, qty }) => ({
            menuItemId: item.id,
            nameSnapshot: item.name,
            priceSnapshot: item.price,
            quantity: qty,
            subtotal: item.price * qty,
          })),
        },
        statusHistory: { create: { status: params.status, note: "Seed demo order.", changedAt: createdAt } },
      },
    });

    if (params.deliveryPartnerId && params.status === "OUT_FOR_DELIVERY") {
      await prisma.deliveryPartner.update({ where: { id: params.deliveryPartnerId }, data: { isAvailable: false } });
    }

    if (params.review) {
      await prisma.review.create({
        data: {
          userId: customer.id,
          restaurantId: params.restaurantId,
          orderId: order.id,
          rating: params.review.rating,
          comment: params.review.comment,
          createdAt,
        },
      });
      const agg = await prisma.review.aggregate({ where: { restaurantId: params.restaurantId }, _avg: { rating: true }, _count: true });
      await prisma.restaurant.update({
        where: { id: params.restaurantId },
        data: { ratingAvg: agg._avg.rating ?? params.review.rating, ratingCount: agg._count },
      });
    }
  }

  await ensureFoodOrder({
    orderNumber: "SEED-FOOD-1",
    restaurantId: "seed-spice-route-kitchen",
    items: [{ item: findItem(spiceRoute, "Butter Chicken"), qty: 1 }, { item: findItem(spiceRoute, "Butter Naan"), qty: 2 }],
    deliveryFee: 25,
    packagingFee: 10,
    status: "DELIVERED",
    paymentStatus: "PAID",
    daysAgo: 3,
    review: { rating: 5, comment: "Amazing food, quick delivery!" },
    deliveryPartnerId: rakesh?.id,
  });
  await ensureFoodOrder({
    orderNumber: "SEED-FOOD-2",
    restaurantId: "seed-pizza-bros",
    items: [{ item: findItem(pizzaBros, "Margherita"), qty: 1 }, { item: findItem(pizzaBros, "Coke (500ml)"), qty: 1 }],
    deliveryFee: 20,
    packagingFee: 10,
    status: "OUT_FOR_DELIVERY",
    paymentStatus: "PAID",
    daysAgo: 0,
    deliveryPartnerId: sandeep?.id,
  });
  await ensureFoodOrder({
    orderNumber: "SEED-FOOD-3",
    restaurantId: "seed-sushi-bowl-co-",
    items: [{ item: findItem(sushiBowl, "California Roll"), qty: 1 }],
    deliveryFee: 35,
    packagingFee: 15,
    status: "PENDING",
    daysAgo: 0,
  });
  await ensureFoodOrder({
    orderNumber: "SEED-FOOD-4",
    restaurantId: "seed-spice-route-kitchen",
    items: [{ item: findItem(spiceRoute, "Paneer Tikka"), qty: 1 }],
    deliveryFee: 25,
    packagingFee: 10,
    status: "CANCELLED",
    daysAgo: 5,
  });

  async function ensureGroceryOrder(params: {
    orderNumber: string;
    items: { name: string; qty: number }[];
    status: "PENDING" | "ACCEPTED" | "PREPARING" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";
    daysAgo: number;
    deliveryPartnerId?: string;
  }) {
    const existing = await prisma.groceryOrder.findUnique({ where: { orderNumber: params.orderNumber } });
    if (existing || !demoAddress) return;

    const items = params.items.map(({ name, qty }) => ({ product: findProduct(name), qty }));
    const subtotal = items.reduce((sum, { product, qty }) => sum + product.price * qty, 0);
    const deliveryFee = subtotal >= 299 ? 0 : 25;
    const taxAmount = Math.round(subtotal * 0.05 * 100) / 100;
    const totalAmount = subtotal + deliveryFee + taxAmount;
    const createdAt = new Date(Date.now() - params.daysAgo * 24 * 60 * 60 * 1000);

    await prisma.groceryOrder.create({
      data: {
        orderNumber: params.orderNumber,
        userId: customer.id,
        addressId: demoAddress.id,
        status: params.status,
        subtotal,
        deliveryFee,
        taxAmount,
        totalAmount,
        paymentMethod: "COD",
        paymentStatus: params.status === "DELIVERED" ? "PAID" : "PENDING",
        deliveryPartnerId: params.deliveryPartnerId,
        createdAt,
        updatedAt: createdAt,
        items: {
          create: items.map(({ product, qty }) => ({
            productId: product.id,
            nameSnapshot: product.name,
            priceSnapshot: product.price,
            quantity: qty,
            subtotal: product.price * qty,
          })),
        },
        statusHistory: { create: { status: params.status, note: "Seed demo order.", changedAt: createdAt } },
      },
    });

    if (params.deliveryPartnerId && params.status === "OUT_FOR_DELIVERY") {
      await prisma.deliveryPartner.update({ where: { id: params.deliveryPartnerId }, data: { isAvailable: false } });
    }
  }

  await ensureGroceryOrder({
    orderNumber: "SEED-GROC-1",
    items: [{ name: "Banana", qty: 2 }, { name: "Toned Milk", qty: 1 }],
    status: "DELIVERED",
    daysAgo: 2,
    deliveryPartnerId: prakash?.id,
  });
  await ensureGroceryOrder({
    orderNumber: "SEED-GROC-2",
    items: [{ name: "Potato Chips", qty: 1 }, { name: "Chocolate Bar", qty: 1 }, { name: "Biscuits", qty: 1 }],
    status: "OUT_FOR_DELIVERY",
    daysAgo: 0,
    deliveryPartnerId: prakash?.id,
  });
  await ensureGroceryOrder({
    orderNumber: "SEED-GROC-3",
    items: [{ name: "Farm Eggs", qty: 1 }, { name: "Bread", qty: 1 }],
    status: "PENDING",
    daysAgo: 0,
  });

  async function ensureRide(params: {
    rideNumber: string;
    rideTypeId: string;
    driverId?: string;
    pickupAddress: string;
    pickupLat: number;
    pickupLng: number;
    dropAddress: string;
    dropLat: number;
    dropLng: number;
    distanceKm: number;
    estimatedFare: number;
    status: "REQUESTED" | "DRIVER_ASSIGNED" | "DRIVER_ARRIVED" | "ONGOING" | "COMPLETED" | "CANCELLED";
    daysAgo: number;
  }) {
    const existing = await prisma.ride.findUnique({ where: { rideNumber: params.rideNumber } });
    if (existing) return;
    const createdAt = new Date(Date.now() - params.daysAgo * 24 * 60 * 60 * 1000);

    await prisma.ride.create({
      data: {
        rideNumber: params.rideNumber,
        userId: customer.id,
        rideTypeId: params.rideTypeId,
        driverId: params.driverId,
        status: params.status,
        pickupAddress: params.pickupAddress,
        pickupLat: params.pickupLat,
        pickupLng: params.pickupLng,
        dropAddress: params.dropAddress,
        dropLat: params.dropLat,
        dropLng: params.dropLng,
        distanceKm: params.distanceKm,
        estimatedFare: params.estimatedFare,
        finalFare: params.status === "COMPLETED" ? params.estimatedFare : undefined,
        paymentMethod: "COD",
        paymentStatus: params.status === "COMPLETED" ? "PAID" : "PENDING",
        cancelReason: params.status === "CANCELLED" ? "Driver took too long to arrive" : undefined,
        createdAt,
        updatedAt: createdAt,
        requestedAt: createdAt,
        completedAt: params.status === "COMPLETED" ? createdAt : undefined,
        statusHistory: { create: { status: params.status, note: "Seed demo ride.", changedAt: createdAt } },
      },
    });

    // Keep the driver directory consistent: an active (non-terminal) ride means the driver is busy.
    const activeStatuses = ["DRIVER_ASSIGNED", "DRIVER_ARRIVED", "ONGOING"];
    if (params.driverId && activeStatuses.includes(params.status)) {
      await prisma.driver.update({ where: { id: params.driverId }, data: { isAvailable: false } });
    }
  }

  await ensureRide({
    rideNumber: "SEED-RIDE-1",
    rideTypeId: rideTypeMini,
    driverId: miniDriver?.id,
    pickupAddress: "Marine Drive, Mumbai",
    pickupLat: 18.945,
    pickupLng: 72.822,
    dropAddress: "Malabar Hill, Mumbai",
    dropLat: 18.955,
    dropLng: 72.805,
    distanceKm: 2.6,
    estimatedFare: 87.5,
    status: "COMPLETED",
    daysAgo: 1,
  });
  await ensureRide({
    rideNumber: "SEED-RIDE-2",
    rideTypeId: rideTypeAuto,
    pickupAddress: "Marine Drive, Mumbai",
    pickupLat: 18.945,
    pickupLng: 72.822,
    dropAddress: "Bandra West, Mumbai",
    dropLat: 19.059,
    dropLng: 72.831,
    distanceKm: 12.4,
    estimatedFare: 210,
    status: "CANCELLED",
    daysAgo: 4,
  });
  await ensureRide({
    rideNumber: "SEED-RIDE-3",
    rideTypeId: rideTypeMini,
    driverId: miniDriver?.id,
    pickupAddress: "Marine Drive, Mumbai",
    pickupLat: 18.945,
    pickupLng: 72.822,
    dropAddress: "Colaba, Mumbai",
    dropLat: 18.915,
    dropLng: 72.826,
    distanceKm: 3.8,
    estimatedFare: 95,
    status: "DRIVER_ASSIGNED",
    daysAgo: 0,
  });

  // --- Homepage banners ---
  const bannerCount = await prisma.banner.count();
  if (bannerCount === 0) {
    await prisma.banner.createMany({
      data: [
        {
          title: "50% off your first order",
          imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200",
          link: "/food",
          sortOrder: 0,
        },
        {
          title: "Glido Grocery — delivered in minutes",
          imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200",
          link: "/grocery",
          sortOrder: 1,
        },
      ],
    });
  }

  console.log("Seed complete.");
  console.log(`Admin login at /admin/login: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log("Demo customer login at /login: customer@glido.app / Customer@123");
  console.log("Demo restaurant partner login at /partner/login: partner@glido.app / Partner@123 (Pizza Bros)");
  console.log("Demo delivery partner login: delivery@glido.app / Delivery@123 (Rakesh Jadhav)");
  console.log("Coupons: GLIDO50 (50% off up to ₹100), FLAT50 (₹50 off)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
