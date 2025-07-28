import { NextResponse } from "next/server";


export async function GET(request: Request) {
  const collections = await getCollections();
  return NextResponse.json(collections);
}

export async function POST(request: Request) {
  try {
    const { name, description } = await request.json();
    if (!name) {
      return NextResponse.json({ error: "Collection name is required" }, { status: 400 });
    }

    const newCollection = await createCollection({ name, description });
    return NextResponse.json(newCollection, { status: 201 });
  } catch (error) {
    console.error("Error creating collection:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}