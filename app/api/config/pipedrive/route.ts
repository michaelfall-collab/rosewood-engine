import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const CONFIG_PATH = path.join(process.cwd(), "config/pipedriveCapabilities.json");

export async function GET() {
  try {
    const data = await fs.readFile(CONFIG_PATH, "utf-8");
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to read configuration." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const newConfig = await request.json();
    
    // Basic validation: ensure it's not empty and stringifies back to valid JSON
    if (!newConfig || typeof newConfig !== 'object') {
        return NextResponse.json({ success: false, error: "Invalid configuration data." }, { status: 400 });
    }

    await fs.writeFile(CONFIG_PATH, JSON.stringify(newConfig, null, 2), "utf-8");
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to update configuration." }, { status: 500 });
  }
}
