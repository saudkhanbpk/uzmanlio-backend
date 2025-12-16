/**
 * Migration Script: Services and Packages
 * 
 * This script migrates embedded services and packages from the User document
 * to their own collections (Service, Package) with ObjectId references.
 * 
 * Run this ONCE before deploying the updated backend code.
 * 
 * Usage: node scripts/migrateServicesPackages.js
 */

import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/expertInformation.js";
import Service from "../models/service.js";
import Package from "../models/package.js";

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || "uzmanlio";

async function connectDB() {
    try {
        await mongoose.connect(MONGO_URL, { dbName: DB_NAME });
        console.log("✅ Connected to MongoDB");
    } catch (error) {
        console.error("❌ MongoDB connection error:", error);
        process.exit(1);
    }
}

async function migrateServices() {
    console.log("\n📦 Migrating Services...");

    // Find all users with embedded services (old schema)
    // We need to use the raw collection because Mongoose now expects ObjectIds
    const usersCollection = mongoose.connection.collection("users");
    const users = await usersCollection.find({
        services: { $exists: true, $ne: [], $elemMatch: { id: { $exists: true } } }
    }).toArray();

    console.log(`Found ${users.length} users with embedded services`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const user of users) {
        const embeddedServices = user.services || [];

        // Skip if no embedded services or already ObjectIds
        if (embeddedServices.length === 0) continue;
        if (mongoose.Types.ObjectId.isValid(embeddedServices[0]) && !embeddedServices[0].id) {
            console.log(`User ${user._id}: Already migrated (ObjectIds found)`);
            continue;
        }

        console.log(`\nUser ${user._id}: Migrating ${embeddedServices.length} services`);

        const newServiceIds = [];

        for (const embeddedService of embeddedServices) {
            try {
                // Create new Service document
                const newService = new Service({
                    legacyId: embeddedService.id,
                    expertId: user._id,
                    title: embeddedService.title,
                    description: embeddedService.description || '',
                    icon: embeddedService.icon || '',
                    iconBg: embeddedService.iconBg || '',
                    price: embeddedService.price || '0',
                    discount: embeddedService.discount || 0,
                    duration: embeddedService.duration || '0',
                    category: embeddedService.category || '',
                    features: embeddedService.features || [],
                    date: embeddedService.date,
                    time: embeddedService.time,
                    location: embeddedService.location || '',
                    platform: embeddedService.platform || '',
                    eventType: embeddedService.eventType || 'online',
                    meetingType: embeddedService.meetingType || '',
                    maxAttendees: embeddedService.maxAttendees,
                    isOfflineEvent: embeddedService.isOfflineEvent || false,
                    selectedClients: embeddedService.selectedClients || [],
                    isActive: embeddedService.isActive || false,
                    status: embeddedService.status || 'inactive',
                    createdAt: embeddedService.createdAt || new Date(),
                    updatedAt: embeddedService.updatedAt || new Date()
                });

                await newService.save();
                newServiceIds.push(newService._id);
                migratedCount++;
                console.log(`  ✅ Service "${embeddedService.title}" -> ${newService._id}`);
            } catch (err) {
                errorCount++;
                console.error(`  ❌ Error migrating service "${embeddedService.title}":`, err.message);
            }
        }

        // Update user with new ObjectId references
        await usersCollection.updateOne(
            { _id: user._id },
            { $set: { services: newServiceIds } }
        );
        console.log(`  📝 Updated user with ${newServiceIds.length} service references`);
    }

    console.log(`\n✅ Services Migration Complete: ${migratedCount} migrated, ${errorCount} errors`);
}

async function migratePackages() {
    console.log("\n📦 Migrating Packages...");

    const usersCollection = mongoose.connection.collection("users");
    const users = await usersCollection.find({
        packages: { $exists: true, $ne: [], $elemMatch: { id: { $exists: true } } }
    }).toArray();

    console.log(`Found ${users.length} users with embedded packages`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const user of users) {
        const embeddedPackages = user.packages || [];

        if (embeddedPackages.length === 0) continue;
        if (mongoose.Types.ObjectId.isValid(embeddedPackages[0]) && !embeddedPackages[0].id) {
            console.log(`User ${user._id}: Already migrated (ObjectIds found)`);
            continue;
        }

        console.log(`\nUser ${user._id}: Migrating ${embeddedPackages.length} packages`);

        const newPackageIds = [];

        for (const embeddedPackage of embeddedPackages) {
            try {
                const newPackage = new Package({
                    legacyId: embeddedPackage.id,
                    expertId: user._id,
                    title: embeddedPackage.title,
                    description: embeddedPackage.description || '',
                    price: embeddedPackage.price || 0,
                    discount: embeddedPackage.discount || 0,
                    originalPrice: embeddedPackage.originalPrice,
                    duration: embeddedPackage.duration || 0,
                    appointmentCount: embeddedPackage.appointmentCount || 1,
                    sessionsIncluded: embeddedPackage.sessionsIncluded,
                    category: embeddedPackage.category || '',
                    eventType: embeddedPackage.eventType || 'online',
                    meetingType: embeddedPackage.meetingType || '',
                    platform: embeddedPackage.platform || '',
                    location: embeddedPackage.location || '',
                    date: embeddedPackage.date,
                    time: embeddedPackage.time,
                    maxAttendees: embeddedPackage.maxAttendees,
                    icon: embeddedPackage.icon || '📦',
                    iconBg: embeddedPackage.iconBg || 'bg-primary-100',
                    features: embeddedPackage.features || [],
                    status: embeddedPackage.status || 'active',
                    isAvailable: embeddedPackage.isAvailable !== false,
                    isPurchased: embeddedPackage.isPurchased || false,
                    isOfflineEvent: embeddedPackage.isOfflineEvent || false,
                    validUntil: embeddedPackage.validUntil,
                    selectedClients: embeddedPackage.selectedClients || [],
                    purchasedBy: embeddedPackage.purchasedBy || [],
                    createdAt: embeddedPackage.createdAt || new Date(),
                    updatedAt: embeddedPackage.updatedAt || new Date()
                });

                await newPackage.save();
                newPackageIds.push(newPackage._id);
                migratedCount++;
                console.log(`  ✅ Package "${embeddedPackage.title}" -> ${newPackage._id}`);
            } catch (err) {
                errorCount++;
                console.error(`  ❌ Error migrating package "${embeddedPackage.title}":`, err.message);
            }
        }

        await usersCollection.updateOne(
            { _id: user._id },
            { $set: { packages: newPackageIds } }
        );
        console.log(`  📝 Updated user with ${newPackageIds.length} package references`);
    }

    console.log(`\n✅ Packages Migration Complete: ${migratedCount} migrated, ${errorCount} errors`);
}

async function main() {
    console.log("🚀 Starting Services & Packages Migration");
    console.log("=========================================");

    await connectDB();

    await migrateServices();
    await migratePackages();

    console.log("\n=========================================");
    console.log("🎉 Migration Complete!");
    console.log("You can now deploy the updated backend code.");

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
}

main().catch(console.error);
