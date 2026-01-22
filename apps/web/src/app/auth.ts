import { auth } from "@clerk/nextjs/server";

export async function getAuthToken() {
    const authSession = await auth();
    return (await authSession.getToken({ template: "convex" })) ?? undefined;
} 