import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-24">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8">
          <LoginForm error={params.error} />
        </CardContent>
      </Card>
    </main>
  );
}
