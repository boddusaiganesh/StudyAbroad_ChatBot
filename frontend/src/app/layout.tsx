import type {Metadata} from "next";
import {Inter} from "next/font/google";
import "./globals.css";
import {AuthProvider} from "@/contexts/AuthContext";

const inter = Inter({subsets: ["latin"]});

export const metadata: Metadata = {
    title: "Study Abroad Assistant",
    description: "AI-powered study abroad information assistant for USA, UK, Canada, and Australia",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
        <body className={inter.className}>
        <AuthProvider>
            {children}
        </AuthProvider>
        </body>
        </html>
    );
}
