"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { toast, Toaster } from "sonner";
import { authAPI } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect away from login if already authenticated
  useEffect(() => {
    try {
      const storedUser = typeof window !== "undefined" ? localStorage.getItem("user") : null;
      const storedToken = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      // Only redirect if we have both user and token, and they're valid
      if (storedUser && storedToken) {
        try {
          // Verify token is valid JSON (basic check)
          const userData = JSON.parse(storedUser);
          if (userData && userData.username && userData.token) {
            router.replace("/");
          }
        } catch {
          // Invalid stored data, clear it
          localStorage.removeItem("user");
          localStorage.removeItem("token");
        }
      }
    } catch (_err) {
      // Ignore access errors to storage and allow login page to render
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Call the real backend API using our utility
      const data = await authAPI.login(username, password);

      if (data.token) {
        // Store user data and token in localStorage
        const userData = {
          username: data.user.username,
          role: data.user.role,
          id: data.user.id,
          token: data.token,
          loginTime: new Date().toISOString(),
        };
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("token", data.token);

        toast.success(`Welcome, ${data.user.username}! Role: ${data.user.role}`);
        
        // Small delay before redirect for better UX
        setTimeout(() => {
          router.push("/");
        }, 500);
      } else {
        toast.error("Invalid credentials");
        setLoading(false);
      }
    } catch (error: any) {
      console.error("Login error:", error);
      
      // Extract error message from API response
      let errorMessage = "Failed to connect to server. Please ensure the backend is running.";
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.error) {
        errorMessage = error.error;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Provide helpful hints based on error message
      if (errorMessage.includes('Database connection failed')) {
        errorMessage += " Check that PostgreSQL is running and your .env.local file is configured correctly.";
      } else if (errorMessage.includes('Database authentication failed')) {
        errorMessage += " Verify your DB_PASSWORD in .env.local matches your PostgreSQL password.";
      } else if (errorMessage.includes('Database not found')) {
        errorMessage += " Ensure the database name in .env.local matches your PostgreSQL database.";
      } else if (errorMessage.includes('Server configuration error')) {
        errorMessage += " Check that JWT_SECRET is set in your .env.local file.";
      }
      
      toast.error(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Toaster position="top-right" />
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Lock className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Smart Fitting Room System</CardTitle>
          <CardDescription>
            Enter your credentials to access the dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>

        </CardContent>
      </Card>
    </div>
  );
}
