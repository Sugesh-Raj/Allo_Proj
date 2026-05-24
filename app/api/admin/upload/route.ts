import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file was uploaded." },
        { status: 400 }
      );
    }

    // 1. Read file bytes
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 2. Define upload directory inside Next.js public/ folder
    const uploadDir = join(process.cwd(), "public", "uploads");

    // 3. Ensure the upload directory exists
    await mkdir(uploadDir, { recursive: true });

    // 4. Create a unique, clean filename
    const cleanFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const filePath = join(uploadDir, cleanFileName);

    // 5. Write file to disk
    await writeFile(filePath, buffer);

    // 6. Return relative URL path
    const fileUrl = `/uploads/${cleanFileName}`;
    return NextResponse.json({ success: true, url: fileUrl });
  } catch (error) {
    console.error("File Upload API Error:", error);
    return NextResponse.json(
      { error: "Failed to upload file. Ensure write permissions are available." },
      { status: 500 }
    );
  }
}
