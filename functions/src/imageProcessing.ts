import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import * as sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

admin.initializeApp();

const storage = admin.storage();
const firestore = admin.firestore();

interface ImageVariants {
    thumbnail: string;
    medium: string;
    large: string;
}

/**
 * Cloud Function triggered when an image is uploaded to Firebase Storage
 * Generates optimized WebP variants (thumbnail, medium, large)
 */
export const onImageUpload = functions.storage
    .object()
    .onFinalize(async (object) => {
        const filePath = object.name;
        const contentType = object.contentType;

        // Only process images uploaded to /uploads/{userId}/raw/
        if (!filePath || !filePath.includes("/raw/")) {
            console.log("Skipping: Not a raw upload");
            return null;
        }

        // Only process images
        if (!contentType || !contentType.startsWith("image/")) {
            console.log("Skipping: Not an image");
            return null;
        }

        // Extract userId from path
        const pathParts = filePath.split("/");
        if (pathParts.length < 3) {
            console.error("Invalid path structure");
            return null;
        }

        const userId = pathParts[1];
        const fileName = path.basename(filePath);
        const imageId = uuidv4();

        console.log(`Processing image: ${fileName} for user: ${userId}`);

        try {
            // Download original image to temp directory
            const tempFilePath = path.join(os.tmpdir(), fileName);
            const bucket = storage.bucket(object.bucket);
            await bucket.file(filePath).download({ destination: tempFilePath });

            console.log("Downloaded to:", tempFilePath);

            // Generate variants
            const variants = await generateImageVariants(
                tempFilePath,
                userId,
                imageId,
                bucket
            );

            // Save metadata to Firestore
            await firestore.collection("images").doc(imageId).set({
                id: imageId,
                userId,
                originalName: fileName,
                variants,
                status: "complete",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                processedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            console.log("Image processed successfully:", imageId);

            // Delete original raw file
            await bucket.file(filePath).delete();
            console.log("Deleted raw file:", filePath);

            // Clean up temp file
            fs.unlinkSync(tempFilePath);

            return { success: true, imageId, variants };
        } catch (error) {
            console.error("Error processing image:", error);

            // Save error to Firestore
            await firestore.collection("images").doc(imageId).set({
                id: imageId,
                userId,
                originalName: fileName,
                status: "error",
                error: error instanceof Error ? error.message : "Unknown error",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            return { success: false, error };
        }
    });

/**
 * Generate optimized image variants using Sharp
 */
async function generateImageVariants(
    tempFilePath: string,
    userId: string,
    imageId: string,
    bucket: any
): Promise<ImageVariants> {
    const baseDir = `uploads/${userId}/images/${imageId}`;

    // Thumbnail: 200x200 square crop
    const thumbnailBuffer: Buffer = await sharp(tempFilePath)
        .resize(200, 200, {
            fit: "cover",
            position: "center",
        })
        .webp({ quality: 80 })
        .toBuffer();

    const thumbnailPath = `${baseDir}/thumbnail.webp`;
    await uploadVariant(bucket, thumbnailPath, thumbnailBuffer);

    // Medium: Max 800x800, preserve aspect ratio
    const mediumBuffer: Buffer = await sharp(tempFilePath)
        .resize(800, 800, {
            fit: "inside",
            withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer();

    const mediumPath = `${baseDir}/medium.webp`;
    await uploadVariant(bucket, mediumPath, mediumBuffer);

    // Large: Max 1200x1200, preserve aspect ratio
    const largeBuffer: Buffer = await sharp(tempFilePath)
        .resize(1200, 1200, {
            fit: "inside",
            withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer();

    const largePath = `${baseDir}/large.webp`;
    await uploadVariant(bucket, largePath, largeBuffer);

    // Get public URLs
    const thumbnailUrl = await getPublicUrl(bucket, thumbnailPath);
    const mediumUrl = await getPublicUrl(bucket, mediumPath);
    const largeUrl = await getPublicUrl(bucket, largePath);

    return {
        thumbnail: thumbnailUrl,
        medium: mediumUrl,
        large: largeUrl,
    };
}

/**
 * Upload image variant to Firebase Storage
 */
async function uploadVariant(
    bucket: any,
    filePath: string,
    buffer: Buffer
): Promise<void> {
    const file = bucket.file(filePath);

    await file.save(buffer, {
        metadata: {
            contentType: "image/webp",
            cacheControl: "public, max-age=31536000", // 1 year
        },
    });

    // Make file publicly accessible
    await file.makePublic();

    console.log(`Uploaded variant: ${filePath}`);
}

/**
 * Get public URL for uploaded file
 */
async function getPublicUrl(bucket: any, filePath: string): Promise<string> {
    const file = bucket.file(filePath);
    const [metadata] = await file.getMetadata();
    return `https://storage.googleapis.com/${bucket.name}/${filePath}`;
}
