import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-24">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8">
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
